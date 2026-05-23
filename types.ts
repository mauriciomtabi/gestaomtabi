
export interface AuditLog {
  id: string;
  providerId?: string;
  timestamp: string;
  userName: string;
  action: 'CADASTRO' | 'DEVOLUÇÃO' | 'REATIVAÇÃO' | 'EDIÇÃO' | 'STATUS_ALTERADO' | 'PRESENÇA' | 'JUSTIFICATIVA' | 'AVALIAÇÃO';
  details: string;
}

export interface Operator {
  id?: string;
  name: string;
  warName: string;
  cpf: string;
  email: string;
  rank: string;
  profilePhoto?: string;
  allowedScreens?: string[];
  isAdmin?: boolean;
}

export interface Provider {
  id: string;
  name: string;
  processNumber: string;
  phone: string;
  address: string;
  assignedEntity: string;
  totalHoursToFulfill: number; // In hours
  status: 'active' | 'completed' | 'suspended' | 'returned';
  returnReason?: string;
  returnAttachment?: string;
  identityDoc?: string; // Base64 do documento de identidade
  referralDoc?: string; // Base64 da folha de encaminhamento
  profilePhoto?: string; // Base64 da foto do rosto extraída
  observations?: string;
  referralDate?: string; // YYYY-MM-DD
  receiptDate?: string; // YYYY-MM-DD
  history: AuditLog[];
}

export interface AttendanceRecord {
  id: string;
  providerId: string;
  date: string; // ISO format YYYY-MM-DD
  entryTime: string; // HH:mm (vazio se for justificativa)
  exitTime: string; // HH:mm (vazio se for justificativa)
  durationMinutes: number;
  attachmentData?: string; // Base64 do documento para consulta
  attachmentType?: string; // mimeType
  type?: 'presence' | 'justification';
  reason?: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  fleetCode: string;
  model: string;
  brand: string;
  year: string;
  color: string;
  photo?: string; // Base64 or URL
  createdAt: string;
}

export interface StationNickname {
  id: string;
  originalName: string;
  nickname: string;
}

export interface FuelSupply {
  id: string;
  date: string; // ISO format YYYY-MM-DDTHH:mm
  location: string;
  cnpj: string;
  fuelType: string;
  liters: number;
  pricePerLiter: number;
  totalValue: number;
  driver: string;
  plate: string;
  km: number;
  attendant: string;
  protocol: string;
  attachmentData?: string; // Base64 da nota
  attachmentType?: string;
  ticketLogData?: string; // Base64 do ticket log
  ticketLogType?: string;
  history?: AuditLog[];
  createdAt: string;
}

export interface MonthlySummary {
  providerId: string;
  providerName: string;
  lastVisit: string;
  totalWorkedMinutes: number;
  totalToFulfillMinutes: number;
  remainingMinutes: number;
}

export interface MonthlyEvaluation {
  id: string;
  providerId: string;
  year: number;
  month: number;
  hadAbsences: boolean;
  goodBehavior: boolean;
  disciplinaryIssues: boolean;
  satisfactoryService: boolean;
  observations?: string;
  evaluatedBy: string;
  createdAt: string;
}

export interface ServiceSwap {
  id: string;
  escaladoId: string;
  substitutoId: string;
  funcao: 'CG' | 'COV' | 'Linha' | 'COBOM';
  data: string; // YYYY-MM-DD
  horarioInicio: string; // HH:mm
  horarioFim: string; // HH:mm
  status: 'pendente' | 'aprovado' | 'reprovado' | 'cancelado';
  aprovadorId?: string;
  observacao?: string;
  dataAprovacao?: string;
  createdAt: string;
  escaladoName?: string;
  substitutoName?: string;
  aprovadorName?: string;
}

