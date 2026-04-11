import React, { useState, useMemo } from 'react';
import {  Search, Book, Users, ScanFace, Fuel, FileText, AlertCircle, CheckCircle2, ChevronDown, MonitorPlay, Sparkles, ThumbsUp , BookOpen } from 'lucide-react';

type Topic = {
  id: string;
  category: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
  tags: string[];
};

const Screenshot: React.FC<{ src: string; caption: string }> = ({ src, caption }) => (
  <figure className="my-6 rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-50">
    <img src={src} alt={caption} className="w-full object-cover" />
    <figcaption className="text-center text-xs text-slate-500 font-medium py-2 px-4 border-t border-slate-100 bg-white">{caption}</figcaption>
  </figure>
);

const HELP_DATA: Topic[] = [
  {
    id: 'intro-painel',
    category: 'Visão Geral',
    title: 'Painel Principal (Dashboard)',
    icon: MonitorPlay,
    tags: ['painel', 'dashboard', 'início', 'gráficos', 'resumo', 'abastecimento', 'combustível', 'indicadores'],
    content: (
      <div className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          O <strong>Painel Principal</strong> (Dashboard) é a central de comando do Sistema de Gestão CBM.
          Aqui você encontra um resumo panorâmico de todas as operações ativas.
        </p>

        <Screenshot src="/docs/painel.png" caption="Painel Principal — visão geral com indicadores e alertas do sistema" />

        <h3 className="text-lg font-black text-slate-800 mt-6">O que você encontra aqui:</h3>

        <h4 className="font-black text-slate-700 mt-4">📋 Indicadores de Prestadores</h4>
        <ul className="list-disc pl-5 space-y-2 text-slate-600">
          <li><strong>Prestadores Ativos:</strong> Quantidade total de prestadores com pena em andamento na unidade.</li>
          <li><strong>Horas Totais a Cumprir:</strong> Somatório consolidado de todas as horas pendentes.</li>
          <li><strong>Alertas de Inatividade:</strong> O sistema emite alertas visuais em vermelho para prestadores que estão há mais de 7 dias sem lançar nenhum registro de frequência.</li>
          <li><strong>Atalhos Rápidos:</strong> Botões que levam diretamente ao perfil dos prestadores em alerta.</li>
        </ul>

        <h4 className="font-black text-slate-700 mt-6">⛽ Indicadores de Abastecimento</h4>
        <ul className="list-disc pl-5 space-y-2 text-slate-600">
          <li><strong>Abastecimentos Pendentes:</strong> Quantidade de notas fiscais registradas que ainda aguardam conferência e validação por um responsável.</li>
          <li><strong>Consumo Recente:</strong> Visão rápida dos últimos abastecimentos, com viatura, litros e valor.</li>
          <li><strong>Atalho para Gestão de Frotas:</strong> Clique direto no indicador para ir à tela de conferência e aprovação dos abastecimentos.</li>
        </ul>

        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4 flex items-start gap-3">
          <CheckCircle2 className="text-blue-600 shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-blue-900 font-medium">
            <strong>Dica de Produtividade:</strong> Use o painel diariamente como sua triagem. Resolva os alertas em vermelho primeiro antes de iniciar novas tarefas ou cadastros.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'gerir-prestadores',
    category: 'Prestadores',
    title: 'Cadastro e Listagem de Prestadores',
    icon: Users,
    tags: ['prestador', 'cadastro', 'novo', 'listar', 'processo', 'edição', 'horas', 'encaminhamento', 'identidade', 'documento', 'folha'],
    content: (
      <div className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          O módulo de <strong>Prestadores</strong> permite acompanhar todos os cidadãos que estão cumprindo Serviço Comunitário no quartel.
        </p>

        <Screenshot src="/docs/prestadores-lista.png" caption="Lista de Prestadores — com filtros por período, busca e abas de status" />

        <h3 className="text-lg font-black text-slate-800 mt-4">Como Criar um Novo Cadastro:</h3>
        <ul className="list-decimal pl-5 space-y-2 text-slate-600">
          <li>Clique no botão <strong>+ Novo Cadastro</strong> no canto superior direito.</li>
          <li>Preencha os dados obrigatórios: Nome completo, Número do Processo e o total de horas a cumprir estabelecido pelo juiz.</li>
          <li>
            <strong>Folha de Encaminhamento e Documento de Identidade:</strong> É obrigatório anexar esses documentos ao cadastro.
            Para facilitar, o sistema permite <strong>escanear diretamente pelo celular</strong> — basta clicar no botão de digitalização e apontar a câmera para o documento.
            A tecnologia de Leitura Inteligente identifica automaticamente todos os campos (nome, número do processo, datas, entidade responsável) e preenche o formulário sem nenhuma digitação manual.
          </li>
          <li>Ao salvar, o sistema registra automaticamente na linha do tempo do prestador que o cadastro foi criado, quem o cadastrou e quando.</li>
        </ul>

        <Screenshot src="/docs/prestador-cadastro.png" caption="Formulário de Cadastro — com campo para digitalização dos documentos" />

        <h3 className="text-lg font-black text-slate-800 mt-6">Estados do Prestador:</h3>
        <p className="text-slate-600">Os prestadores são distribuídos em três abas com status coloridos:</p>
        <div className="space-y-3 mt-2">
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border">
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded text-xs font-black">ATIVO</span>
            <span className="text-sm text-slate-600">Em andamento, cumprindo a carga horária na unidade.</span>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border">
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-black">FINALIZADO</span>
            <span className="text-sm text-slate-600">Completaram 100% do plano de horas.</span>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border">
            <span className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs font-black">DEVOLVIDO</span>
            <span className="text-sm text-slate-600">Processo encerrado prematuramente por quebra disciplinar, abandono ou ofício do juizado.</span>
          </div>
        </div>

        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mt-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-amber-900 font-medium">
              Os contadores de cada aba (Ativos, Finalizados, Devolvidos) são atualizados automaticamente conforme os filtros de período aplicados.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'frequencia-ocr',
    category: 'Prestadores',
    title: 'Lançar Folha de Frequência (Leitura Inteligente)',
    icon: Sparkles,
    tags: ['digitalizar', 'folha', 'inteligência', 'frequência', 'horas', 'ponto', 'foto', 'ocr', 'leitura'],
    content: (
      <div className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          Para registrar as horas cumpridas, o sistema utiliza tecnologia de <strong>Processamento Inteligente (Leitura Inteligente)</strong>,
          responsável por ler o papel físico onde os horários foram registrados manualmente.
          Isso elimina a necessidade de digitação e reduz erros de lançamento.
        </p>

        <Screenshot src="/docs/ocr-modal.png" caption="Modal de Digitalização — câmera ou upload de imagem para leitura automática da folha" />

        <h3 className="text-lg font-black text-slate-800 mt-4">Como Digitalizar uma Folha de Frequência:</h3>
        <ul className="list-decimal pl-5 space-y-3 text-slate-600 mb-6">
          <li>Acesse a ficha de um <strong>Prestador</strong> na lista.</li>
          <li>Localize a aba <strong>Lançamentos e Horas</strong> e clique em <strong>Digitalizar Folha</strong>.</li>
          <li>A câmera será aberta (em celulares) ou um seletor de arquivos aparecerá. Capture a foto da folha em um local <strong>bem iluminado</strong>, priorizando um enquadramento sem fundos irregulares.</li>
          <li>Na tela de confirmação, ajuste o recorte se necessário para isolar apenas a tabela de registros.</li>
          <li>Clique em <strong>Ler e Analisar</strong>. O sistema processará a imagem e extrairá automaticamente todos os dados de entrada, saída e data.</li>
          <li>Confira o <strong>somatório total de horas</strong> exibido no topo — verifique se bate com seus cálculos. Você pode editar qualquer linha lida de forma incorreta antes de confirmar.</li>
          <li>Clique em <strong>Salvar</strong>. A folha e os registros de tempo são lançados permanentemente no perfil do prestador.</li>
        </ul>

        <Screenshot src="/docs/ocr-resultado.png" caption="Resultado da Leitura — dados extraídos da folha prontos para conferência e salvamento" />

        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mt-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-amber-900 font-medium">
              Sempre confira os dados extraídos antes de confirmar o salvamento, principalmente em documentos com caligrafia muito irregular ou rasurada. A verificação do militar responsável continua sendo obrigatória.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'biometria-face',
    category: 'Biometria',
    title: 'Check-in e Enrolment Facial',
    icon: ScanFace,
    tags: ['biometria', 'checkin', 'rosto', 'facial', 'câmera', 'enrolment', 'cadastrar', 'celular', 'militar', 'registro', 'marca d\'água'],
    content: (
      <div className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          O sistema disponibiliza um módulo de <strong>Check-in por Reconhecimento Facial</strong> para registrar entradas e saídas de prestadores de forma rápida, precisa e sem necessidade de papel.
          O sistema funciona tanto em computadores quanto em <strong>dispositivos móveis (celulares e tablets)</strong>.
        </p>

        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-blue-900 font-medium">
              <strong>Importante:</strong> O check-in <strong>não é realizado pelo prestador de forma autônoma</strong>. Deve ser <strong>efetuado por um militar de serviço</strong>, que posicionará a câmera em direção ao rosto do prestador e confirmará o registro.
            </p>
          </div>
        </div>

        <h3 className="text-lg font-black text-slate-800 mt-4">1. Enrolment — Cadastrando a Biometria</h3>
        <p className="text-slate-600">
          Para que o prestador seja identificado pela câmera, é necessário cadastrar previamente sua biometria facial.
          Na página de detalhes do prestador, ao lado da foto de perfil, clique em <strong>Cadastrar Rosto</strong>.
          O prestador deverá ser posicionado em frente à câmera até que as marcações de captura mapeiem sua geometria facial (processo de 3 a 5 segundos).
          Após a confirmação, o vetor facial é salvo com segurança na nuvem.
        </p>

        <Screenshot src="/docs/face-enrolment.png" caption="Tela de Cadastro de Biometria — posicionamento do rosto para mapeamento facial" />

        <h3 className="text-lg font-black text-slate-800 mt-6">2. Como Realizar o Check-in</h3>
        <p className="text-slate-600">
          Com a câmera iniciada na tela de <strong>Check-in Facial</strong>, o militar de serviço posiciona o dispositivo em direção ao rosto do prestador.
          O sistema identifica automaticamente a pessoa comparando com toda a base biométrica cadastrada.
          Ao reconhecer, exibe o nome do prestador e oferece as opções de <strong>Registrar Entrada</strong> ou <strong>Registrar Saída</strong>, conforme o estado atual do prestador no dia.
        </p>

        <Screenshot src="/docs/face-checkin.png" caption="Check-in Facial — identificação do prestador e botões de entrada/saída" />

        <h3 className="text-lg font-black text-slate-800 mt-6">3. Registro Automático com Comprovação</h3>
        <p className="text-slate-600">
          Após a confirmação do registro, as informações são inseridas <strong>automaticamente no cadastro do prestador</strong>.
          Cada registro biométrico inclui:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-slate-600 mt-2">
          <li>Data e hora exatos do check-in.</li>
          <li>Uma captura de tela com <strong>marca d'água</strong> contendo o tipo de registro (Entrada ou Saída), data e horário — servindo como comprovante visual inviolável.</li>
          <li>Rótulo de justificativa <em>BIOMETRIA</em> no histórico do prestador.</li>
          <li>As horas são calculadas e somadas ao total automaticamente assim que a saída é registrada.</li>
        </ul>

        <Screenshot src="/docs/face-comprovante.png" caption="Comprovante Biométrico — captura com marca d'água de data/hora gravada no histórico do prestador" />
      </div>
    )
  },
  {
    id: 'abastecimento',
    category: 'Gestão de Viaturas',
    title: 'Gestão de Frotas e Abastecimentos',
    icon: Fuel,
    tags: ['abastecimento', 'viatura', 'gasolina', 'combustível', 'kml', 'notas', 'cupons', 'bomba'],
    content: (
      <div className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          O módulo de controle de combustíveis serve para monitorar gastos e consumo de frota de forma fácil e rastreável,
          interligando viaturas a cupons fiscais escaneados por Leitura Inteligente.
        </p>

        <Screenshot src="/docs/abastecimento.png" caption="Módulo de Gestão de Frotas — lista de abastecimentos e controle de viaturas" />

        <div className="space-y-6 mt-4">
          <div className="border-l-4 border-blue-600 pl-4">
            <h4 className="font-black text-slate-800">1. Cadastrando Viaturas</h4>
            <p className="text-sm text-slate-600 mt-1">
              Primeiro, defina quais são os veículos do batalhão diretamente nesta aba, informando placa, modelo, odômetro atual, ano e tipo de combustível (flex ou diesel).
            </p>
          </div>

          <div className="border-l-4 border-blue-600 pl-4">
            <h4 className="font-black text-slate-800">2. Digitalizando o Cupom Fiscal</h4>
            <p className="text-sm text-slate-600 mt-1">
              Esqueça digitar quantidade de litros, tipo e valor manualmente. Utilize a câmera para escanear o Cupom Fiscal diretamente pelo celular.
              A Leitura Inteligente preenche automaticamente os valores, data, tipo de combustível e estabelecimento em instantes.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'relatorios-oficios',
    category: 'Ofícios',
    title: 'Emissão de Relatórios Padrão Judicial',
    icon: FileText,
    tags: ['relatório', 'ofício', 'juiz', 'imprimir', 'papel', 'processos', 'horas cumpridas', 'pdf', 'número', 'responsável'],
    content: (
      <div className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          O módulo de <strong>Relatórios</strong> elimina a necessidade de redigir ou montar documentos oficiais manualmente.
          Todas as informações de registro de horas, datas e identificação do prestador são trazidas automaticamente para o documento.
        </p>

        <Screenshot src="/docs/relatorio.png" caption="Emissão de Ofício — documento gerado automaticamente com dados do prestador e horas consolidadas" />

        <h3 className="text-lg font-black text-slate-800 mt-4">Como Emitir um Documento</h3>
        <ul className="list-decimal pl-5 space-y-2 text-slate-600">
          <li>Acesse a ficha do prestador ou o menu <strong>Relatórios</strong>.</li>
          <li>Selecione o tipo de documento: <strong>Ofício de Finalização</strong> ou <strong>Ofício de Andamento</strong>.</li>
          <li>Preencha apenas dois campos: <strong>Número do Ofício</strong> e <strong>Nome do Responsável pela assinatura</strong>.</li>
          <li>Todas as demais informações — horas cumpridas, saldo restante, datas de entradas e saídas, dados do prestador e identificação da unidade — são preenchidas automaticamente pelo sistema.</li>
          <li>Clique em <strong>Imprimir</strong> no navegador ou exporte diretamente como PDF, sem preocupação com bordas ou layouts desconfigurados.</li>
        </ul>

        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mt-4 flex items-start gap-3">
          <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-emerald-900 font-medium">
            O documento é gerado com Brasão oficial, identificação da unidade, parágrafos formais padronizados e rodapé com campo para assinatura — pronto para ser encaminhado ao juizado.
          </p>
        </div>
      </div>
    )
  },
];

const HelpCenter: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTopicId, setActiveTopicId] = useState<string>(HELP_DATA[0].id);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'yes' | 'no'>>({});

  const filteredTopics = useMemo(() => {
    if (!searchTerm.trim()) return HELP_DATA;
    const lowerSearch = searchTerm.toLowerCase();
    return HELP_DATA.filter(topic => {
      const matchTitle = topic.title.toLowerCase().includes(lowerSearch);
      const matchCategory = topic.category.toLowerCase().includes(lowerSearch);
      const matchTags = topic.tags.some(tag => tag.toLowerCase().includes(lowerSearch));
      return matchTitle || matchCategory || matchTags;
    });
  }, [searchTerm]);

  const activeTopic = useMemo(() => {
    const found = HELP_DATA.find(t => t.id === activeTopicId);
    if (found && filteredTopics.find(t => t.id === activeTopicId)) return found;
    return filteredTopics[0] || null;
  }, [activeTopicId, filteredTopics]);

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
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3">
          <Book className="text-blue-600" size={32} />
          Central de Ajuda e Documentação
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1 ml-11">
          Base de conhecimento oficial e suporte passo a passo do sistema.
        </p>
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

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-slate-100">

        {/* Sidebar Topics */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4 border-r-0 lg:border-r border-slate-100 pr-0 lg:pr-4 overflow-y-auto no-scrollbar max-h-[300px] lg:max-h-full shrink-0">
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
                      onClick={() => setActiveTopicId(topic.id)}
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar pl-0 lg:pl-6 pt-4 lg:pt-0">
          {activeTopic ? (
            <div className="max-w-3xl animate-in slide-in-from-right-4 fade-in duration-500" key={activeTopic.id}>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-black text-slate-500 uppercase tracking-widest mb-4">
                {activeTopic.category}
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 mb-8 leading-tight tracking-tight">
                {activeTopic.title}
              </h1>

              <div className="text-slate-700 documentation-content pb-12">
                {activeTopic.content}
              </div>

              <div className="mt-12 pt-6 border-t border-slate-100 flex items-center justify-between">
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
