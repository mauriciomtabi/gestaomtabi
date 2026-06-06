

import { createClient } from '@supabase/supabase-js';
import { Provider, AttendanceRecord, AuditLog, FuelSupply, Vehicle, StationNickname, MonthlyEvaluation, ServiceSwap } from '../types';
import type { GeoPerimeter } from './geoService';

const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjE2OTUsImV4cCI6MjA4NTQzNzY5NX0.dTdM1Jyhu0G0skkuBH2flsgnKXbmFtLYTh3wj0TDRiQ';

if (!SUPABASE_KEY.startsWith('eyJ') && !SUPABASE_KEY.startsWith('sb_')) {
  console.warn("AVISO: A SUPABASE_KEY não parece ser uma chave 'anon' válida. Verifique as configurações no Supabase Dashboard.");
}

const customStorage = {
  getItem: (key: string) => {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  },
  setItem: (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch (e) {}
  },
  removeItem: (key: string) => {
    try { localStorage.removeItem(key); } catch (e) {}
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: customStorage,
    storageKey: 'supabase.auth.token.gestao-cbm-v2' // Nova chave para ignorar locks antigos
  }
});

// --- Funções de Storage (Cloudinary) ---
export const uploadDocument = async (base64: string, path: string) => {
  if (!base64 || !base64.startsWith('data:')) return base64;
  
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dizhbrjdv';
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'cbm_gestao';
  
  try {
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
    
    const formData = new URLSearchParams();
    formData.append('file', base64);
    formData.append('upload_preset', uploadPreset);
    
    if (path) {
      const safeFilename = path.replace(/[^a-zA-Z0-9_\-]/g, '_');
      formData.append('public_id', safeFilename);
      formData.append('filename_override', safeFilename);
    }
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.warn("Falha no upload para o Cloudinary:", errorData);
      return null;
    }
    
    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Erro ao fazer upload para o Cloudinary:", error);
    return null;
  }
};


// --- Mapeadores de Dados (JS <-> DB) ---
const mapAuditLogFromDB = (l: any): AuditLog => ({
  id: l.id,
  timestamp: l.timestamp,
  userName: l.user_name,
  action: l.action,
  details: l.details
});

const mapProviderFromDB = (p: any): Provider => ({
  id: p.id,
  name: p.name,
  processNumber: p.process_number,
  phone: p.phone,
  address: p.address,
  assignedEntity: p.assigned_entity,
  totalHoursToFulfill: p.total_hours_to_fulfill,
  status: p.status || 'active',
  returnReason: p.return_reason,
  returnAttachment: p.return_attachment,
  identityDoc: p.identity_doc,
  referralDoc: p.referral_doc,
  observations: p.observations,
  referralDate: p.referral_date,
  receiptDate: p.receipt_date,
  profilePhoto: p.profile_photo,
  history: (p.audit_logs || [])
    .map(mapAuditLogFromDB)
    .sort((a: AuditLog, b: AuditLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
});

const mapProviderToDB = (p: Partial<Provider>) => {
  const dbData: any = {};
  if (p.name !== undefined) dbData.name = p.name;
  if (p.processNumber !== undefined) dbData.process_number = p.processNumber;
  if (p.phone !== undefined) dbData.phone = p.phone;
  if (p.address !== undefined) dbData.address = p.address;
  if (p.assignedEntity !== undefined) dbData.assigned_entity = p.assignedEntity;
  
  if (p.totalHoursToFulfill !== undefined) dbData.total_hours_to_fulfill = Number(p.totalHoursToFulfill);
  if (p.status !== undefined) dbData.status = p.status;
  
  if (p.returnReason !== undefined) dbData.return_reason = p.returnReason;
  if (p.returnAttachment !== undefined) dbData.return_attachment = p.returnAttachment;
  if (p.identityDoc !== undefined) dbData.identity_doc = p.identityDoc;
  if (p.referralDoc !== undefined) dbData.referral_doc = p.referralDoc;
  if (p.observations !== undefined) dbData.observations = p.observations;
  if (p.referralDate !== undefined) dbData.referral_date = p.referralDate;
  if (p.receiptDate !== undefined) dbData.receipt_date = p.receiptDate;
  if (p.profilePhoto !== undefined) dbData.profile_photo = p.profilePhoto;
  
  return dbData;
};

const mapAttendanceFromDB = (a: any): AttendanceRecord => ({
  id: a.id,
  providerId: a.provider_id,
  date: a.date,
  entryTime: a.entry_time || '',
  exitTime: a.exit_time || '',
  durationMinutes: a.duration_minutes,
  attachmentData: a.attachment_data,
  attachmentType: a.attachment_type,
  type: a.type || 'presence',
  reason: a.reason
});

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const isUUID = (id: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

const mapAttendanceToDB = (a: AttendanceRecord) => {
  const dbData: any = {
    provider_id: a.providerId,
    date: a.date,
    entry_time: a.entryTime ?? null,
    exit_time: a.exitTime ?? null,
    duration_minutes: Number(a.durationMinutes) || 0,
    attachment_data: a.attachmentData,
    attachment_type: a.attachmentType,
    type: a.type || 'presence',
    reason: a.reason
  };

  // Se o ID for um UUID válido, nós o mantemos para o upsert (atualização).
  // Se for um ID temporário ou não for um UUID, geramos um novo UUID
  // para evitar o erro de "null value in column id" caso o banco não tenha default.
  if (a.id && isUUID(a.id)) {
    dbData.id = a.id;
  } else {
    // Geramos um ID aqui para garantir que nunca seja nulo
    dbData.id = generateUUID();
  }
  
  return dbData;
};

const mapFuelSupplyFromDB = (f: any): FuelSupply => {
  let entryType: 'abastecimento' | 'manutencao' = 'abastecimento';
  let items: any[] = [];
  let protocol = f.protocol || '';

  if (protocol.startsWith('__maintenance__:')) {
    entryType = 'manutencao';
    const itemsPart = protocol.split('__items__:');
    if (itemsPart.length > 1) {
      try {
        items = JSON.parse(itemsPart[1]);
      } catch (e) {
        console.error("Erro ao fazer parse dos itens de manutencao:", e);
      }
    }
    protocol = itemsPart[0].replace('__maintenance__:', '');
  }

  return {
    id: f.id,
    date: f.date,
    location: f.location,
    cnpj: f.cnpj,
    fuelType: f.fuel_type,
    liters: f.liters,
    pricePerLiter: f.price_per_liter,
    totalValue: f.total_value,
    driver: f.driver,
    plate: f.plate,
    km: f.km,
    attendant: f.attendant,
    protocol: protocol,
    entryType: entryType,
    items: items,
    attachmentData: f.attachment_data,
    attachmentType: f.attachment_type,
    ticketLogData: f.ticket_log_data,
    ticketLogType: f.ticket_log_type,
    createdAt: f.created_at,
    history: (f.fuel_audit_logs || [])
      .map(mapAuditLogFromDB)
      .sort((a: AuditLog, b: AuditLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  };
};

const mapFuelSupplyToDB = (f: FuelSupply) => {
  let protocolValue = f.protocol || '';
  if (f.entryType === 'manutencao' && f.items && f.items.length > 0) {
    protocolValue = `__maintenance__:${f.protocol || ''}__items__:${JSON.stringify(f.items)}`;
  }
  
  return {
    id: f.id && isUUID(f.id) ? f.id : generateUUID(),
    date: f.date,
    location: f.location,
    cnpj: f.cnpj,
    fuel_type: f.fuelType,
    liters: Number(f.liters) || 0,
    price_per_liter: Number(f.pricePerLiter) || 0,
    total_value: Number(f.totalValue) || 0,
    driver: f.driver,
    plate: f.plate,
    km: Number(f.km) || 0,
    attendant: f.attendant,
    protocol: protocolValue,
    attachment_data: f.attachmentData,
    attachment_type: f.attachmentType,
    ticket_log_data: f.ticketLogData,
    ticket_log_type: f.ticketLogType
  };
};

const mapVehicleFromDB = (v: any): Vehicle => ({
  id: v.id,
  plate: v.plate,
  fleetCode: v.fleet_code || '',
  model: v.model,
  brand: v.brand,
  year: v.year,
  color: v.color,
  photo: v.photo,
  createdAt: v.created_at
});

const mapVehicleToDB = (v: Partial<Vehicle>) => ({
  plate: v.plate,
  fleet_code: v.fleetCode,
  model: v.model,
  brand: v.brand,
  year: v.year,
  color: v.color,
  photo: v.photo
});

// --- Funções de Prestadores ---
export const getProviders = async () => {
  try {
    const { data, error } = await supabase
      .from('providers')
      .select('*, audit_logs(*)');
      
    if (error) throw error;
    return (data || []).map(mapProviderFromDB);
  } catch (err: any) {
    console.error("Erro detalhado ao buscar prestadores:", {
      message: err.message,
      details: err.details,
      hint: err.hint,
      code: err.code
    });
    if (err.message === 'Failed to fetch') {
      console.error("DICA: Verifique se o projeto Supabase está ativo ou se há bloqueio de rede (Firewall/VPN).");
    }
    throw err;
  }
};

export const createProvider = async (provider: Partial<Provider>) => {
  const providerId = provider.id && isUUID(provider.id) ? provider.id : generateUUID();
  const providerForDb = {
    ...provider,
    id: providerId,
    totalHoursToFulfill: provider.totalHoursToFulfill ?? 40,
    status: provider.status ?? 'active'
  };

  // Upload all base64 files to Cloudinary before saving to database
  if (providerForDb.identityDoc && providerForDb.identityDoc.startsWith('data:')) {
    providerForDb.identityDoc = await uploadDocument(providerForDb.identityDoc, `providers/${providerId}/identity`);
  }
  if (providerForDb.referralDoc && providerForDb.referralDoc.startsWith('data:')) {
    providerForDb.referralDoc = await uploadDocument(providerForDb.referralDoc, `providers/${providerId}/referral`);
  }
  if (providerForDb.profilePhoto && providerForDb.profilePhoto.startsWith('data:')) {
    providerForDb.profilePhoto = await uploadDocument(providerForDb.profilePhoto, `providers/${providerId}/profile`);
  }
  if (providerForDb.returnAttachment && providerForDb.returnAttachment.startsWith('data:')) {
    providerForDb.returnAttachment = await uploadDocument(providerForDb.returnAttachment, `providers/${providerId}/return`);
  }

  const dbData = mapProviderToDB(providerForDb);
  dbData.id = providerId;

  const { data: newProvider, error } = await supabase
    .from('providers')
    .insert([dbData])
    .select()
    .single();

  if (error) {
    console.error("Erro ao inserir prestador no Supabase:", error);
    throw error;
  }
  
  if (!newProvider) {
    throw new Error("Falha ao recuperar o registro recém-criado.");
  }

  if (provider.history && provider.history.length > 0) {
    await saveAuditLog(providerId, provider.history[0]);
  }

  return mapProviderFromDB(newProvider);
};

export const updateProvider = async (id: string, provider: Partial<Provider>) => {
  const providerForDb = { ...provider };

  // Upload all base64 files to Cloudinary before saving to database
  if (providerForDb.identityDoc && providerForDb.identityDoc.startsWith('data:')) {
    providerForDb.identityDoc = await uploadDocument(providerForDb.identityDoc, `providers/${id}/identity`);
  }
  if (providerForDb.referralDoc && providerForDb.referralDoc.startsWith('data:')) {
    providerForDb.referralDoc = await uploadDocument(providerForDb.referralDoc, `providers/${id}/referral`);
  }
  if (providerForDb.profilePhoto && providerForDb.profilePhoto.startsWith('data:')) {
    providerForDb.profilePhoto = await uploadDocument(providerForDb.profilePhoto, `providers/${id}/profile`);
  }
  if (providerForDb.returnAttachment && providerForDb.returnAttachment.startsWith('data:')) {
    providerForDb.returnAttachment = await uploadDocument(providerForDb.returnAttachment, `providers/${id}/return`);
  }

  const dbData = mapProviderToDB(providerForDb);
  
  const { error } = await supabase
    .from('providers')
    .update(dbData)
    .eq('id', id);

  if (error) throw error;
};

// --- Funções de Frequência ---
export const getAttendance = async () => {
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .order('date', { ascending: false });
      
    if (error) throw error;
    return (data || []).map(mapAttendanceFromDB);
  } catch (err: any) {
    console.error("Erro detalhado ao buscar frequência:", err);
    throw err;
  }
};

export const saveAttendance = async (records: AttendanceRecord[]) => {
  // Cache para evitar múltiplos uploads da mesma imagem no mesmo lote (comum em OCR)
  const uploadCache = new Map<string, string>();

  const processed = await Promise.all(records.map(async (r) => {
    let attachmentUrl = r.attachmentData;
    
    if (r.attachmentData && r.attachmentData.startsWith('data:')) {
      if (uploadCache.has(r.attachmentData)) {
        attachmentUrl = uploadCache.get(r.attachmentData)!;
      } else {
        const uploadedUrl = await uploadDocument(r.attachmentData, `attendance/${r.providerId}/${r.date}_${Date.now()}`);
        if (uploadedUrl && !uploadedUrl.startsWith('data:')) {
          uploadCache.set(r.attachmentData, uploadedUrl);
          attachmentUrl = uploadedUrl;
        } else {
          attachmentUrl = uploadedUrl;
        }
      }
    }
    
    return mapAttendanceToDB({ ...r, attachmentData: attachmentUrl });
  }));

  const { error } = await supabase.from('attendance').upsert(processed);
  if (error) {
    console.error("Erro ao salvar frequência no Supabase:", error);
    throw error;
  }
};

export const deleteAttendance = async (id: string) => {
  const { error } = await supabase.from('attendance').delete().eq('id', id);
  if (error) throw error;
};

// --- Funções de Abastecimento ---
export const getFuelSupplies = async () => {
  try {
    const { data, error } = await supabase
      .from('fuel_supplies')
      .select('*, fuel_audit_logs(*)')
      .order('date', { ascending: false });
      
    if (error) throw error;
    return (data || []).map(mapFuelSupplyFromDB);
  } catch (err: any) {
    console.error("Erro detalhado ao buscar abastecimentos:", err);
    throw err;
  }
};

export const saveFuelSupply = async (supply: FuelSupply) => {
  let attachmentUrl = supply.attachmentData;
  let ticketLogUrl = supply.ticketLogData;
  
  if (supply.attachmentData && supply.attachmentData.startsWith('data:')) {
    const uploadedUrl = await uploadDocument(supply.attachmentData, `fuel_supplies/${supply.date.split('T')[0]}_${Date.now()}`);
    if (uploadedUrl && !uploadedUrl.startsWith('data:')) {
      attachmentUrl = uploadedUrl;
    }
  }

  if (supply.ticketLogData && supply.ticketLogData.startsWith('data:')) {
    const uploadedUrl = await uploadDocument(supply.ticketLogData, `fuel_supplies/ticketlog_${supply.date.split('T')[0]}_${Date.now()}`);
    if (uploadedUrl && !uploadedUrl.startsWith('data:')) {
      ticketLogUrl = uploadedUrl;
    }
  }
  
  const dbData = mapFuelSupplyToDB({ ...supply, attachmentData: attachmentUrl, ticketLogData: ticketLogUrl });
  const { data: savedData, error } = await supabase.from('fuel_supplies').upsert([dbData]).select().single();
  
  if (error) {
    console.error("Erro ao salvar abastecimento no Supabase:", error);
    throw error;
  }

  return savedData ? mapFuelSupplyFromDB(savedData) : null;
};

export const saveFuelAuditLog = async (fuelSupplyId: string, log: AuditLog) => {
  const { error } = await supabase.from('fuel_audit_logs').insert([{
    fuel_supply_id: fuelSupplyId,
    user_name: log.userName,
    action: log.action,
    details: log.details,
    timestamp: new Date().toISOString()
  }]);
  
  if (error) {
    console.error("Erro ao salvar log de abastecimento no Supabase:", error);
    throw error;
  }
};

export const deleteFuelSupply = async (id: string) => {
  // Primeiro deletamos os logs de auditoria associados para evitar erro de chave estrangeira
  await supabase.from('fuel_audit_logs').delete().eq('fuel_supply_id', id);
  
  const { error } = await supabase.from('fuel_supplies').delete().eq('id', id);
  if (error) throw error;
};

// --- Funções de Veículos ---
export const getVehicles = async () => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('plate', { ascending: true });
      
    if (error) {
      if (error.code === 'PGRST205') {
        console.warn("Tabela 'vehicles' não encontrada. Certifique-se de criá-la no Supabase.");
        return [];
      }
      throw error;
    }
    return (data || []).map(mapVehicleFromDB);
  } catch (err) {
    console.error("Erro ao buscar veículos:", err);
    return [];
  }
};

export const saveVehicle = async (vehicle: Partial<Vehicle>) => {
  try {
    let photoUrl = vehicle.photo;
    
    // Se for uma nova foto em base64, fazemos o upload
    if (vehicle.photo && vehicle.photo.startsWith('data:')) {
      const uploadedUrl = await uploadDocument(vehicle.photo, `vehicles/${vehicle.plate}_${Date.now()}`);
      if (uploadedUrl && !uploadedUrl.startsWith('data:')) {
        photoUrl = uploadedUrl;
      }
    }
    
    const dbData = mapVehicleToDB({ ...vehicle, photo: photoUrl });
    
    let result;
    if (vehicle.id && isUUID(vehicle.id)) {
      result = await supabase.from('vehicles').update(dbData).eq('id', vehicle.id).select().single();
    } else {
      result = await supabase.from('vehicles').insert([dbData]).select().single();
    }
    
    if (result.error) {
      if (result.error.code === 'PGRST205') {
        throw new Error("A tabela 'vehicles' não existe no banco de dados. Por favor, crie-a para usar esta função.");
      }
      throw result.error;
    }

    return result.data ? mapVehicleFromDB(result.data) : null;
  } catch (err: any) {
    console.error("Erro ao salvar veículo:", err);
    throw err;
  }
};

export const deleteVehicle = async (id: string) => {
  try {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) {
      if (error.code === 'PGRST205') {
        throw new Error("A tabela 'vehicles' não existe no banco de dados.");
      }
      throw error;
    }
  } catch (err: any) {
    console.error("Erro ao excluir veículo:", err);
    throw err;
  }
};

// --- Funções de Postos ---
export const getStationNicknames = async () => {
  try {
    const { data, error } = await supabase
      .from('station_nicknames')
      .select('*');
      
    if (error) {
      if (error.code === 'PGRST205') return [];
      throw error;
    }
    return (data || []).map(n => ({
      id: n.id,
      originalName: n.original_name,
      nickname: n.nickname
    })) as StationNickname[];
  } catch (err) {
    console.error("Erro ao buscar postos:", err);
    return [];
  }
};

export const saveStationNickname = async (originalName: string, nickname: string) => {
  try {
    // Aqui garantimos que o banco receba 'original_name' 
    // e não 'originalName'
    const { error } = await supabase
      .from('station_nicknames')
      .upsert(
        { 
          original_name: originalName, 
          nickname: nickname 
        },
        { onConflict: 'original_name' }
      );

    if (error) throw error;
    console.log("Salvo com sucesso!");
  } catch (err) {
    console.error("Erro ao salvar posto:", err);
    throw err;
  }
};

// --- Funções de Auditoria ---
export const saveAuditLog = async (providerId: string, log: AuditLog) => {
  const { error } = await supabase.from('audit_logs').insert([{
    provider_id: providerId,
    user_name: log.userName,
    action: log.action,
    details: log.details,
    timestamp: new Date().toISOString()
  }]);
  
  if (error) {
    console.error("Erro ao salvar log no Supabase:", error);
    throw error;
  }
};

// --- Funções de Autenticação ---
export const requestPasswordReset = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
  return true;
};

// --- Funções de Reconhecimento Facial ---
export const saveFaceDescriptor = async (providerId: string, descriptor: number[]): Promise<void> => {
  // Remove any existing descriptor for this provider first
  await supabase.from('face_descriptors').delete().eq('provider_id', providerId);
  
  const { error } = await supabase.from('face_descriptors').insert({
    provider_id: providerId,
    descriptor: descriptor,
  });
  if (error) throw error;
};

export const getFaceDescriptors = async (): Promise<{ provider_id: string; descriptor: number[] }[]> => {
  const { data, error } = await supabase
    .from('face_descriptors')
    .select('provider_id, descriptor');
  if (error) {
    console.error('Erro ao buscar descritores faciais:', error);
    return [];
  }
  return data || [];
};

export const deleteFaceDescriptor = async (providerId: string): Promise<void> => {
  const { error } = await supabase.from('face_descriptors').delete().eq('provider_id', providerId);
  if (error) throw error;
};

// --- Funções de Controle de Acesso (ACL) ---
export const getSystemConfig = async (key: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('sys_config')
      .select('value')
      .eq('key', key)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data?.value;
  } catch (err) {
    console.error(`Erro ao buscar sys_config (${key}):`, err);
    return null;
  }
};

export const updateSystemConfig = async (key: string, value: any): Promise<void> => {
  const { error } = await supabase
    .from('sys_config')
    .upsert({ key, value }, { onConflict: 'key' });
  if (error) throw error;
};

export const getAllProfiles = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name');
      
    if (error) throw error;
    
    return (data || []).map(p => ({
      id: p.id,
      name: p.name,
      warName: p.war_name,
      email: p.email,
      rank: p.rank,
      cpf: p.cpf,
      profilePhoto: p.profile_photo,
      allowedScreens: p.allowed_screens || ['dashboard', 'fuel', 'face-checkin'],
      isAdmin: p.is_admin || false
    }));
  } catch (err) {
    console.error("Erro ao buscar todos os perfis:", err);
    throw err;
  }
};

export const updateUserAccess = async (userId: string, allowedScreens: string[], isAdmin: boolean): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update({ 
      allowed_screens: allowedScreens,
      is_admin: isAdmin
    })
    .eq('id', userId);
    
  if (error) throw error;
};

// --- Foto de Perfil via Supabase Storage ---
// --- Funções de Perímetro GPS ---
export const getGeoPerimeter = async (): Promise<GeoPerimeter | null> => {
  const value = await getSystemConfig('geo_perimeter');
  return value ?? null;
};

export const saveGeoPerimeter = async (perimeter: GeoPerimeter): Promise<void> => {
  await updateSystemConfig('geo_perimeter', perimeter);
};

export const uploadProfilePhoto = async (userId: string, base64DataUrl: string): Promise<string> => {
  if (!base64DataUrl || !base64DataUrl.startsWith('data:')) return base64DataUrl;
  
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dizhbrjdv';
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'cbm_gestao';
  
  try {
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
    const safeFilename = `operator_${userId}_profile_${Date.now()}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
    
    const formData = new URLSearchParams();
    formData.append('file', base64DataUrl);
    formData.append('upload_preset', uploadPreset);
    formData.append('public_id', safeFilename);
    formData.append('filename_override', safeFilename);
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Falha no upload da foto de perfil para o Cloudinary:", errorData);
      throw new Error(errorData.error?.message || "Erro no upload da foto de perfil");
    }
    
    const data = await response.json();
    return data.secure_url;
  } catch (error: any) {
    console.error("Erro ao fazer upload da foto de perfil para o Cloudinary:", error);
    throw error;
  }
};

// --- Funções de Avaliação Mensal ---
const mapEvaluationFromDB = (e: any): MonthlyEvaluation => ({
  id: e.id,
  providerId: e.provider_id,
  year: e.year,
  month: e.month,
  hadAbsences: e.had_absences,
  goodBehavior: e.good_behavior,
  disciplinaryIssues: e.disciplinary_issues,
  satisfactoryService: e.satisfactory_service,
  observations: e.observations,
  evaluatedBy: e.evaluated_by,
  createdAt: e.created_at
});

const mapEvaluationToDB = (e: Partial<MonthlyEvaluation> & { evaluatedBy: string }) => ({
  provider_id: e.providerId,
  year: e.year,
  month: e.month,
  had_absences: e.hadAbsences ?? false,
  good_behavior: e.goodBehavior ?? true,
  disciplinary_issues: e.disciplinaryIssues ?? false,
  satisfactory_service: e.satisfactoryService ?? true,
  observations: e.observations || null,
  evaluated_by: e.evaluatedBy
});

export const getMonthlyEvaluations = async (providerId: string): Promise<MonthlyEvaluation[]> => {
  try {
    const { data, error } = await supabase
      .from('monthly_evaluations')
      .select('*')
      .eq('provider_id', providerId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) {
      if (error.code === 'PGRST205') return [];
      throw error;
    }
    return (data || []).map(mapEvaluationFromDB);
  } catch (err) {
    console.error("Erro ao buscar avaliações mensais:", err);
    return [];
  }
};

export const getMonthlyEvaluationForMonth = async (providerId: string, year: number, month: number): Promise<MonthlyEvaluation | null> => {
  try {
    const { data, error } = await supabase
      .from('monthly_evaluations')
      .select('*')
      .eq('provider_id', providerId)
      .eq('year', year)
      .eq('month', month)
      .maybeSingle();

    if (error) throw error;
    return data ? mapEvaluationFromDB(data) : null;
  } catch (err) {
    console.error("Erro ao buscar avaliação do mês:", err);
    return null;
  }
};

export const saveMonthlyEvaluation = async (evaluation: Partial<MonthlyEvaluation> & { providerId: string; year: number; month: number; evaluatedBy: string }): Promise<MonthlyEvaluation | null> => {
  try {
    const dbData = mapEvaluationToDB(evaluation);

    const { data, error } = await supabase
      .from('monthly_evaluations')
      .upsert([dbData], { onConflict: 'provider_id,year,month' })
      .select()
      .single();

    if (error) {
      console.error("Erro ao salvar avaliação mensal:", error);
      throw error;
    }
    return data ? mapEvaluationFromDB(data) : null;
  } catch (err) {
    console.error("Erro ao salvar avaliação mensal:", err);
    throw err;
  }
};

export const getAllMonthlyEvaluationsForMonth = async (year: number, month: number): Promise<MonthlyEvaluation[]> => {
  try {
    const { data, error } = await supabase
      .from('monthly_evaluations')
      .select('*')
      .eq('year', year)
      .eq('month', month);

    if (error) {
      if (error.code === 'PGRST205') return [];
      throw error;
    }
    return (data || []).map(mapEvaluationFromDB);
  } catch (err) {
    console.error("Erro ao buscar avaliações do mês:", err);
    return [];
  }
};

// --- Funções de Troca de Serviço ---
const mapServiceSwapFromDB = (s: any): ServiceSwap => ({
  id: s.id,
  escaladoId: s.escalado_id,
  substitutoId: s.substituto_id,
  funcao: s.funcao,
  data: s.data,
  horarioInicio: s.horario_inicio ? s.horario_inicio.substring(0, 5) : '', // HH:mm
  horarioFim: s.horario_fim ? s.horario_fim.substring(0, 5) : '', // HH:mm
  status: s.status,
  aprovadorId: s.aprovador_id || undefined,
  observacao: s.observacao || undefined,
  dataAprovacao: s.data_aprovacao || undefined,
  dataPagamento: s.data_pagamento || undefined,
  horarioInicioPagamento: s.horario_inicio_pagamento ? s.horario_inicio_pagamento.substring(0, 5) : undefined,
  horarioFimPagamento: s.horario_fim_pagamento ? s.horario_fim_pagamento.substring(0, 5) : undefined,
  createdAt: s.created_at
});

const mapServiceSwapToDB = (s: Partial<ServiceSwap>) => {
  const dbData: any = {};
  if (s.escaladoId !== undefined) dbData.escalado_id = s.escaladoId;
  if (s.substitutoId !== undefined) dbData.substituto_id = s.substitutoId;
  if (s.funcao !== undefined) dbData.funcao = s.funcao;
  if (s.data !== undefined) dbData.data = s.data;
  if (s.horarioInicio !== undefined) dbData.horario_inicio = s.horarioInicio;
  if (s.horarioFim !== undefined) dbData.horario_fim = s.horarioFim;
  if (s.status !== undefined) dbData.status = s.status;
  if (s.aprovadorId !== undefined) dbData.aprovador_id = s.aprovadorId;
  if (s.observacao !== undefined) dbData.observacao = s.observacao;
  if (s.dataAprovacao !== undefined) dbData.data_aprovacao = s.dataAprovacao;
  if (s.dataPagamento !== undefined) dbData.data_pagamento = s.dataPagamento || null;
  if (s.horarioInicioPagamento !== undefined) dbData.horario_inicio_pagamento = s.horarioInicioPagamento || null;
  if (s.horarioFimPagamento !== undefined) dbData.horario_fim_pagamento = s.horarioFimPagamento || null;
  return dbData;
};


export const getServiceSwaps = async (): Promise<ServiceSwap[]> => {
  try {
    const { data, error } = await supabase
      .from('service_swaps')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST205') return [];
      throw error;
    }
    return (data || []).map(mapServiceSwapFromDB);
  } catch (err) {
    console.error("Erro ao buscar trocas de serviço:", err);
    return [];
  }
};

export const createServiceSwap = async (swap: Partial<ServiceSwap>): Promise<ServiceSwap | null> => {
  try {
    const dbData = mapServiceSwapToDB({ ...swap, status: swap.status || 'aguardando_substituto' });
    const { data, error } = await supabase
      .from('service_swaps')
      .insert([dbData])
      .select()
      .single();

    if (error) throw error;
    return data ? mapServiceSwapFromDB(data) : null;
  } catch (err) {
    console.error("Erro ao criar troca de serviço:", err);
    throw err;
  }
};

export const evaluateServiceSwap = async (
  swapId: string,
  status: 'aprovado' | 'reprovado',
  approverId: string,
  observation?: string
): Promise<ServiceSwap | null> => {
  try {
    const { data, error } = await supabase
      .from('service_swaps')
      .update({
        status,
        aprovador_id: approverId,
        observacao: observation || null,
        data_aprovacao: new Date().toISOString()
      })
      .eq('id', swapId)
      .select()
      .single();

    if (error) throw error;
    return data ? mapServiceSwapFromDB(data) : null;
  } catch (err) {
    console.error("Erro ao avaliar troca de serviço:", err);
    throw err;
  }
};

export const cancelServiceSwap = async (
  swapId: string,
  reason?: string,
  approverId?: string
): Promise<ServiceSwap | null> => {
  try {
    const updateData: any = { status: 'cancelado' };
    if (reason) {
      updateData.observacao = reason;
    }
    if (approverId) {
      updateData.aprovador_id = approverId;
      updateData.data_aprovacao = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('service_swaps')
      .update(updateData)
      .eq('id', swapId)
      .select()
      .single();

    if (error) throw error;
    return data ? mapServiceSwapFromDB(data) : null;
  } catch (err) {
    console.error("Erro ao cancelar troca de serviço:", err);
    throw err;
  }
};


export const acceptServiceSwap = async (swapId: string): Promise<ServiceSwap | null> => {
  try {
    const { data, error } = await supabase
      .from('service_swaps')
      .update({ status: 'pendente' })
      .eq('id', swapId)
      .select()
      .single();

    if (error) throw error;
    return data ? mapServiceSwapFromDB(data) : null;
  } catch (err) {
    console.error("Erro ao aceitar troca de serviço:", err);
    throw err;
  }
};

export const rejectServiceSwap = async (swapId: string, reason: string): Promise<ServiceSwap | null> => {
  try {
    const { data, error } = await supabase
      .from('service_swaps')
      .update({ status: 'recusado_substituto', observacao: reason })
      .eq('id', swapId)
      .select()
      .single();

    if (error) throw error;
    return data ? mapServiceSwapFromDB(data) : null;
  } catch (err) {
    console.error("Erro ao recusar troca de serviço:", err);
    throw err;
  }
};

export const deleteUserProfile = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (error) throw error;
  } catch (err) {
    console.error('Erro ao remover perfil do usuário:', err);
    throw err;
  }
};

export const updateServiceSwapPayment = async (
  swapId: string,
  dataPagamento: string | null,
  horarioInicioPagamento: string | null,
  horarioFimPagamento: string | null
): Promise<ServiceSwap | null> => {
  try {
    const { data, error } = await supabase
      .from('service_swaps')
      .update({
        data_pagamento: dataPagamento,
        horario_inicio_pagamento: horarioInicioPagamento,
        horario_fim_pagamento: horarioFimPagamento
      })
      .eq('id', swapId)
      .select()
      .single();

    if (error) throw error;
    return data ? mapServiceSwapFromDB(data) : null;
  } catch (err) {
    console.error("Erro ao atualizar pagamento da troca:", err);
    throw err;
  }
};

export const updateServiceSwapDetails = async (
  swapId: string,
  data: string,
  horarioInicio: string,
  horarioFim: string
): Promise<ServiceSwap | null> => {
  try {
    const { data: updated, error } = await supabase
      .from('service_swaps')
      .update({
        data: data,
        horario_inicio: horarioInicio,
        horario_fim: horarioFim
      })
      .eq('id', swapId)
      .select()
      .single();

    if (error) throw error;
    return updated ? mapServiceSwapFromDB(updated) : null;
  } catch (err) {
    console.error("Erro ao atualizar detalhes da troca:", err);
    throw err;
  }
};


