import React, { useState, useEffect, useRef } from 'react';
import { Building2, Plus, Search, Filter, Phone, User, Landmark, HelpCircle, Edit2, Trash2, Calendar, FileText, ChevronRight, X, AlertTriangle, ArrowUpRight, Upload } from 'lucide-react';
import { getClientes, createCliente, updateCliente, deleteCliente, getProjetos, createProjeto, getFinanceiroMovimentos, uploadClientLogo, getContratos, createContrato, updateContrato, deleteContrato, createFinanceiroMovimento, updateFinanceiroMovimento, deleteFinanceiroMovimento, sincronizarTodosOsContratos, getTecnologias, createTecnologia, updateTecnologia, deleteTecnologia } from '../services/supabaseService';
import { Cliente, Projeto, FinanceiroMovimento, Contrato, Tecnologia, RecursoAdicional } from '../types';
import { formatDateBR } from '../utils/timeUtils';

interface MonthProjection {
  mesRef: string; // 'AAAA-MM'
  label: string;  // 'Jan/26'
  valor: number;
  status: 'Previsto' | 'Confirmado' | 'Atrasado' | 'Cancelado';
  originalId?: string;
}

interface ClientesProps {
  onNavigateToProject?: (projectId: string) => void;
}

const Clientes: React.FC<ClientesProps> = ({ onNavigateToProject }) => {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [movimentos, setMovimentos] = useState<FinanceiroMovimento[]>([]);
  
  // Seleção e visualização de detalhes
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  
  // Busca e Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Modais CRUD Cliente
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [quickProjectErrorMsg, setQuickProjectErrorMsg] = useState<string | null>(null);

  // Crop & Zoom Logo (WhatsApp Style)
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [tempLogoSrc, setTempLogoSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [clientForm, setClientForm] = useState({
    nome_empresa: '',
    cnpj: '',
    logo_url: '',
    nome_contato_principal: '',
    nome_contato_interno: '',
    segmento: '',
    status: 'Ativo' as Cliente['status'],
    tipo_relacao: 'Projeto único' as Cliente['tipo_relacao'],
    observacoes: '',
    valor_recorrente: 0,
    link_contrato: ''
  });

  // Modal de Projeção Financeira
  const [isProjectionModalOpen, setIsProjectionModalOpen] = useState(false);
  const [projectionMonths, setProjectionMonths] = useState<MonthProjection[]>([]);
  const [loteValor1, setLoteValor1] = useState(0);
  const [loteMeses1, setLoteMeses1] = useState(6);
  const [loteValor2, setLoteValor2] = useState(0);
  const [loteMeses2, setLoteMeses2] = useState(6);

  // Estados para Gestão de Contratos
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [editingContrato, setEditingContrato] = useState<Contrato | null>(null);
  const [contractForm, setContractForm] = useState({
    valor_recorrente: 0,
    link_contrato: '',
    data_inicio: '',
    data_fim: '',
    dia_pagamento: 10,
    valor_implantacao: 0,
    forma_pagamento: 'PIX',
    parcelas: 1,
    status: 'Ativo' as Contrato['status'],
    reajuste_valor: 0,
    reajuste_data: '',
    observacoes: ''
  });

  // Custom Toast & Confirms
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Modal para Criar Projeto DIRETO no Cliente
  const [isQuickProjectModalOpen, setIsQuickProjectModalOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({
    nome_solucao: '',
    descricao: '',
    status: 'Em desenvolvimento' as Projeto['status'],
    link_acesso: '',
    ferramenta_dev_input: '',
    ferramenta_dev: [] as string[],
    banco_dados: '',
    repositorio_url: '',
    hospedagem_imagens: '',
    hospedagem_geral: '',
    link_supabase: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_entrega_prevista: '',
    valor_projeto: 0,
    valor_mensal: 0,
    observacoes: '',
    user_acesso: '',
    user_supabase: '',
    user_repositorio: '',
    user_imagens: '',
    user_hospedagem: ''
  });

  const [selectedProjectTools, setSelectedProjectTools] = useState<string[]>([]);
  const [newProjectToolInput, setNewProjectToolInput] = useState('');
  const [tecnologias, setTecnologias] = useState<Tecnologia[]>([]);

  // Controle de Recursos Operacionais Ativos no modal de Clientes
  const [hasDatabase, setHasDatabase] = useState(false);
  const [hasRepository, setHasRepository] = useState(false);
  const [hasImages, setHasImages] = useState(false);
  const [hasHosting, setHasHosting] = useState(false);

  // Tecnologias escolhidas para cada recurso
  const [dbTech, setDbTech] = useState('');
  const [repoTech, setRepoTech] = useState('');
  const [imagesTech, setImagesTech] = useState('');
  const [hostingTech, setHostingTech] = useState('');

  // Estados do gerenciador de tecnologias no modal de Clientes
  const [isTechManagerOpen, setIsTechManagerOpen] = useState(false);
  const [editingTechId, setEditingTechId] = useState<string | null>(null);
  const [editingTechName, setEditingTechName] = useState('');
  const [newToolInput, setNewToolInput] = useState('');
  const [customResources, setCustomResources] = useState<RecursoAdicional[]>([]);

  // Modal de Confirmação de Exclusão
  const [clientToDelete, setClientToDelete] = useState<Cliente | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      await sincronizarTodosOsContratos();
      const [c, p, f, ct, t] = await Promise.all([
        getClientes(),
        getProjetos(),
        getFinanceiroMovimentos(),
        getContratos(),
        getTecnologias()
      ]);
      setClientes(c);
      setProjetos(p);
      setMovimentos(f);
      setContratos(ct);
      setTecnologias(t);
      
      // Atualiza o cliente selecionado se aplicável
      if (selectedCliente) {
        const updated = c.find(item => item.id === selectedCliente.id);
        setSelectedCliente(updated || null);
      }
    } catch (e) {
      console.error('Erro ao carregar Clientes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewClientModal = () => {
    setErrorMsg(null);
    setEditingCliente(null);
    setClientForm({
      nome_empresa: '',
      cnpj: '',
      logo_url: '',
      nome_contato_principal: '',
      nome_contato_interno: '',
      segmento: '',
      status: 'Ativo',
      tipo_relacao: 'Projeto único',
      observacoes: '',
      valor_recorrente: 0,
      link_contrato: ''
    });
    setIsClientModalOpen(true);
  };

  const openEditClientModal = (c: Cliente) => {
    setErrorMsg(null);
    setEditingCliente(c);
    setClientForm({
      nome_empresa: c.nome_empresa,
      cnpj: c.cnpj || '',
      logo_url: c.logo_url || '',
      nome_contato_principal: c.nome_contato_principal || '',
      nome_contato_interno: c.nome_contato_interno || '',
      segmento: c.segmento || '',
      status: c.status,
      tipo_relacao: c.tipo_relacao,
      observacoes: c.observacoes || '',
      valor_recorrente: Number(c.valor_recorrente || 0),
      link_contrato: c.link_contrato || ''
    });
    setIsClientModalOpen(true);
  };

  // Funções da Projeção Financeira
  const obterMesesProjecao = () => {
    const meses = [];
    const hoje = new Date();
    // 6 meses para trás
    for (let i = 6; i > 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push(d);
    }
    // Mês atual
    meses.push(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
    // 12 meses para a frente
    for (let i = 1; i <= 12; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      meses.push(d);
    }
    return meses;
  };

  const openProjectionModal = (c: Cliente) => {
    setLoteValor1(Number(c.valor_recorrente || 0));
    setLoteMeses1(6);
    setLoteValor2(Number(c.valor_recorrente || 0));
    setLoteMeses2(6);

    const meses = obterMesesProjecao();
    const list: MonthProjection[] = meses.map(date => {
      const mesStr = date.toISOString().slice(0, 7);
      const [ano, mes] = mesStr.split('-');
      const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const label = `${nomes[parseInt(mes, 10) - 1]}/${ano.slice(-2)}`;

      const existing = movimentos.find(m => 
        m.cliente_id === c.id && 
        m.mes_referencia === mesStr && 
        m.tipo === 'Entrada recorrente mensal'
      );

      const inicioMes = `${mesStr}-01`;
      const fimMes = `${mesStr}-31`;
      const contratosValidos = contratos.filter(contr => 
        contr.cliente_id === c.id &&
        contr.status !== 'Cancelado' &&
        contr.data_inicio <= fimMes &&
        (!contr.data_fim || contr.data_fim >= inicioMes)
      );
      const contratoDoMes = contratosValidos.find(contr => contr.status === 'Ativo') || contratosValidos[0];
      const valorContrato = contratoDoMes ? Number(contratoDoMes.valor_recorrente) : 0;

      const hojeStr = new Date().toISOString().slice(0, 7);
      const isPastOrPresent = mesStr <= hojeStr;
      
      return {
        mesRef: mesStr,
        label,
        valor: existing ? Number(existing.valor) : valorContrato,
        status: existing ? existing.status : (isPastOrPresent ? 'Confirmado' : 'Previsto'),
        originalId: existing ? existing.id : undefined
      };
    });

    setProjectionMonths(list);
    setIsProjectionModalOpen(true);
  };

  const aplicarRegrasLote = () => {
    const hojeStr = new Date().toISOString().slice(0, 7);
    const updated = projectionMonths.map(item => {
      const indexFromCurrent = projectionMonths.filter(m => m.mesRef >= hojeStr).findIndex(m => m.mesRef === item.mesRef);
      if (indexFromCurrent !== -1) {
        if (indexFromCurrent < loteMeses1) {
          return { ...item, valor: loteValor1 };
        } else if (indexFromCurrent < (loteMeses1 + loteMeses2)) {
          return { ...item, valor: loteValor2 };
        }
      }
      return item;
    });
    setProjectionMonths(updated);
  };

  const handleSaveProjection = async () => {
    if (!selectedCliente) return;
    try {
      setLoading(true);
      const promises = [];
      for (const item of projectionMonths) {
        if (item.valor > 0) {
          if (item.originalId) {
            promises.push(updateFinanceiroMovimento(item.originalId, {
              valor: item.valor,
              status: item.status
            }));
          } else {
            const dataRef = `${item.mesRef}-10`;
            promises.push(createFinanceiroMovimento({
              cliente_id: selectedCliente.id,
              tipo: 'Entrada recorrente mensal',
              descricao: `Consultoria Recorrente - ${selectedCliente.nome_empresa}`,
              valor: item.valor,
              data_movimento: dataRef,
              mes_referencia: item.mesRef,
              status: item.status
            }));
          }
        } else if (item.originalId) {
          promises.push(deleteFinanceiroMovimento(item.originalId));
        }
      }
      await Promise.all(promises);
      setIsProjectionModalOpen(false);
      await loadData();
      showToast('Projeção financeira salva com sucesso!');
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar projeção.', 'error');
    } finally {
      setLoading(false);
    }
  };
  // Funções de Gestão de Contratos
  const openNewContractModal = (clienteId: string) => {
    setEditingContrato(null);
    setContractForm({
      valor_recorrente: 0,
      link_contrato: '',
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: '',
      dia_pagamento: 10,
      valor_implantacao: 0,
      forma_pagamento: 'PIX',
      parcelas: 1,
      status: 'Ativo',
      reajuste_valor: 0,
      reajuste_data: '',
      observacoes: ''
    });
    setIsContractModalOpen(true);
  };

  const openEditContractModal = (c: Contrato) => {
    setEditingContrato(c);
    setContractForm({
      valor_recorrente: c.valor_recorrente,
      link_contrato: c.link_contrato || '',
      data_inicio: c.data_inicio,
      data_fim: c.data_fim || '',
      dia_pagamento: c.dia_pagamento ?? 10,
      valor_implantacao: c.valor_implantacao ?? 0,
      forma_pagamento: c.forma_pagamento || 'PIX',
      parcelas: c.parcelas ?? 1,
      status: c.status,
      reajuste_valor: c.reajuste_valor ?? 0,
      reajuste_data: c.reajuste_data || '',
      observacoes: c.observacoes || ''
    });
    setIsContractModalOpen(true);
  };

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) return;
    try {
      setLoading(true);
      const payload: Partial<Contrato> = {
        cliente_id: selectedCliente.id,
        valor_recorrente: Number(contractForm.valor_recorrente),
        link_contrato: contractForm.link_contrato || null,
        data_inicio: contractForm.data_inicio,
        data_fim: contractForm.data_fim || null,
        dia_pagamento: contractForm.dia_pagamento || 10,
        valor_implantacao: Number(contractForm.valor_implantacao) || 0,
        forma_pagamento: contractForm.forma_pagamento || 'PIX',
        parcelas: contractForm.parcelas || 1,
        status: contractForm.status,
        reajuste_valor: contractForm.reajuste_valor ? Number(contractForm.reajuste_valor) : null,
        reajuste_data: contractForm.reajuste_data || null,
        observacoes: contractForm.observacoes || null
      };

      // Se este contrato está ativo, todos os outros deste cliente devem virar histórico
      if (payload.status === 'Ativo') {
        const outrosContratos = contratos.filter(c => c.cliente_id === selectedCliente.id && c.id !== editingContrato?.id);
        const promises = outrosContratos.map(c => {
          if (c.status === 'Ativo') {
            return updateContrato(c.id, { status: 'Histórico' });
          }
          return null;
        }).filter(Boolean);
        await Promise.all(promises);
      }

      let savedContract: Contrato;
      if (editingContrato) {
        savedContract = await updateContrato(editingContrato.id, payload);
      } else {
        savedContract = await createContrato(payload);
      }

      // Sincroniza faturamentos mensais com base no histórico de contratos
      await sincronizarTodosOsContratos();

      setIsContractModalOpen(false);
      await loadData();
      showToast('Contrato salvo com sucesso!');
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar contrato.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContract = (id: string) => {
    setContractToDelete(id);
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      let finalForm = { ...clientForm };
      
      if (editingCliente) {
        if (clientForm.logo_url && clientForm.logo_url.startsWith('data:')) {
          const uploadedUrl = await uploadClientLogo(editingCliente.id, clientForm.logo_url);
          if (!uploadedUrl) {
            throw new Error('Falha ao fazer upload do logotipo. O bucket "documents" existe no seu Supabase e está configurado como público?');
          }
          finalForm.logo_url = uploadedUrl;
        }
        await updateCliente(editingCliente.id, finalForm);
      } else {
        const logoBase64 = clientForm.logo_url;
        finalForm.logo_url = '';
        const created = await createCliente(finalForm);
        
        if (logoBase64 && logoBase64.startsWith('data:')) {
          const uploadedUrl = await uploadClientLogo(created.id, logoBase64);
          if (!uploadedUrl) {
            throw new Error('Cliente cadastrado, mas falhou ao fazer upload do logotipo. Verifique se o bucket "documents" existe no seu Supabase e está configurado como público.');
          }
          await updateCliente(created.id, { logo_url: uploadedUrl });
          created.logo_url = uploadedUrl;
        }
      }
      
      setIsClientModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      const detailMsg = err && typeof err === 'object' && 'message' in err 
        ? String((err as any).message) 
        : JSON.stringify(err);
      setErrorMsg(`Erro: ${detailMsg}`);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempLogoSrc(reader.result as string);
        setZoom(1);
        setPosition({ x: 0, y: 0 });
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ 
        x: e.touches[0].clientX - position.x, 
        y: e.touches[0].clientY - position.y 
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleConfirmCrop = () => {
    if (!tempLogoSrc) return;
    
    const img = new Image();
    img.src = tempLogoSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.clearRect(0, 0, 300, 300);
        
        ctx.save();
        ctx.translate(150, 150);
        
        const renderScale = 300 / 256;
        ctx.translate(position.x * renderScale, position.y * renderScale);
        ctx.scale(zoom, zoom);
        
        const imgRatio = img.width / img.height;
        let drawWidth = 300;
        let drawHeight = 300;
        
        if (imgRatio > 1) {
          drawHeight = 300 / imgRatio;
        } else {
          drawWidth = 300 * imgRatio;
        }
        
        ctx.drawImage(
          img,
          -drawWidth / 2,
          -drawHeight / 2,
          drawWidth,
          drawHeight
        );
        
        ctx.restore();
      }
      
      const croppedBase64 = canvas.toDataURL('image/png');
      setClientForm(prev => ({ ...prev, logo_url: croppedBase64 }));
      setIsCropModalOpen(false);
      setTempLogoSrc(null);
    };
  };

  const openQuickProjectModal = () => {
    setSelectedProjectTools([]);
    setNewProjectToolInput('');
    setQuickProjectErrorMsg(null);
    setProjectForm({
      nome_solucao: '',
      descricao: '',
      status: 'Em desenvolvimento',
      link_acesso: '',
      ferramenta_dev_input: '',
      ferramenta_dev: [],
      banco_dados: '',
      repositorio_url: '',
      hospedagem_imagens: '',
      hospedagem_geral: '',
      link_supabase: '',
      data_inicio: new Date().toISOString().split('T')[0],
      data_entrega_prevista: '',
      valor_projeto: 0,
      valor_mensal: 0,
      observacoes: '',
      user_acesso: '',
      user_supabase: '',
      user_repositorio: '',
      user_imagens: '',
      user_hospedagem: '',
      forma_pagamento: 'Boleto',
      parcelas: 1
    });
    setHasDatabase(false);
    setHasRepository(false);
    setHasImages(false);
    setHasHosting(false);
    setDbTech('');
    setRepoTech('');
    setImagesTech('');
    setHostingTech('');
    setCustomResources([]);
    setIsQuickProjectModalOpen(true);
  };

  const handleRenameTechnology = async (id: string) => {
    if (!editingTechName.trim()) return;
    try {
      await updateTecnologia(id, editingTechName.trim());
      setEditingTechId(null);
      setEditingTechName('');
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTechnology = async (id: string) => {
    try {
      await deleteTecnologia(id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleProjectTool = (tool: string) => {
    setSelectedProjectTools(prev =>
      prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]
    );
  };

  const handleAddCustomProjectTool = async () => {
    const trimmed = newProjectToolInput.trim();
    if (trimmed) {
      try {
        const existe = tecnologias.find(t => t.nome.toLowerCase() === trimmed.toLowerCase());
        let novaTech: Tecnologia;
        if (!existe) {
          novaTech = await createTecnologia(trimmed);
          setTecnologias(prev => [...prev, novaTech].sort((a, b) => a.nome.localeCompare(b.nome)));
        } else {
          novaTech = existe;
        }
        
        if (!selectedProjectTools.includes(novaTech.nome)) {
          setSelectedProjectTools(prev => [...prev, novaTech.nome]);
        }
        setNewProjectToolInput('');
      } catch (err) {
        console.error('Erro ao criar ferramenta no quick form:', err);
      }
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      await deleteCliente(clientToDelete.id);
      if (selectedCliente?.id === clientToDelete.id) {
        setSelectedCliente(null);
      }
      setClientToDelete(null);
      await loadData();
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
    }
  };

  const gerarParcelasProjeto = async (
    projetoId: string,
    nomeSolucao: string,
    clienteId: string,
    valorProjeto: number,
    parcelas: number,
    formaPagamento: string,
    dataInicio: string
  ) => {
    if (!valorProjeto || valorProjeto <= 0) return;
    
    // Deleta lançamentos antigos de implantação para este projeto
    const antigos = movimentos.filter(m => m.projeto_id === projetoId && m.tipo === 'Entrada única' && m.descricao.startsWith('Implantação -'));
    const deletePromises = antigos.map(m => deleteFinanceiroMovimento(m.id));
    await Promise.all(deletePromises);

    const baseValor = Math.floor((valorProjeto / parcelas) * 100) / 100;
    const diff = Number((valorProjeto - (baseValor * parcelas)).toFixed(2));

    const hoje = new Date();
    const dataInicioDate = dataInicio ? new Date(dataInicio + 'T12:00:00') : new Date();
    const promises = [];

    for (let i = 0; i < parcelas; i++) {
      const dataVenc = new Date(dataInicioDate.getFullYear(), dataInicioDate.getMonth() + i, dataInicioDate.getDate());
      const mesStr = dataVenc.toISOString().slice(0, 7);
      const dataMovStr = dataVenc.toISOString().split('T')[0];

      // A primeira parcela ou parcelas anteriores ao mês atual são 'Confirmado', o resto 'Previsto'
      const hojeStr = hoje.toISOString().slice(0, 7);
      const status = mesStr <= hojeStr ? 'Confirmado' : 'Previsto';

      const valorParcela = i === 0 ? Number((baseValor + diff).toFixed(2)) : baseValor;

      promises.push(createFinanceiroMovimento({
        cliente_id: clienteId,
        projeto_id: projetoId,
        tipo: 'Entrada única',
        descricao: `Implantação - ${nomeSolucao} - Parcela ${i+1}/${parcelas} (${formaPagamento})`,
        valor: valorParcela,
        data_movimento: dataMovStr,
        mes_referencia: mesStr,
        status: status
      }));
    }

    await Promise.all(promises);
  };

  const handleQuickProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) return;
    setQuickProjectErrorMsg(null);
    try {
      // Compilar a stack de ferramentas final a partir dos recursos ativos e adicionais
      const finalTools: string[] = [];
      if (hasDatabase && dbTech) finalTools.push(dbTech);
      if (hasRepository && repoTech) finalTools.push(repoTech);
      if (hasImages && imagesTech) finalTools.push(imagesTech);
      if (hasHosting && hostingTech) finalTools.push(hostingTech);
      
      // Incluir ferramentas dos recursos personalizados
      customResources.forEach(r => {
        if (r.tecnologia) finalTools.push(r.tecnologia);
      });
      
      // Remover duplicatas e valores vazios
      const uniqueTools = Array.from(new Set(finalTools)).filter(Boolean);

      const payload = {
        ...projectForm,
        cliente_id: selectedCliente.id,
        ferramenta_dev: uniqueTools,
        recursos_adicionais: customResources,
        valor_projeto: Number(projectForm.valor_projeto),
        valor_mensal: Number(projectForm.valor_mensal),
        data_inicio: projectForm.data_inicio || null,
        data_entrega_prevista: projectForm.data_entrega_prevista || null,
        
        // Condicionar campos conforme ativação dos recursos
        link_supabase: hasDatabase ? projectForm.link_supabase || null : null,
        user_supabase: hasDatabase ? projectForm.user_supabase || null : null,
        banco_dados: hasDatabase ? dbTech || null : null,
        
        repositorio_url: hasRepository ? projectForm.repositorio_url || null : null,
        user_repositorio: hasRepository ? projectForm.user_repositorio || null : null,
        
        hospedagem_imagens: hasImages ? projectForm.hospedagem_imagens || null : null,
        user_imagens: hasImages ? projectForm.user_imagens || null : null,
        
        hospedagem_geral: hasHosting ? projectForm.hospedagem_geral || null : null,
        user_hospedagem: hasHosting ? projectForm.user_hospedagem || null : null
      };

      delete (payload as any).ferramenta_dev_input;

      const created = await createProjeto(payload);
      
      // Gera lançamentos parcelados se houver valor de implantação
      if (created.valor_projeto && created.valor_projeto > 0) {
        await gerarParcelasProjeto(
          created.id,
          created.nome_solucao,
          selectedCliente.id,
          created.valor_projeto,
          Number(created.parcelas || 1),
          created.forma_pagamento || 'Boleto',
          created.data_inicio || new Date().toISOString().split('T')[0]
        );
      }

      setIsQuickProjectModalOpen(false);
      setProjectForm({
        nome_solucao: '',
        descricao: '',
        status: 'Em desenvolvimento',
        link_acesso: '',
        ferramenta_dev_input: '',
        ferramenta_dev: [],
        banco_dados: '',
        repositorio_url: '',
        hospedagem_imagens: '',
        hospedagem_geral: '',
        link_supabase: '',
        data_inicio: new Date().toISOString().split('T')[0],
        data_entrega_prevista: '',
        valor_projeto: 0,
        valor_mensal: 0,
        observacoes: '',
        user_acesso: '',
        user_supabase: '',
        user_repositorio: '',
        user_imagens: '',
        user_hospedagem: ''
      });
      setSelectedProjectTools([]);
      setNewProjectToolInput('');
      await loadData();
    } catch (err) {
      console.error('Erro ao criar projeto rápido:', err);
      const detailMsg = err && typeof err === 'object' && 'message' in err 
        ? String((err as any).message) 
        : JSON.stringify(err);
      setQuickProjectErrorMsg(`Erro: ${detailMsg}`);
    }
  };

  const filteredClientes = clientes.filter(c => {
    const matchesSearch = c.nome_empresa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.segmento && c.segmento.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.nome_contato_principal && c.nome_contato_principal.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesStatus = statusFilter === 'todos' || c.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const clienteProjetos = selectedCliente
    ? projetos.filter(p => p.cliente_id === selectedCliente.id)
    : [];

  const clienteMovimentos = selectedCliente
    ? movimentos.filter(m => m.cliente_id === selectedCliente.id)
    : [];

  const faturamentoAcumulado = clienteMovimentos
    .filter(m => m.tipo !== 'Saída/custo' && m.status === 'Confirmado')
    .reduce((acc, curr) => acc + Number(curr.valor), 0);

  const contratoAtivo = selectedCliente
    ? contratos.find(c => c.cliente_id === selectedCliente.id && c.status === 'Ativo')
    : null;

  const valorRecorrenteAtivo = contratoAtivo ? Number(contratoAtivo.valor_recorrente) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <Building2 className="text-mtabi-yellow" size={28} />
            CLIENTES
          </h1>
          <p className="text-sm text-mtabi-muted">Gerencie suas contas de consultoria e projetos.</p>
        </div>
        <button
          onClick={openNewClientModal}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-3 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-mtabi-yellow/20 cursor-pointer"
        >
          <Plus size={16} /> ADICIONAR CLIENTE
        </button>
      </div>

      {/* Barra de Busca e Filtros superior de largura total */}
      <div className="bg-mtabi-card border border-mtabi-border p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 text-mtabi-muted" size={16} />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-xs focus:outline-none focus:border-mtabi-yellow transition-colors font-sans text-white placeholder-mtabi-muted"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted">Filtrar Status:</span>
          {['todos', 'Ativo', 'Negociação', 'Pausado', 'Inativo'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-lg transition-colors cursor-pointer border ${
                statusFilter === status
                  ? 'bg-mtabi-yellow text-black border-mtabi-yellow'
                  : 'bg-mtabi-bg text-mtabi-muted border-mtabi-border hover:border-mtabi-muted/50'
              }`}
            >
              {status === 'todos' ? 'TODOS' : status.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Principal de Clientes em Cards */}
      <div className="w-full">
        {loading ? (
          <div className="text-center py-12 text-mtabi-muted text-xs animate-pulse uppercase tracking-wider">
            Buscando clientes...
          </div>
        ) : filteredClientes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
            {filteredClientes.map(c => (
              <div
                key={c.id}
                onClick={() => setSelectedCliente(c)}
                className="p-5 bg-mtabi-card border border-mtabi-border rounded-2xl transition-all hover:border-mtabi-yellow/50 hover:scale-[1.01] cursor-pointer flex items-center gap-4.5 group font-sans relative overflow-hidden text-left"
              >
                {/* Status badge */}
                <span className={`absolute top-3 right-3 text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  c.status === 'Ativo' ? 'bg-emerald-900/30 text-mtabi-success border border-emerald-800/20' :
                  c.status === 'Negociação' ? 'bg-amber-900/30 text-mtabi-yellow border border-amber-800/20' :
                  c.status === 'Pausado' ? 'bg-blue-900/30 text-mtabi-info border border-blue-800/20' :
                  'bg-zinc-800 text-mtabi-muted border border-zinc-700/50'
                }`}>
                  {c.status}
                </span>

                {/* Logo */}
                {c.logo_url ? (
                  <div className="w-20 h-20 rounded-xl bg-[#252830] border border-mtabi-border flex items-center justify-center p-2 shrink-0">
                    <img src={c.logo_url} alt={c.nome_empresa} className="w-full h-full object-contain rounded-lg" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-mtabi-border/35 border border-mtabi-border flex items-center justify-center text-mtabi-yellow font-display font-extrabold text-2xl shrink-0 uppercase select-none">
                    {c.nome_empresa.substring(0, 2)}
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1 pr-12">
                  <h3 className="text-sm font-bold text-white group-hover:text-mtabi-yellow transition-colors truncate">
                    {c.nome_empresa}
                  </h3>
                  <p className="text-[10px] text-mtabi-muted mt-1.5 font-semibold uppercase tracking-wider truncate">
                    {c.segmento || 'Sem Segmento'}
                  </p>
                  <p className="text-[9px] text-mtabi-muted mt-1 uppercase tracking-widest truncate">
                    {c.tipo_relacao}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-mtabi-card border border-mtabi-border rounded-2xl text-mtabi-muted text-xs">
            Nenhum cliente encontrado
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Cliente */}
      {selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl max-w-4xl w-full p-6 space-y-6 relative max-h-[90vh] overflow-y-auto font-sans shadow-2xl">
            {/* Cabeçalho do modal */}
            <div className="flex justify-between items-start border-b border-mtabi-border pb-5 gap-4">
              <div className="flex items-center gap-4 min-w-0">
                {selectedCliente.logo_url ? (
                  <div className="w-16 h-16 rounded-xl bg-[#252830] border border-mtabi-border flex items-center justify-center p-2 shrink-0">
                    <img
                      src={selectedCliente.logo_url}
                      alt={selectedCliente.nome_empresa}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-mtabi-border/30 border border-mtabi-border flex items-center justify-center text-mtabi-yellow font-display font-extrabold text-xl shrink-0 uppercase select-none">
                    {selectedCliente.nome_empresa.substring(0, 2)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-extrabold text-white font-display truncate">
                      {selectedCliente.nome_empresa}
                    </h2>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      selectedCliente.status === 'Ativo' ? 'bg-emerald-900/30 text-mtabi-success' :
                      selectedCliente.status === 'Negociação' ? 'bg-amber-900/30 text-mtabi-yellow' :
                      selectedCliente.status === 'Pausado' ? 'bg-blue-900/30 text-mtabi-info' :
                      'bg-zinc-800 text-mtabi-muted'
                    }`}>
                      {selectedCliente.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-mtabi-muted mt-0.5 uppercase tracking-wider">
                    {selectedCliente.segmento || 'Setor não informado'} • <span className="text-white">{selectedCliente.tipo_relacao}</span>
                  </p>
                </div>
              </div>

              {/* Ações: Editar, Excluir, Fechar — todos no mesmo row */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => openEditClientModal(selectedCliente)}
                  className="p-2 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white hover:text-mtabi-yellow rounded-xl transition-all cursor-pointer"
                  title="Editar"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => setClientToDelete(selectedCliente)}
                  className="p-2 bg-mtabi-bg hover:bg-mtabi-error/10 border border-mtabi-border text-white hover:text-mtabi-error rounded-xl transition-all cursor-pointer"
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
                <div className="w-px h-6 bg-mtabi-border mx-0.5" />
                <button
                  onClick={() => setSelectedCliente(null)}
                  className="p-2 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-mtabi-muted hover:text-white rounded-xl transition-all cursor-pointer"
                  title="Fechar"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-mtabi-bg border border-mtabi-border p-4 rounded-xl space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted">Contatos principais</h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <User size={12} className="text-mtabi-yellow" />
                      <span className="text-mtabi-muted">Decisor:</span>
                      <span className="text-white font-medium">{selectedCliente.nome_contato_principal || 'Não informado'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Phone size={12} className="text-mtabi-yellow" />
                      <span className="text-mtabi-muted">Campeão Interno:</span>
                      <span className="text-white font-medium">{selectedCliente.nome_contato_interno || 'Não informado'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-mtabi-bg border border-mtabi-border p-4 rounded-xl">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">Resumo financeiro</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] text-mtabi-muted block uppercase tracking-wider">Faturado Total</span>
                      <span className="text-sm font-bold text-white">
                        {faturamentoAcumulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-mtabi-muted block uppercase tracking-wider">Recorrência Ativa</span>
                      <span className="text-sm font-bold text-mtabi-yellow">
                        {valorRecorrenteAtivo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                      </span>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-mtabi-border/60 flex justify-between items-center">
                    <span className="text-[9px] text-mtabi-muted">Fluxo de faturamento recorrente</span>
                    <button
                      type="button"
                      onClick={() => openProjectionModal(selectedCliente)}
                      className="px-3 py-1 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                    >
                      Projeção
                    </button>
                  </div>
                </div>
              </div>

                {/* CONTRATOS DO CLIENTE */}
                <div className="bg-mtabi-bg/40 border border-mtabi-border p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center border-b border-mtabi-border/60 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted flex items-center gap-1.5">
                      <FileText size={12} className="text-mtabi-yellow" /> Contratos de Consultoria
                    </span>
                    <button
                      type="button"
                      onClick={() => openNewContractModal(selectedCliente.id)}
                      className="flex items-center gap-1 text-[9px] font-bold text-mtabi-yellow uppercase tracking-wider hover:underline cursor-pointer"
                    >
                      <Plus size={10} /> Novo Contrato
                    </button>
                  </div>

                  {/* Lista de Contratos */}
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {contratos.filter(c => c.cliente_id === selectedCliente.id).length === 0 ? (
                      <p className="text-[11px] text-mtabi-muted italic py-1">Nenhum contrato cadastrado.</p>
                    ) : (
                      contratos
                        .filter(c => c.cliente_id === selectedCliente.id)
                        .map(c => {
                          const isAtivo = c.status === 'Ativo';
                          return (
                            <div
                              key={c.id}
                              className={`p-3 rounded-lg border text-xs flex justify-between items-center transition-all ${
                                isAtivo
                                  ? 'border-mtabi-yellow/60 bg-mtabi-yellow/[0.02] shadow-sm shadow-mtabi-yellow/5'
                                  : 'border-mtabi-border bg-mtabi-bg/30 text-mtabi-muted'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                                    isAtivo ? 'bg-emerald-950 text-mtabi-success' :
                                    c.status === 'Histórico' ? 'bg-zinc-800 text-mtabi-muted' :
                                    'bg-red-950 text-mtabi-error'
                                  }`}>
                                    {c.status}
                                  </span>
                                  <span className="font-bold text-white font-mono">
                                    {Number(c.valor_recorrente).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                                  </span>
                                </div>
                                <div className="text-[10px] text-mtabi-muted">
                                  <span>Início: {c.data_inicio ? formatDateBR(c.data_inicio) : 'N/D'}</span>
                                  {c.data_fim && (
                                    <span className="ml-2.5 font-bold text-mtabi-error">Término: {formatDateBR(c.data_fim)}</span>
                                  )}
                                </div>
                                {c.observacoes && (
                                  <p className="text-[9px] text-mtabi-muted italic max-w-md truncate">{c.observacoes}</p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {c.link_contrato && (
                                  <a
                                    href={c.link_contrato.startsWith('http') ? c.link_contrato : `https://${c.link_contrato}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 bg-mtabi-bg/60 hover:bg-mtabi-border text-mtabi-yellow rounded-lg transition-colors border border-mtabi-border"
                                    title="Visualizar Contrato"
                                  >
                                    <ArrowUpRight size={12} />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openEditContractModal(c)}
                                  className="p-1.5 bg-mtabi-bg/60 hover:bg-mtabi-border text-white hover:text-mtabi-yellow rounded-lg transition-colors border border-mtabi-border cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteContract(c.id)}
                                  className="p-1.5 bg-mtabi-bg/60 hover:bg-mtabi-error/10 text-white hover:text-mtabi-error rounded-lg transition-colors border border-mtabi-border cursor-pointer"
                                  title="Excluir"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

              {selectedCliente.observacoes && (
                <div className="bg-mtabi-bg/40 border border-mtabi-border p-4 rounded-xl">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1">Observações / Anotações</h4>
                  <p className="text-xs text-mtabi-text leading-relaxed whitespace-pre-wrap">{selectedCliente.observacoes}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-mtabi-border pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white">Projetos & Soluções ({clienteProjetos.length})</h3>
                  <button
                    onClick={openQuickProjectModal}
                    className="flex items-center gap-1 text-[10px] font-bold text-mtabi-yellow uppercase tracking-wider hover:underline cursor-pointer"
                  >
                    <Plus size={12} /> Novo Projeto
                  </button>
                </div>

                {clienteProjetos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {clienteProjetos.map(proj => (
                      <div
                        key={proj.id}
                        onClick={() => onNavigateToProject && onNavigateToProject(proj.id)}
                        className="p-4 bg-mtabi-bg hover:bg-mtabi-border/30 border border-mtabi-border rounded-xl cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider truncate">{proj.nome_solucao}</h4>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              proj.status === 'Em produção' ? 'bg-emerald-950 text-mtabi-success' :
                              proj.status === 'Em desenvolvimento' ? 'bg-blue-950 text-mtabi-info' :
                              proj.status === 'Manutenção' ? 'bg-purple-950 text-purple-400' :
                              'bg-zinc-800 text-mtabi-muted'
                            }`}>
                              {proj.status}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-mtabi-border/50 text-[9px] text-mtabi-muted font-mono">
                          <span>Início: {proj.data_inicio ? formatDateBR(proj.data_inicio) : 'N/D'}</span>
                          {proj.valor_mensal ? (
                            <span className="text-mtabi-yellow font-bold">R$ {Number(proj.valor_mensal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mês</span>
                          ) : proj.valor_projeto ? (
                            <span className="text-white font-bold">R$ {Number(proj.valor_projeto).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-mtabi-bg/20 border border-dashed border-mtabi-border rounded-xl text-mtabi-muted text-xs">
                    Nenhum projeto cadastrado.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white border-b border-mtabi-border pb-2">
                  Histórico de Faturamento
                </h3>
                {clienteMovimentos.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-sans">
                      <thead>
                        <tr className="border-b border-mtabi-border text-mtabi-muted text-[10px] uppercase tracking-wider">
                          <th className="py-2">Data</th>
                          <th className="py-2">Descrição</th>
                          <th className="py-2">Tipo</th>
                          <th className="py-2">Valor</th>
                          <th className="py-2">NF</th>
                          <th className="py-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-mtabi-border/40">
                        {clienteMovimentos.map(mov => (
                          <tr key={mov.id} className="hover:bg-mtabi-border/10 text-white">
                            <td className="py-2.5 font-mono">{formatDateBR(mov.data_movimento)}</td>
                            <td className="py-2.5 max-w-[200px] truncate">{mov.descricao}</td>
                            <td className="py-2.5 text-mtabi-muted text-[10px] uppercase tracking-wider">{mov.tipo}</td>
                            <td className={`py-2.5 font-bold ${mov.tipo === 'Saída/custo' ? 'text-mtabi-error' : 'text-mtabi-success'}`}>
                              {mov.tipo === 'Saída/custo' ? '-' : '+'} R$ {Number(mov.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5">
                              <div className="flex items-center gap-1">
                                <span className={`text-[8px] font-bold px-1 py-0.5 rounded uppercase tracking-wider ${
                                  mov.nf_emitida 
                                    ? 'bg-emerald-900/30 text-mtabi-success border border-emerald-800/20' 
                                    : 'bg-zinc-800 text-mtabi-muted border border-zinc-700/50'
                                }`}>
                                  {mov.nf_emitida ? 'Emitida' : 'Pendente'}
                                </span>
                                
                                {mov.nf_url && (
                                  <a
                                    href={mov.nf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-0.5 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border/60 text-mtabi-yellow hover:text-white rounded transition-colors cursor-pointer"
                                    title="Ver NF"
                                  >
                                    <FileText size={11} />
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 text-right">
                              <select
                                value={mov.status}
                                onChange={async (e) => {
                                  try {
                                    setLoading(true);
                                    await updateFinanceiroMovimento(mov.id, {
                                      status: e.target.value as any
                                    });
                                    await loadData();
                                    showToast('Status do faturamento atualizado!');
                                  } catch (err) {
                                    console.error(err);
                                    showToast('Erro ao atualizar status.', 'error');
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded bg-mtabi-bg border cursor-pointer uppercase transition-colors outline-none ${
                                  mov.status === 'Confirmado' ? 'border-mtabi-success/40 text-mtabi-success bg-emerald-950/30' :
                                  mov.status === 'Previsto' ? 'border-mtabi-muted/40 text-mtabi-muted bg-zinc-800/40' :
                                  mov.status === 'Atrasado' ? 'border-mtabi-error/40 text-mtabi-error bg-red-950/30' :
                                  'border-zinc-800 text-zinc-600 bg-zinc-900/40'
                                }`}
                              >
                                <option value="Confirmado" className="bg-mtabi-card text-mtabi-success font-bold text-[9px]">PAGO</option>
                                <option value="Atrasado" className="bg-mtabi-card text-mtabi-error font-bold text-[9px]">PENDENTE</option>
                                <option value="Previsto" className="bg-mtabi-card text-mtabi-muted font-bold text-[9px]">PROJETADO</option>
                                <option value="Cancelado" className="bg-mtabi-card text-zinc-600 font-bold text-[9px]">CANCELADO</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-mtabi-bg/20 border border-dashed border-mtabi-border rounded-xl text-mtabi-muted text-xs">
                    Nenhum movimento financeiro lançado.
                  </div>
                )}
              </div>

          </div>
        </div>
      )}

      {isClientModalOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-sans">
            <div className="flex justify-between items-center p-5 border-b border-mtabi-border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                {editingCliente ? 'EDITAR CLIENTE' : 'NOVO CLIENTE'}
              </h3>
              <button onClick={() => setIsClientModalOpen(false)} className="text-mtabi-muted hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleClientSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-xs flex items-center gap-2 font-semibold font-sans">
                  <AlertTriangle size={16} className="text-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              
              <div className="mb-4 bg-mtabi-bg/30 p-3 rounded-xl border border-mtabi-border/60">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-2.5">
                  Logotipo do Cliente
                </label>
                <div className="flex items-center gap-4">
                  {clientForm.logo_url ? (
                    <div className="relative w-16 h-16 rounded-xl bg-[#252830] border border-mtabi-border flex items-center justify-center p-1 shrink-0 overflow-hidden group">
                      <img 
                        src={clientForm.logo_url} 
                        alt="Logotipo Preview" 
                        className="w-full h-full object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setClientForm({ ...clientForm, logo_url: '' })}
                        className="absolute inset-0 bg-black/75 flex items-center justify-center text-mtabi-error opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold font-display"
                      >
                        REMOVER
                      </button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-xl border border-dashed border-mtabi-border hover:border-mtabi-yellow flex flex-col items-center justify-center text-mtabi-muted hover:text-mtabi-yellow transition-all cursor-pointer shrink-0">
                      <Upload size={18} />
                      <span className="text-[8px] font-bold uppercase mt-1">Anexar</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoChange} 
                        className="hidden" 
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-2">
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: MTABI Tech"
                    value={clientForm.nome_empresa}
                    onChange={(e) => setClientForm({ ...clientForm, nome_empresa: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-2">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={clientForm.cnpj}
                    onChange={(e) => setClientForm({ ...clientForm, cnpj: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-2">
                    Contato Principal
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Maurício Tabi"
                    value={clientForm.nome_contato_principal}
                    onChange={(e) => setClientForm({ ...clientForm, nome_contato_principal: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-2">
                    Contato Interno
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: João Campeão"
                    value={clientForm.nome_contato_interno}
                    onChange={(e) => setClientForm({ ...clientForm, nome_contato_interno: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-2">
                    Segmento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Tecnologia"
                    value={clientForm.segmento}
                    onChange={(e) => setClientForm({ ...clientForm, segmento: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-2">
                    Tipo de Relação *
                  </label>
                  <select
                    value={clientForm.tipo_relacao}
                    onChange={(e) => setClientForm({ ...clientForm, tipo_relacao: e.target.value as any })}
                    className="w-full px-3 py-2.5 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                  >
                    <option value="Projeto único">Projeto único</option>
                    <option value="Consultoria recorrente">Consultoria recorrente</option>
                    <option value="Ambos">Ambos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-2">
                  Status da Conta *
                </label>
                <select
                  value={clientForm.status}
                  onChange={(e) => setClientForm({ ...clientForm, status: e.target.value as any })}
                  className="w-full px-3 py-2.5 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                >
                  <option value="Negociação">Negociação</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Pausado">Pausado</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>





              <div className="flex gap-3 pt-3 border-t border-mtabi-border">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="w-1/2 py-2.5 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
                >
                  {editingCliente ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCropModalOpen && tempLogoSrc && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-sans">
            <div className="flex justify-between items-center p-5 border-b border-mtabi-border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Ajustar Enquadramento
              </h3>
              <button 
                onClick={() => { setIsCropModalOpen(false); setTempLogoSrc(null); }} 
                className="text-mtabi-muted hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div 
                className="w-64 h-64 mx-auto rounded-2xl border-2 border-mtabi-yellow relative overflow-hidden bg-[#13151A] cursor-move select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUpOrLeave}
              >
                <img
                  src={tempLogoSrc}
                  alt="Logo Preview"
                  className="absolute pointer-events-none select-none"
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    left: '0',
                    top: '0',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              </div>
              <input
                type="range"
                min="1"
                max="4"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-mtabi-border rounded-lg appearance-none cursor-pointer accent-mtabi-yellow"
              />
              <div className="flex gap-3">
                <button onClick={() => { setIsCropModalOpen(false); setTempLogoSrc(null); }} className="w-1/2 py-2.5 bg-mtabi-bg border border-mtabi-border text-white text-xs font-bold uppercase rounded-xl cursor-pointer">Cancelar</button>
                <button onClick={handleConfirmCrop} className="w-1/2 py-2.5 bg-mtabi-yellow text-black text-xs font-bold uppercase rounded-xl cursor-pointer">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isQuickProjectModalOpen && selectedCliente && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden font-sans">
            <div className="flex justify-between items-center p-5 border-b border-mtabi-border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                NOVO PROJETO PARA {selectedCliente.nome_empresa.toUpperCase()}
              </h3>
              <button onClick={() => setIsQuickProjectModalOpen(false)} className="text-mtabi-muted hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleQuickProjectSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickProjectErrorMsg && (
                <div className="sm:col-span-2 p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-xs flex items-center gap-2 font-semibold font-sans">
                  <AlertTriangle size={16} className="text-red-400 shrink-0" />
                  {quickProjectErrorMsg}
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">Nome da Solução *</label>
                <input
                  type="text"
                  required
                  value={projectForm.nome_solucao}
                  onChange={(e) => setProjectForm({ ...projectForm, nome_solucao: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">Status</label>
                <select
                  value={projectForm.status}
                  onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                >
                  <option value="Em negociação">Em negociação</option>
                  <option value="Em desenvolvimento">Em desenvolvimento</option>
                  <option value="Em produção">Em produção</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Pausado">Pausado</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted">Link de Acesso Web</label>
                <input
                  type="url"
                  placeholder="https://app.cliente.com"
                  value={projectForm.link_acesso}
                  onChange={(e) => setProjectForm({ ...projectForm, link_acesso: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                />
                <input
                  type="text"
                  placeholder="Usuário de acesso (Login/E-mail)"
                  value={projectForm.user_acesso}
                  onChange={(e) => setProjectForm({ ...projectForm, user_acesso: e.target.value })}
                  className="w-full px-3 py-1 bg-mtabi-bg/40 border border-mtabi-border/40 rounded-lg text-xs focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans placeholder-mtabi-muted/50"
                />
              </div>

              {/* Seção Recursos do Sistema e Credenciais */}
              <div className="sm:col-span-2 border-t border-mtabi-border/60 pt-4 space-y-4 font-sans">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-mtabi-yellow block">
                    Recursos do Sistema (Links e Acessos)
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* RECURSO: Banco de Dados */}
                  <div className="bg-mtabi-bg/40 border border-mtabi-border/60 p-3.5 rounded-xl space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={hasDatabase}
                        onChange={(e) => {
                          setHasDatabase(e.target.checked);
                          if (!e.target.checked) {
                            setDbTech('');
                          } else {
                            setDbTech('Supabase'); // padrão
                          }
                        }}
                        className="rounded border-mtabi-border text-mtabi-yellow focus:ring-0 focus:ring-offset-0 cursor-pointer bg-mtabi-bg"
                      />
                      Banco de Dados
                    </label>

                    {hasDatabase && (
                      <div className="space-y-2 pt-1 animate-fadeIn">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-mtabi-muted">Tecnologia</label>
                          <select
                            value={dbTech}
                            onChange={(e) => setDbTech(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-lg text-xs text-white focus:outline-none"
                          >
                            <option value="">Selecione...</option>
                            {tecnologias.map(t => (
                              <option key={t.id} value={t.nome}>{t.nome}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-mtabi-muted">Link do Banco / Painel</label>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={projectForm.link_supabase || ''}
                            onChange={(e) => setProjectForm({ ...projectForm, link_supabase: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-lg text-xs text-white focus:outline-none focus:border-mtabi-yellow"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-mtabi-muted">Usuário de Acesso</label>
                          <input
                            type="text"
                            placeholder="Login / E-mail"
                            value={projectForm.user_supabase || ''}
                            onChange={(e) => setProjectForm({ ...projectForm, user_supabase: e.target.value })}
                            className="w-full px-2.5 py-1 bg-mtabi-bg/40 border border-mtabi-border/40 rounded-md text-[11px] text-white focus:outline-none placeholder-mtabi-muted/50"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RECURSO: Repositório de Código */}
                  <div className="bg-mtabi-bg/40 border border-mtabi-border/60 p-3.5 rounded-xl space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={hasRepository}
                        onChange={(e) => {
                          setHasRepository(e.target.checked);
                          if (!e.target.checked) {
                            setRepoTech('');
                          } else {
                            setRepoTech('GitHub'); // padrão
                          }
                        }}
                        className="rounded border-mtabi-border text-mtabi-yellow focus:ring-0 focus:ring-offset-0 cursor-pointer bg-mtabi-bg"
                      />
                      Repositório Git
                    </label>

                    {hasRepository && (
                      <div className="space-y-2 pt-1 animate-fadeIn">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-mtabi-muted">Tecnologia</label>
                          <select
                            value={repoTech}
                            onChange={(e) => setRepoTech(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-lg text-xs text-white focus:outline-none"
                          >
                            <option value="">Selecione...</option>
                            {tecnologias.map(t => (
                              <option key={t.id} value={t.nome}>{t.nome}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-mtabi-muted">URL do Repositório</label>
                          <input
                            type="url"
                            placeholder="https://github.com/..."
                            value={projectForm.repositorio_url || ''}
                            onChange={(e) => setProjectForm({ ...projectForm, repositorio_url: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-lg text-xs text-white focus:outline-none focus:border-mtabi-yellow"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-mtabi-muted">Usuário de Acesso</label>
                          <input
                            type="text"
                            placeholder="Usuário / E-mail"
                            value={projectForm.user_repositorio || ''}
                            onChange={(e) => setProjectForm({ ...projectForm, user_repositorio: e.target.value })}
                            className="w-full px-2.5 py-1 bg-mtabi-bg/40 border border-mtabi-border/40 rounded-md text-[11px] text-white focus:outline-none placeholder-mtabi-muted/50"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RECURSO: Banco de Imagens (Storage) */}
                  <div className="bg-mtabi-bg/40 border border-mtabi-border/60 p-3.5 rounded-xl space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={hasImages}
                        onChange={(e) => {
                          setHasImages(e.target.checked);
                          if (!e.target.checked) {
                            setImagesTech('');
                          } else {
                            setImagesTech('Cloudinary'); // padrão
                          }
                        }}
                        className="rounded border-mtabi-border text-mtabi-yellow focus:ring-0 focus:ring-offset-0 cursor-pointer bg-mtabi-bg"
                      />
                      Banco de Imagens (Storage)
                    </label>

                    {hasImages && (
                      <div className="space-y-2 pt-1 animate-fadeIn">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-mtabi-muted">Tecnologia</label>
                          <select
                            value={imagesTech}
                            onChange={(e) => setImagesTech(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-lg text-xs text-white focus:outline-none"
                          >
                            <option value="">Selecione...</option>
                            {tecnologias.map(t => (
                              <option key={t.id} value={t.nome}>{t.nome}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-mtabi-muted">Link do Storage</label>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={projectForm.hospedagem_imagens || ''}
                            onChange={(e) => setProjectForm({ ...projectForm, hospedagem_imagens: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-lg text-xs text-white focus:outline-none focus:border-mtabi-yellow"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-mtabi-muted">Usuário de Acesso</label>
                          <input
                            type="text"
                            placeholder="Login / E-mail"
                            value={projectForm.user_imagens || ''}
                            onChange={(e) => setProjectForm({ ...projectForm, user_imagens: e.target.value })}
                            className="w-full px-2.5 py-1 bg-mtabi-bg/40 border border-mtabi-border/40 rounded-md text-[11px] text-white focus:outline-none placeholder-mtabi-muted/50"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RECURSO: Hospedagem do Sistema */}
                  <div className="bg-mtabi-bg/40 border border-mtabi-border/60 p-3.5 rounded-xl space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={hasHosting}
                        onChange={(e) => {
                          setHasHosting(e.target.checked);
                          if (!e.target.checked) {
                            setHostingTech('');
                          } else {
                            setHostingTech('Vercel'); // padrão
                          }
                        }}
                        className="rounded border-mtabi-border text-mtabi-yellow focus:ring-0 focus:ring-offset-0 cursor-pointer bg-mtabi-bg"
                      />
                      Hospedagem Geral
                    </label>

                    {hasHosting && (
                      <div className="space-y-2 pt-1 animate-fadeIn">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-mtabi-muted">Tecnologia</label>
                          <select
                            value={hostingTech}
                            onChange={(e) => setHostingTech(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-lg text-xs text-white focus:outline-none"
                          >
                            <option value="">Selecione...</option>
                            {tecnologias.map(t => (
                              <option key={t.id} value={t.nome}>{t.nome}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-mtabi-muted">Link da Hospedagem</label>
                          <input
                            type="text"
                            placeholder="https://..."
                            value={projectForm.hospedagem_geral || ''}
                            onChange={(e) => setProjectForm({ ...projectForm, hospedagem_geral: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-lg text-xs text-white focus:outline-none focus:border-mtabi-yellow"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-mtabi-muted">Usuário de Acesso</label>
                          <input
                            type="text"
                            placeholder="Login / E-mail"
                            value={projectForm.user_hospedagem || ''}
                            onChange={(e) => setProjectForm({ ...projectForm, user_hospedagem: e.target.value })}
                            className="w-full px-2.5 py-1 bg-mtabi-bg/40 border border-mtabi-border/40 rounded-md text-[11px] text-white focus:outline-none placeholder-mtabi-muted/50"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recursos Adicionais Dinâmicos */}
                  {customResources.map((res, index) => (
                    <div key={index} className="bg-mtabi-bg/40 border border-mtabi-border/60 p-3.5 rounded-xl space-y-3 relative group/res animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          placeholder="Nome do Recurso (Ex: API de E-mail)"
                          value={res.tipo}
                          onChange={(e) => {
                            const updated = [...customResources];
                            updated[index].tipo = e.target.value;
                            setCustomResources(updated);
                          }}
                          className="bg-transparent border-b border-mtabi-border/40 focus:border-mtabi-yellow text-xs font-bold text-white py-0.5 px-1 focus:outline-none w-2/3"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCustomResources(prev => prev.filter((_, idx) => idx !== index));
                          }}
                          className="p-1 hover:text-mtabi-error text-mtabi-muted transition-colors cursor-pointer"
                          title="Remover este recurso"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="space-y-2 pt-1">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-mtabi-muted">Tecnologia</label>
                          <select
                            value={res.tecnologia}
                            onChange={(e) => {
                              const updated = [...customResources];
                              updated[index].tecnologia = e.target.value;
                              setCustomResources(updated);
                            }}
                            className="w-full px-2.5 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-lg text-xs text-white focus:outline-none"
                          >
                            <option value="">Selecione...</option>
                            {tecnologias.map(t => (
                              <option key={t.id} value={t.nome}>{t.nome}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-mtabi-muted">Link do Recurso / Painel</label>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={res.link_acesso}
                            onChange={(e) => {
                              const updated = [...customResources];
                              updated[index].link_acesso = e.target.value;
                              setCustomResources(updated);
                            }}
                            className="w-full px-2.5 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-lg text-xs text-white focus:outline-none focus:border-mtabi-yellow"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-mtabi-muted">Usuário de Acesso</label>
                          <input
                            type="text"
                            placeholder="Login / E-mail"
                            value={res.usuario_acesso}
                            onChange={(e) => {
                              const updated = [...customResources];
                              updated[index].usuario_acesso = e.target.value;
                              setCustomResources(updated);
                            }}
                            className="w-full px-2.5 py-1 bg-mtabi-bg/40 border border-mtabi-border/40 rounded-md text-[11px] text-white focus:outline-none placeholder-mtabi-muted/50"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t border-mtabi-border/40">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomResources(prev => [
                        ...prev,
                        { tipo: '', tecnologia: '', link_acesso: '', usuario_acesso: '' }
                      ]);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all border border-zinc-700 cursor-pointer"
                  >
                    <Plus size={12} /> Adicionar Recurso Customizado
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setIsTechManagerOpen(true)}
                    className="text-[9px] font-bold text-mtabi-yellow hover:text-mtabi-yellow/80 cursor-pointer uppercase tracking-wider transition-colors"
                  >
                    Gerenciar Tecnologias
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Data de Início
                </label>
                <input
                  type="date"
                  value={projectForm.data_inicio}
                  onChange={(e) => setProjectForm({ ...projectForm, data_inicio: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Previsão de Entrega
                </label>
                <input
                  type="date"
                  value={projectForm.data_entrega_prevista}
                  onChange={(e) => setProjectForm({ ...projectForm, data_entrega_prevista: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                />
              </div>

              <div className="sm:col-span-2 bg-mtabi-yellow/5 border border-mtabi-yellow/20 rounded-xl px-3 py-2 text-[10px] text-mtabi-yellow flex items-start gap-2">
                <span className="mt-0.5 shrink-0">💡</span>
                <span>Valor de implantação, forma e condições de pagamento são definidos no <strong>Contrato</strong> do cliente.</span>
              </div>

              <div className="sm:col-span-2 flex gap-3 pt-3 border-t border-mtabi-border">
                <button
                  type="button"
                  onClick={() => setIsQuickProjectModalOpen(false)}
                  className="w-1/2 py-2.5 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  CADASTRAR PROJETO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE PROJEÇÃO FINANCEIRA */}
      {isProjectionModalOpen && selectedCliente && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden font-sans">
            
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-mtabi-border bg-mtabi-bg/40">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Projeção Financeira
                </h3>
                <p className="text-[10px] text-mtabi-muted mt-0.5 uppercase tracking-wider">
                  Cliente: <span className="text-mtabi-yellow font-bold">{selectedCliente.nome_empresa}</span>
                </p>
              </div>
              <button 
                onClick={() => setIsProjectionModalOpen(false)} 
                className="text-mtabi-muted hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Content Container */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              
              {/* Seção Regras em Lote */}
              <div className="bg-mtabi-bg/50 border border-mtabi-border p-4 rounded-xl space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-mtabi-yellow block">
                  Configuração Rápida em Lote (Meses Futuros)
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[9px] text-mtabi-muted uppercase tracking-wider block">Regra 1: Próximos meses</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        placeholder="Meses"
                        value={loteMeses1 || ''}
                        onChange={(e) => setLoteMeses1(Number(e.target.value))}
                        className="w-20 px-2 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-lg text-white text-center font-mono"
                      />
                      <span className="text-mtabi-muted text-[10px]">meses a R$</span>
                      <input
                        type="number"
                        placeholder="Valor"
                        value={loteValor1 || ''}
                        onChange={(e) => setLoteValor1(Number(e.target.value))}
                        className="flex-1 px-3 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-mtabi-muted uppercase tracking-wider block">Regra 2: Seguintes meses</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        placeholder="Meses"
                        value={loteMeses2 || ''}
                        onChange={(e) => setLoteMeses2(Number(e.target.value))}
                        className="w-20 px-2 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-lg text-white text-center font-mono"
                      />
                      <span className="text-mtabi-muted text-[10px]">meses a R$</span>
                      <input
                        type="number"
                        placeholder="Valor"
                        value={loteValor2 || ''}
                        onChange={(e) => setLoteValor2(Number(e.target.value))}
                        className="flex-1 px-3 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={aplicarRegrasLote}
                    className="px-4 py-2 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                  >
                    Aplicar na Grade Abaixo
                  </button>
                </div>
              </div>

              {/* Tabela/Grade de Meses */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted block mb-1">
                  Grade Mensal de Lançamentos (6 meses atrás até 12 meses à frente)
                </span>
                
                <div className="border border-mtabi-border rounded-xl overflow-hidden bg-mtabi-bg/25">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-2 bg-mtabi-bg/60 border-b border-mtabi-border p-2 text-[9px] font-bold uppercase tracking-wider text-mtabi-muted text-center">
                    <div className="col-span-3 text-left pl-2">Mês / Ano</div>
                    <div className="col-span-4">Valor Mensal (R$)</div>
                    <div className="col-span-4">Status de Lançamento</div>
                    <div className="col-span-1">Zerar</div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-mtabi-border max-h-[30vh] overflow-y-auto">
                    {projectionMonths.map((item, idx) => {
                      const hojeStr = new Date().toISOString().slice(0, 7);
                      const isCurrentMonth = item.mesRef === hojeStr;
                      
                      return (
                        <div 
                          key={item.mesRef} 
                          className={`grid grid-cols-12 gap-2 items-center p-2 text-xs text-center transition-colors ${
                            isCurrentMonth ? 'bg-mtabi-yellow/5' : 'hover:bg-mtabi-border/10'
                          }`}
                        >
                          <div className="col-span-3 text-left pl-2 font-mono font-bold text-white flex items-center gap-1.5">
                            {item.label}
                            {isCurrentMonth && (
                              <span className="text-[8px] bg-mtabi-yellow/20 text-mtabi-yellow px-1 py-0.2 rounded font-sans uppercase">Hoje</span>
                            )}
                          </div>
                          <div className="col-span-4">
                            <input
                              type="number"
                              placeholder="0"
                              value={item.valor || ''}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const updated = [...projectionMonths];
                                updated[idx].valor = val;
                                setProjectionMonths(updated);
                              }}
                              className="w-full px-2.5 py-1 bg-mtabi-bg border border-mtabi-border rounded-lg text-white font-mono text-center text-xs"
                            />
                          </div>
                          <div className="col-span-4">
                            <select
                              value={item.status}
                              onChange={(e) => {
                                const stat = e.target.value as any;
                                const updated = [...projectionMonths];
                                updated[idx].status = stat;
                                setProjectionMonths(updated);
                              }}
                              className="w-full px-2 py-1 bg-mtabi-bg border border-mtabi-border rounded-lg text-white font-sans text-center text-xs"
                            >
                              <option value="Previsto">Previsto</option>
                              <option value="Confirmado">Confirmado</option>
                              <option value="Atrasado">Atrasado</option>
                              <option value="Cancelado">Cancelado</option>
                            </select>
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...projectionMonths];
                                updated[idx].valor = 0;
                                setProjectionMonths(updated);
                              }}
                              className="text-mtabi-muted hover:text-mtabi-error p-1 transition-colors cursor-pointer"
                              title="Limpar valor"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-mtabi-border bg-mtabi-bg/40">
              <button
                type="button"
                onClick={() => setIsProjectionModalOpen(false)}
                className="w-1/2 py-2.5 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={handleSaveProjection}
                className="w-1/2 py-2.5 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
              >
                SALVAR PROJEÇÃO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CADASTRAR/EDITAR CONTRATO */}
      {isContractModalOpen && selectedCliente && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl w-full max-w-lg shadow-2xl p-6 font-sans">
            <div className="flex justify-between items-center pb-4 border-b border-mtabi-border mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                {editingContrato ? 'Editar Contrato' : 'Novo Contrato de Consultoria'}
              </h3>
              <button 
                onClick={() => setIsContractModalOpen(false)}
                className="text-mtabi-muted hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleContractSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Valor Recorrente Mensal (R$) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 8000"
                  value={contractForm.valor_recorrente || ''}
                  onChange={(e) => setContractForm({ ...contractForm, valor_recorrente: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                />
              </div>

              {/* Separador - Recorrência */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Dia de Pagamento (1-31) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={31}
                    placeholder="Ex: 10"
                    value={contractForm.dia_pagamento || ''}
                    onChange={(e) => setContractForm({ ...contractForm, dia_pagamento: Math.min(31, Math.max(1, Number(e.target.value))) })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                  />
                  <p className="text-[9px] text-mtabi-muted mt-1">Dia do mês em que o pagamento mensal vence</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Link do Contrato (PDF / Drive)
                  </label>
                  <input
                    type="text"
                    placeholder="https://drive.google.com/..."
                    value={contractForm.link_contrato}
                    onChange={(e) => setContractForm({ ...contractForm, link_contrato: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                  />
                </div>
              </div>

              {/* Separador - Implantação */}
              <div className="border-t border-mtabi-border/50 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-3 flex items-center gap-1.5">
                  <span className="w-1 h-3 bg-mtabi-yellow/50 rounded-full" />
                  Implantação / Desenvolvimento (pagamento único)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                      Valor (R$)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0"
                      value={contractForm.valor_implantacao || ''}
                      onChange={(e) => setContractForm({ ...contractForm, valor_implantacao: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                      Forma de Pagamento
                    </label>
                    <select
                      value={contractForm.forma_pagamento}
                      onChange={(e) => setContractForm({ ...contractForm, forma_pagamento: e.target.value })}
                      className="w-full px-3 py-2.5 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                    >
                      <option value="PIX">PIX</option>
                      <option value="TED">TED</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Boleto">Boleto</option>
                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                      <option value="Débito">Débito</option>
                    </select>
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                      Nº de Parcelas
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={48}
                      value={contractForm.parcelas || 1}
                      onChange={(e) => setContractForm({ ...contractForm, parcelas: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                    />
                    {contractForm.forma_pagamento !== 'Boleto' && contractForm.parcelas > 1 && (
                      <p className="text-[9px] text-mtabi-yellow mt-1">⚠ Parcelamento disponível apenas no Boleto</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Data de Início *
                  </label>
                  <input
                    type="date"
                    required
                    value={contractForm.data_inicio}
                    onChange={(e) => setContractForm({ ...contractForm, data_inicio: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Data de Término / Encerramento
                  </label>
                  <input
                    type="date"
                    value={contractForm.data_fim}
                    onChange={(e) => setContractForm({ ...contractForm, data_fim: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Status do Contrato *
                </label>
                <select
                  value={contractForm.status}
                  onChange={(e) => setContractForm({ ...contractForm, status: e.target.value as any })}
                  className="w-full px-3 py-2.5 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                >
                  <option value="Ativo">Ativo (Destacado)</option>
                  <option value="Histórico">Histórico (Arquivado)</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <div className="border border-mtabi-border/60 p-3 rounded-xl bg-mtabi-bg/10 space-y-2">
                <span className="text-[10px] font-bold text-mtabi-yellow uppercase tracking-wider block">
                  Reajuste Programado / Automático (Opcional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-mtabi-muted mb-1">
                      Novo Valor Recorrente (R$)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={contractForm.reajuste_valor || ''}
                      onChange={(e) => setContractForm({ ...contractForm, reajuste_valor: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-lg text-xs focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-mtabi-muted mb-1">
                      A partir do mês/dia
                    </label>
                    <input
                      type="date"
                      value={contractForm.reajuste_data || ''}
                      onChange={(e) => setContractForm({ ...contractForm, reajuste_data: e.target.value })}
                      className="w-full px-3 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-lg text-xs focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Observações adicionais
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Reajuste automático após 6 meses..."
                  value={contractForm.observacoes}
                  onChange={(e) => setContractForm({ ...contractForm, observacoes: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-xs focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-mtabi-border">
                <button
                  type="button"
                  onClick={() => setIsContractModalOpen(false)}
                  className="w-1/2 py-2.5 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  SALVAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      {clientToDelete && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl w-full max-w-md shadow-2xl p-6 font-sans">
            <div className="flex items-center gap-3 text-mtabi-error mb-4">
              <AlertTriangle size={28} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">EXCLUIR CONTA CLIENTE</h3>
            </div>
            
            <p className="text-xs text-mtabi-muted leading-relaxed">
              Você está prestes a excluir permanentemente o cliente <span className="text-white font-bold">{clientToDelete.nome_empresa}</span>.
              Isso apagará **TODOS os projetos**, **históricos financeiros** e **dados associados** de forma irreversível.
            </p>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setClientToDelete(null)}
                className="w-1/2 py-2.5 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
              >
                CANCELAR
              </button>
              <button
                onClick={handleDeleteClient}
                className="w-1/2 py-2.5 bg-mtabi-error hover:bg-mtabi-error/90 text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
              >
                CONFIRMAR EXCLUSÃO
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[2000] animate-bounce">
          <div className={`px-5 py-3.5 rounded-xl border text-xs font-bold uppercase tracking-wider shadow-2xl flex items-center gap-2.5 font-sans ${
            toast.type === 'success' 
              ? 'bg-emerald-950/90 border-mtabi-success/40 text-mtabi-success' 
              : 'bg-red-950/90 border-mtabi-error/40 text-mtabi-error'
          }`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO DE CONTRATO */}
      {contractToDelete && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl w-full max-w-md shadow-2xl p-6 font-sans">
            <div className="flex items-center gap-3 text-mtabi-error mb-4">
              <AlertTriangle size={28} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">EXCLUIR CONTRATO</h3>
            </div>
            
            <p className="text-xs text-mtabi-muted leading-relaxed">
              Você está prestes a excluir permanentemente este contrato de consultoria de forma irreversível.
            </p>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setContractToDelete(null)}
                className="w-1/2 py-2.5 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
              >
                CANCELAR
              </button>
              <button
                onClick={async () => {
                  const id = contractToDelete;
                  setContractToDelete(null);
                  try {
                    setLoading(true);
                    await deleteContrato(id);
                    await sincronizarTodosOsContratos();
                    await loadData();
                    showToast('Contrato excluído com sucesso!');
                  } catch (err) {
                    console.error(err);
                    showToast('Erro ao excluir contrato.', 'error');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-1/2 py-2.5 bg-mtabi-error hover:bg-mtabi-error/90 text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
              >
                CONFIRMAR EXCLUSÃO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Secundário: Gerenciar Tecnologias */}
      {isTechManagerOpen && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-mtabi-card border border-mtabi-border rounded-2xl shadow-2xl overflow-hidden font-sans">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-mtabi-border bg-[#13151A]/60">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Gerenciar Tecnologias
              </h3>
              <button
                onClick={() => {
                  setIsTechManagerOpen(false);
                  setEditingTechId(null);
                  setEditingTechName('');
                }}
                className="text-mtabi-muted hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Adicionar Nova Tecnologia Rápido */}
              <div className="bg-mtabi-bg/40 border border-mtabi-border p-3.5 rounded-xl space-y-2">
                <span className="text-[9px] font-bold text-mtabi-yellow uppercase tracking-wider block">Cadastrar Nova Tecnologia</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nome da tecnologia (Ex: React Native, Python)"
                    value={newToolInput}
                    onChange={e => setNewToolInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-xl text-xs text-white focus:outline-none focus:border-mtabi-yellow placeholder-mtabi-muted/50"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newToolInput.trim()) return;
                      try {
                        await createTecnologia({ nome: newToolInput.trim() });
                        setNewToolInput('');
                        await loadData();
                      } catch (err) {
                        alert('Erro ao adicionar tecnologia.');
                      }
                    }}
                    className="px-3 py-1.5 bg-mtabi-yellow/20 hover:bg-mtabi-yellow/30 text-mtabi-yellow border border-mtabi-yellow/30 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {tecnologias.length === 0 ? (
                  <p className="text-xs text-mtabi-muted text-center py-4">Nenhuma tecnologia cadastrada.</p>
                ) : (
                  <div className="divide-y divide-mtabi-border/40">
                    {tecnologias.map(tech => (
                      <div key={tech.id} className="flex items-center justify-between py-2.5">
                        {editingTechId === tech.id ? (
                          <div className="flex-1 flex gap-2 mr-2">
                            <input
                              type="text"
                              value={editingTechName}
                              onChange={e => setEditingTechName(e.target.value)}
                              className="flex-1 px-2.5 py-1 bg-mtabi-bg border border-mtabi-border rounded-lg text-xs text-white focus:outline-none focus:border-mtabi-yellow"
                            />
                            <button
                              onClick={() => handleRenameTechnology(tech.id)}
                              className="px-2.5 py-1 bg-mtabi-yellow text-[#13151A] text-[10px] font-bold uppercase rounded-lg hover:bg-mtabi-yellow/90 transition-colors cursor-pointer"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => {
                                setEditingTechId(null);
                                setEditingTechName('');
                              }}
                              className="px-2.5 py-1 bg-mtabi-border text-white text-[10px] font-bold uppercase rounded-lg hover:bg-mtabi-border/80 transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs text-white font-mono uppercase">{tech.nome}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingTechId(tech.id);
                                  setEditingTechName(tech.nome);
                                }}
                                className="p-1 hover:text-mtabi-yellow text-mtabi-muted transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Tem certeza que deseja excluir a tecnologia "${tech.nome}"? Ela será removida da seleção dos projetos.`)) {
                                    handleDeleteTechnology(tech.id);
                                  }
                                }}
                                className="p-1 hover:text-mtabi-error text-mtabi-muted transition-colors cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Clientes;
