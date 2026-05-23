import React, { useState, useMemo, useEffect } from 'react';
import { Search, Book, Users, ScanFace, Fuel, FileText, AlertCircle, CheckCircle2, ChevronDown, MonitorPlay, Sparkles, ThumbsUp, BookOpen, Smartphone, ArrowLeftRight } from 'lucide-react';
import { Operator } from '../types';

type Topic = {
  id: string;
  category: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
  tags: string[];
  allowedScreen?: string;
};

const Screenshot: React.FC<{ src: string; caption: string; blurFace?: boolean }> = ({ src, caption, blurFace }) => (
  <figure className="relative my-6 rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-50">
    <img src={src} alt={caption} className="w-full object-cover" />
    {blurFace && (
      <div 
        className="absolute backdrop-blur-2xl bg-white/20 border border-white/30 rounded-xl shadow-2xl" 
        style={{ 
          top: '15%', 
          left: '7%', 
          width: '12%', 
          height: '25%',
          zIndex: 10 
        }} 
      />
    )}
    <figcaption className="text-center text-xs text-slate-500 font-medium py-2 px-4 border-t border-slate-100 bg-white">{caption}</figcaption>
  </figure>
);

const HELP_DATA: Topic[] = [
  {
    id: 'intro-painel',
    category: 'Visão Geral',
    title: 'Painel de Controle (Dashboard)',
    icon: MonitorPlay,
    allowedScreen: 'dashboard',
    tags: ['painel', 'dashboard', 'início', 'gráficos', 'resumo', 'abastecimento', 'combustível', 'indicadores', 'abas'],
    content: (
      <div className="space-y-6">
        <p className="text-slate-600 leading-relaxed">
          O <strong>Painel de Controle</strong> é a sua tela inicial. Ele centraliza os indicadores mais importantes do batalhão em tempo real, permitindo uma gestão rápida e visual.
        </p>

        <div className="space-y-8 mt-6">
          <div className="border border-slate-200 rounded-3xl p-6 bg-white shadow-sm hover:shadow-md transition-all">
            <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
              <span className="bg-slate-900 text-white w-6 h-6 flex items-center justify-center rounded-lg text-xs">1</span>
              Visão Geral
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Monitoramento imediato do <strong>Quadro de Alertas</strong> (Críticos, Atenção e Ativos) e o <strong>Fluxo de Atividade Recente</strong> de todos os módulos.
            </p>
            <Screenshot src="/docs/PAINEL - VISÃO GERAL.png" caption="Aba Visão Geral — Gestão de alertas e fluxo recente" />
          </div>

          <div className="border border-slate-200 rounded-3xl p-6 bg-white shadow-sm hover:shadow-md transition-all">
            <h3 className="text-lg font-black text-blue-800 mb-2 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-lg text-xs">2</span>
              Estatísticas de Prestadores
            </h3>
            <p className="text-sm text-slate-600 mb-4">
               Gráficos de comparecimento semanal, evolução histórica de horas e indicadores de desempenho da força de trabalho comunitária.
             </p>
            <Screenshot src="/docs/PAINEL - PRESTADORES.png" caption="Aba Prestadores — Monitoramento estatístico e histórico" />
          </div>

          <div className="border border-slate-200 rounded-3xl p-6 bg-white shadow-sm hover:shadow-md transition-all">
            <h3 className="text-lg font-black text-emerald-800 mb-2 flex items-center gap-2">
              <span className="bg-emerald-600 text-white w-6 h-6 flex items-center justify-center rounded-lg text-xs">3</span>
              Análise de Frota
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Controle financeiro de combustíveis, média de consumo por viatura (KM/L) e ranking de eficiência da frota.
            </p>
            <Screenshot src="/docs/PAINEL - ABASTECIMENTO.png" caption="Aba Abastecimento — Controle de gastos e eficiência de combustível" />
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'gerir-prestadores',
    category: 'Prestadores',
    title: '1. Gestão e Cadastro',
    icon: Users,
    allowedScreen: 'providers',
    tags: ['prestador', 'cadastro', 'novo', 'listar', 'processo', 'edição', 'horas', 'encaminhamento', 'identidade', 'documento', 'folha'],
    content: (
      <div className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          O módulo de <strong>Prestadores</strong> centraliza toda a ficha funcional dos cidadãos em serviço comunitário.
        </p>

        <Screenshot src="/docs/PRESTADORES - PRESTADORES.png" caption="Lista de Prestadores — Organização por status (Ativos, Finalizados, Devolvidos)" />

        <h3 className="text-lg font-black text-slate-800 mt-6">Ficha do Prestador</h3>
        <p className="text-sm text-slate-600">
          Ao abrir um prestador, você tem uma visão 360º de sua situação, incluindo progresso de horas, documentos anexados e histórico de presenças.
        </p>
        <Screenshot src="/docs/PRESTADORES - ACOMPANHAMENTO PRESTADOR.png" caption="Ficha Detalhada — Acompanhamento em tempo real do progresso" />

        <h3 className="text-lg font-black text-slate-800 mt-4">Novo Cadastro</h3>
        <p className="text-sm text-slate-600 mb-4">O cadastro é simplificado, exigindo dados básicos do processo e anexos obrigatórios.</p>
        <Screenshot src="/docs/PRESTADORES - CADASTRO DE PRESTADOR.png" caption="Cadastro — Inserção de dados do juizado e documentos" />
      </div>
    )
  },
  {
    id: 'frequencia-ocr',
    category: 'Prestadores',
    title: '2. Lançar Frequência (OCR)',
    icon: Sparkles,
    allowedScreen: 'providers',
    tags: ['digitalizar', 'folha', 'inteligência', 'frequência', 'horas', 'ponto', 'foto', 'ocr', 'leitura'],
    content: (
      <div className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          Utilize a <strong>Leitura Inteligente (OCR)</strong> para processar folhas de frequência físicas. O sistema extrai automaticamente as datas e horários de entrada e saída.
        </p>

        <Screenshot src="/docs/PRESTADORES - DIGITALIZAR ACOMPANHAMENTO.png" caption="Digitalização — O sistema processa a imagem e sugere os lançamentos" />

        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4 flex items-start gap-3">
          <CheckCircle2 className="text-blue-600 shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-blue-900 font-medium">
            <strong>Dica:</strong> Após a leitura, você pode conferir e ajustar qualquer horário antes de confirmar o lançamento definitivo no sistema.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'biometria-face',
    category: 'Prestadores',
    title: '3. Check-in Facial e Perímetro',
    icon: ScanFace,
    allowedScreen: 'face-checkin',
    tags: ['biometria', 'checkin', 'rosto', 'facial', 'câmera', 'enrolment', 'cadastrar', 'celular', 'militar', 'registro', 'marca d\'água', 'perímetro', 'gps'],
    content: (
      <div className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          O registro biométrico facial garante que o prestador está presente fisicamente. Além do rosto, o sistema verifica se o dispositivo está dentro do <strong>perímetro geográfico</strong> autorizado (Quartel).
        </p>

        <h3 className="text-lg font-black text-slate-800 mt-6">Cadastro Facial (Enrolment)</h3>
        <p className="text-sm text-slate-600">O primeiro passo é mapear o rosto do prestador para identificação futura.</p>
        <Screenshot src="/docs/PRESTADORES - CADASTRAR ROSTO (BIOMETRIA FACIAL).png" caption="Cadastro de Rosto — Mapeamento biométrico inicial" />

        <h3 className="text-lg font-black text-slate-800 mt-6">Check-in em Tempo Real</h3>
        <p className="text-sm text-slate-600">O militar aponta a câmera e o sistema identifica o prestador instantaneamente, validando também as coordenadas de GPS.</p>
        <Screenshot src="/docs/PRESTADORES - CHECKIN FACIAL.png" caption="Check-in — Reconhecimento e validação de presença por rosto e perímetro" />

        <h3 className="text-lg font-black text-slate-800 mt-6">Comprovação e Auditoria</h3>
        <p className="text-sm text-slate-600">Cada registro gera um comprovante visual com marca d'água de data, hora, operador e mapa de localização GPS.</p>
        <Screenshot src="/docs/PRESTADORES - COMPROVANTE AUDITORIA FACIAL.png" caption="Comprovação de Auditoria — Registro auditável com localização e perímetro" />
      </div>
    )
  },
  {
    id: 'justificativas',
    category: 'Prestadores',
    title: '4. Justificativas de Falta',
    icon: AlertCircle,
    allowedScreen: 'providers',
    tags: ['falta', 'atestado', 'justificativa', 'ausência', 'médico', 'documento'],
    content: (
      <div className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          Quando o prestador não puder comparecer, o militar pode registrar a justificativa anexando o comprovante (ex: atestado médico).
        </p>

        <Screenshot src="/docs/PRESTADORES - JUSTIFICATIVA DE FALTA.png" caption="Justificativa — Registro de ausência com anexo de documento comprobatório" />

        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mt-4">
          <p className="text-sm text-amber-900 font-medium">
            Justificativas não somam horas ao total cumprido, mas mantêm o histórico do prestador em dia para prestação de contas ao juizado.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'historico-auditoria',
    category: 'Prestadores',
    title: '5. Histórico e Auditoria',
    icon: FileText,
    allowedScreen: 'providers',
    tags: ['histórico', 'log', 'auditoria', 'quem fez', 'alteração', 'lançamento', 'timeline'],
    content: (
      <div className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          Todas as ações realizadas no cadastro de um prestador são registradas em uma linha do tempo (Timeline) para auditoria.
        </p>

        <Screenshot src="/docs/PRESTADORES - HISTÓRICO DE REGISTROS.png" caption="Timeline de Auditoria — Log detalhado de todas as operações no cadastro" />

        <p className="text-sm text-slate-600">
          O sistema registra: <strong>O que</strong> foi feito, <strong>Quem</strong> fez e a <strong>Data/Hora</strong> exata, garantindo total transparência no processo.
        </p>
      </div>
    )
  },
  {
    id: 'abastecimento',
    category: 'Gestão de Viaturas',
    title: '1. Combustíveis e Frota',
    icon: Fuel,
    allowedScreen: 'fuel',
    tags: ['abastecimento', 'viatura', 'gasolina', 'combustível', 'kml', 'notas', 'cupons', 'bomba', 'frota'],
    content: (
      <div className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          O módulo de <strong>Abastecimento</strong> centraliza o controle de consumo e quilometragem da frota.
        </p>

        <h3 className="text-lg font-black text-slate-800 mt-6">Registro de Frota</h3>
        <p className="text-sm text-slate-600">Acompanhe as últimas viaturas abastecidas e os cupons lançados recentemente.</p>
        <Screenshot src="/docs/ABASTECIMENTO - REGISTRO DE FROTA.png" caption="Visão Geral — Lista de abastecimentos ativos e histórico rápido" />

        <h3 className="text-lg font-black text-slate-800 mt-6">Gestão de Viaturas</h3>
        <p className="text-sm text-slate-600">Cadastre e gerencie os detalhes de cada viatura (Placa, Modelo, KM inicial).</p>
        <Screenshot src="/docs/ABASTECIMENTO - GESTÃO DE FROTA.png" caption="Frota — Detalhamento e controle individual por viatura" />

        <h3 className="text-lg font-black text-slate-800 mt-6">Relatórios Oficiais (PDF)</h3>
        <p className="text-sm text-slate-600">Gere documentos consolidados por período para prestação de contas.</p>
        <Screenshot src="/docs/ABASTECIMETNO - RELATORIO PDF.png" caption="Relatórios — Consolidação de dados para exportação em PDF" />
      </div>
    )
  },
  {
    id: 'gerenciar-postos',
    category: 'Gestão de Viaturas',
    title: '2. Gerenciar Postos',
    icon: MonitorPlay,
    allowedScreen: 'fuel',
    tags: ['posto', 'nome', 'gasolina', 'combustível', 'gerenciar', 'configurar'],
    content: (
      <div className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          Para facilitar o lançamento, você pode cadastrar "Apelidos" para os postos de combustíveis conveniados.
        </p>

        <Screenshot src="/docs/ABASTECIMENTO - GERENCIAR POSTOS.png" caption="Gerenciar Postos — Cadastro de nomes e identificações dos postos" />

        <p className="text-sm text-slate-600 italic">
          Isso agiliza o preenchimento dos formulários, permitindo selecionar o posto em uma lista pré-definida.
        </p>
      </div>
    )
  },
  {
    id: 'fuel-ocr',
    category: 'Gestão de Viaturas',
    title: '3. Digitalizar Cupons',
    icon: Sparkles,
    allowedScreen: 'fuel',
    tags: ['ocr', 'cupom', 'nota', 'fiscal', 'digitalizar', 'foto', 'leitura'],
    content: (
      <div className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          O sistema utiliza Inteligência Artificial para ler cupons fiscais de abastecimento, extraindo Litros, Valor e Data.
        </p>

        <Screenshot src="/docs/ABASTECIMENTO - DIGITALIZAR NOTA.png" caption="OCR de Cupons — Extração automática de dados da nota fiscal" />
      </div>
    )
  },
  {
    id: 'relatorios-oficios',
    category: 'Prestadores',
    title: '6. Emissão de Ofícios',
    icon: FileText,
    allowedScreen: 'providers',
    tags: ['relatório', 'ofício', 'juiz', 'imprimir', 'papel', 'processos', 'horas cumpridas', 'pdf', 'número', 'responsável'],
    content: (
      <div className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          O módulo de <strong>Ofícios</strong> está integrado diretamente na ficha de cada prestador, permitindo a emissão rápida de documentos oficiais.
        </p>

        <Screenshot src="/docs/PRESTADORES - OFÍCIO.png" caption="Ofício Judicial — Documento gerado automaticamente com dados do processo" />

        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mt-4 flex items-start gap-3">
          <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-emerald-900 font-medium">
            O sistema preenche automaticamente as horas cumpridas e o saldo restante, eliminando erros manuais de cálculo.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'troca-servico',
    category: 'Escalas de Serviço',
    title: 'Troca de Serviço (Permutas)',
    icon: ArrowLeftRight,
    allowedScreen: 'swaps',
    tags: ['troca', 'serviço', 'escala', 'permuta', 'substituto', 'plantão', 'aprovar', 'reprovar', 'cancelar', 'militar'],
    content: (
      <div className="space-y-6">
        <p className="text-slate-600 leading-relaxed">
          O módulo de <strong>Troca de Serviço</strong> permite aos militares registrar permutas de escalas de serviço e aos administradores avaliar e gerenciar essas solicitações com total transparência e auditoria.
        </p>

        <div className="space-y-8 mt-6">
          <div className="border border-slate-200 rounded-3xl p-6 bg-white shadow-sm hover:shadow-md transition-all">
            <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
              <span className="bg-slate-900 text-white w-6 h-6 flex items-center justify-center rounded-lg text-xs">1</span>
              Como Solicitar uma Troca
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Clique no botão <strong>"Nova Solicitação"</strong>. No formulário, o seu nome aparecerá automaticamente como "Escalado (Você)". Selecione o <strong>Substituto</strong> digitando as iniciais para autocompletar com sugestões em tempo real, escolha a <strong>Função</strong> (CG, COV, Linha ou COBOM), defina a <strong>Data do Plantão</strong> e os <strong>Horários de início e fim</strong>, e clique em "Enviar Solicitação".
            </p>
            <Screenshot src="/docs/TROCA_SERVICO - NOVA_SOLICITACAO.png" caption="Formulário de Nova Permuta — Registro dinâmico de troca com busca autocompletável" />
          </div>

          <div className="border border-slate-200 rounded-3xl p-6 bg-white shadow-sm hover:shadow-md transition-all">
            <h3 className="text-lg font-black text-blue-800 mb-2 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-lg text-xs">2</span>
              Acompanhamento e Cancelamento
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Na aba <strong>"Minhas Solicitações"</strong>, você acompanha o status de seus pedidos (Pendente, Aprovado, Reprovado ou Cancelado). O titular da escala e os administradores podem cancelar um registro ativo (Pendente ou Aprovado) a qualquer momento clicando no botão <strong>"Cancelar"</strong> na coluna de Ações ou nos cards mobile. O sistema exibirá uma janela de confirmação nativa.
            </p>
            <Screenshot src="/docs/TROCA_SERVICO - MINHAS_SOLICITACOES.png" caption="Minhas Solicitações — Acompanhamento e cancelamento padrão com modal nativo" />
          </div>

          <div className="border border-slate-200 rounded-3xl p-6 bg-white shadow-sm hover:shadow-md transition-all">
            <h3 className="text-lg font-black text-amber-800 mb-2 flex items-center gap-2">
              <span className="bg-amber-600 text-white w-6 h-6 flex items-center justify-center rounded-lg text-xs">3</span>
              Aprovação de Permutas (Administrador)
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Os administradores recebem um indicador vermelho com o número de pendências. Na aba <strong>"Aprovações"</strong>, eles avaliam os pedidos com opções rápidas de "Aprovar" ou "Reprovar" e registram observações oficiais. Em caso de cancelamento posterior, quem cancelou a permuta é registrado sob a coluna "Avaliação".
            </p>
            <Screenshot src="/docs/TROCA_SERVICO - APROVACOES.png" caption="Aprovações — Painel administrativo para avaliação e auditoria" />
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'configuracoes',
    category: 'Sistema',
    title: 'Configurações e Controle',
    icon: Smartphone,
    allowedScreen: 'settings',
    tags: ['perfil', 'usuários', 'militares', 'perímetro', 'quartel', 'gps', 'segurança'],
    content: (
      <div className="space-y-6">
        <p className="text-slate-600 leading-relaxed">
          As configurações agora são organizadas em três abas para maior clareza administrativa.
        </p>

        <div className="space-y-8 mt-6">
          <div className="border border-slate-200 rounded-3xl p-6 bg-white">
            <h3 className="text-lg font-black text-slate-800 mb-2">1. Meu Perfil</h3>
            <p className="text-sm text-slate-600 mb-4">Atualização de dados do militar operador e troca de senha.</p>
            <Screenshot src="/docs/CONFIGURAÇÕES - PERFIL.png" caption="Perfil — Gestão de dados pessoais" />
          </div>

          <div className="border border-slate-200 rounded-3xl p-6 bg-white">
            <h3 className="text-lg font-black text-blue-800 mb-2">2. Gestão de Usuários</h3>
            <p className="text-sm text-slate-600 mb-4">Administração de permissões e cadastro de novos militares para acesso ao sistema.</p>
            <Screenshot src="/docs/CONFIGURAÇÕES - GESTÃO DE USUÁRIOS.png" caption="Usuários — Controle de acesso administrativo" />
          </div>

          <div className="border border-slate-200 rounded-3xl p-6 bg-white">
            <h3 className="text-lg font-black text-red-800 mb-2">3. Perímetro Operacional</h3>
            <p className="text-sm text-slate-600 mb-4">Definição das coordenadas geográficas e raio de atuação para o Check-in Facial.</p>
            <Screenshot src="/docs/CONIGURAÇÕES - PERÍMETRO.png" caption="Perímetro — Segurança via Geofencing (GPS)" />
          </div>
        </div>
      </div>
    )
  },
];

interface Props {
  currentUser?: Operator;
}

const HelpCenter: React.FC<Props> = ({ currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [showMobileTopics, setShowMobileTopics] = useState(true);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'yes' | 'no'>>({});

  const visibleHelpData = useMemo(() => {
    if (!currentUser || !currentUser.allowedScreens) return HELP_DATA;
    return HELP_DATA.filter(topic => 
      !topic.allowedScreen || currentUser.allowedScreens.includes(topic.allowedScreen)
    );
  }, [currentUser]);

  useEffect(() => {
    if (visibleHelpData.length > 0 && !activeTopicId) {
      setActiveTopicId(visibleHelpData[0].id);
    } else if (activeTopicId && !visibleHelpData.some(t => t.id === activeTopicId)) {
      setActiveTopicId(visibleHelpData[0]?.id || null);
    }
  }, [visibleHelpData, activeTopicId]);

  const filteredTopics = useMemo(() => {
    if (!searchTerm.trim()) return visibleHelpData;
    const lowerSearch = searchTerm.toLowerCase();
    return visibleHelpData.filter(topic => {
      const matchTitle = topic.title.toLowerCase().includes(lowerSearch);
      const matchCategory = topic.category.toLowerCase().includes(lowerSearch);
      const matchTags = topic.tags.some(tag => tag.toLowerCase().includes(lowerSearch));
      return matchTitle || matchCategory || matchTags;
    });
  }, [searchTerm, visibleHelpData]);

  const activeTopic = useMemo(() => {
    if (!activeTopicId) return visibleHelpData[0] || null;
    const found = visibleHelpData.find(t => t.id === activeTopicId);
    if (found && filteredTopics.find(t => t.id === activeTopicId)) return found;
    return filteredTopics[0] || null;
  }, [activeTopicId, filteredTopics, visibleHelpData]);

  const groupedTopics = useMemo(() => {
    const groups: { [key: string]: Topic[] } = {};
    filteredTopics.forEach(t => {
      if (!groups[t.category]) groups[t.category] = [];
      groups[t.category].push(t);
    });
    return groups;
  }, [filteredTopics]);

  return (
    <div className="h-full flex flex-col pt-2 animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-8 flex items-center gap-4">
        <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-600/30">
          <Book size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Ajuda e Documentação</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Base de conhecimento oficial e suporte do sistema.</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Pesquisar por prestador, ocr, biometria, relatórios, dúvida..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white pl-12 pr-4 py-4 rounded-2xl border border-slate-200 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-800 font-medium"
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-slate-100 overflow-hidden">
        
        {/* Sidebar Topics - Hidden on mobile if viewing content */}
        <div className={`w-full lg:w-1/3 flex flex-col gap-4 border-r-0 lg:border-r border-slate-100 pr-0 lg:pr-4 overflow-y-auto no-scrollbar shrink-0 ${!showMobileTopics ? 'hidden lg:flex' : 'flex'}`}>
          {Object.keys(groupedTopics).length === 0 ? (
            <div className="text-center p-8 bg-slate-50 rounded-xl">
              <p className="text-slate-500 font-bold">Nenhum resultado encontrado.</p>
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-blue-600 font-black text-xs hover:underline"
              >
                Limpar Pesquisa
              </button>
            </div>
          ) : (
            Object.keys(groupedTopics).map(category => (
              <div key={category} className="mb-4 last:mb-0">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-2 mb-2 block">
                  {category}
                </span>
                <div className="space-y-1">
                  {groupedTopics[category].map(topic => (
                    <button
                      key={topic.id}
                      onClick={() => {
                        if (topic.id) {
                          setActiveTopicId(topic.id);
                        }
                        setShowMobileTopics(false);
                      }}
                      className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all ${
                        activeTopic?.id === topic.id
                          ? 'bg-blue-50 text-blue-800 border border-blue-100 shadow-sm ring-1 ring-blue-500/10'
                          : 'text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100'
                      }`}
                    >
                      <div className={`mt-0.5 shrink-0 ${activeTopic?.id === topic.id ? 'text-blue-600' : 'text-slate-400'}`}>
                        <topic.icon size={18} />
                      </div>
                      <span className={`text-xs md:text-sm leading-tight transition-all ${activeTopic?.id === topic.id ? 'font-black' : 'font-medium'}`}>
                        {topic.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Content Area - Hidden on mobile if choosing topic */}
        <div className={`flex-1 overflow-y-auto no-scrollbar pl-0 lg:pl-6 pt-0 ${showMobileTopics ? 'hidden lg:block' : 'block'}`}>
          {activeTopic ? (
            <div className="max-w-3xl animate-in slide-in-from-right-4 fade-in duration-500" key={activeTopic.id}>
              
              {/* Back button for Mobile */}
              <button 
                onClick={() => setShowMobileTopics(true)}
                className="lg:hidden flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest mb-6 py-2 px-4 bg-blue-50 rounded-xl"
              >
                ← Voltar para Tópicos
              </button>

              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-black text-slate-500 uppercase tracking-widest mb-4">
                {activeTopic.category}
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 mb-6 md:mb-8 leading-tight tracking-tight">
                {activeTopic.title}
              </h1>

              <div className="text-slate-700 documentation-content pb-12">
                {activeTopic.content}
              </div>

              <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                {feedbackGiven[activeTopic.id] ? (
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                    <ThumbsUp size={18} />
                    Obrigado pelo seu feedback!
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium text-slate-400">Este tópico foi útil?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFeedbackGiven(prev => ({ ...prev, [activeTopic.id]: 'yes' }))}
                        className="px-4 py-2 bg-slate-50 text-slate-600 text-xs font-black uppercase rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition-colors border border-slate-100"
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setFeedbackGiven(prev => ({ ...prev, [activeTopic.id]: 'no' }))}
                        className="px-4 py-2 bg-slate-50 text-slate-600 text-xs font-black uppercase rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors border border-slate-100"
                      >
                        Não
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
              <Book size={64} className="mb-4" />
              <p className="font-bold">Selecione um tópico na lista ao lado.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default HelpCenter;
