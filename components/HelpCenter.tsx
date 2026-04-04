import React, { useState, useMemo } from 'react';
import { Search, Book, Users, ScanFace, Fuel, FileText, Settings as SettingsIcon, AlertCircle, ChevronRight, CheckCircle2, ChevronDown, MonitorPlay, Sparkles } from 'lucide-react';

type Topic = {
  id: string;
  category: string;
  title: string;
  icon: any;
  content: React.ReactNode;
  tags: string[];
};

const HELP_DATA: Topic[] = [
  {
    id: 'intro-painel',
    category: 'Visão Geral',
    title: 'Painel Principal (Dashboard)',
    icon: MonitorPlay,
    tags: ['painel', 'dashboard', 'início', 'gráficos', 'resumo'],
    content: (
      <div className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          O <strong>Painel Principal</strong> (Dashboard) é a central de comando do sistema de Gestão CBM. 
          Aqui você encontra um resumo panorâmico de todas as operações ativas.
        </p>
        <h3 className="text-lg font-black text-slate-800 mt-6">O que você encontra aqui:</h3>
        <ul className="list-disc pl-5 space-y-2 text-slate-600">
          <li><strong>Estatísticas em Tempo Real:</strong> Número de prestadores ativos, horas totais a cumprir, abastecimentos pendentes (em análise).</li>
          <li><strong>Alertas de Inatividade:</strong> O sistema de inteligência dispara comunicados visuais na cor vermelha para prestadores que estão há mais de 7 dias sem lançar registro de evolução do serviço.</li>
          <li><strong>Atalhos Rápidos:</strong> Botões que levam você diretamente para o perfil de prestadores em alerta, ou listas de combustíveis aguardando conferência.</li>
        </ul>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4 flex items-start gap-3">
          <CheckCircle2 className="text-blue-600 shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-blue-900 font-medium">
            <strong>Dica de Produtividade:</strong> Use o painel diariamente como sua "triagem". Resolva os gargalos em vermelho primeiro antes de iniciar novas tarefas ou cadastros.
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
    tags: ['prestador', 'cadastro', 'novo', 'listar', 'processo', 'edição', 'horas'],
    content: (
      <div className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          O módulo de <strong>Prestadores</strong> permite acompanhar aqueles que estão cumprindo Serviço Comunitário no quartel.
        </p>
        <h3 className="text-lg font-black text-slate-800 mt-4">Como Criar um Novo Cadastro:</h3>
        <ul className="list-decimal pl-5 space-y-2 text-slate-600">
          <li>Clique no botão <strong>+ Novo Cadastro</strong> no canto superior direito.</li>
          <li>Preencha os dados obrigatórios como Nome, Número do Processo e o total de horas a cumprir estabelecido pelo juiz.</li>
          <li>Ao salvar, o sistema inicializa um Dossiê na linha do tempo informando que você registrou a entrada daquela pessoa.</li>
        </ul>

        <h3 className="text-lg font-black text-slate-800 mt-6">Estados do Prestador:</h3>
        <p className="text-slate-600">Os prestadores são distribuídos em três abas usando status coloridos:</p>
        <div className="space-y-3 mt-2">
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border">
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded text-xs font-black">ATIVO</span>
            <span className="text-sm text-slate-600">Em andamento e cumprindo a carga horária na unidade.</span>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border">
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-black">FINALIZADO</span>
            <span className="text-sm text-slate-600">Completaram o seu plano de horas em 100%.</span>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border">
            <span className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs font-black">DEVOLVIDO</span>
            <span className="text-sm text-slate-600">Processo encerrado prematuramente (por quebra disciplinar, abandono ou ofício do juizado).</span>
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
    tags: ['digitalizar', 'folha', 'inteligência', 'ia', 'frequência', 'horas', 'ponto', 'foto'],
    content: (
      <div className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          Para que o sistema some as horas automáticas num processo, utilizamos nossa tecnologia de <strong>Processamento Inteligente (OCR avançado)</strong>, responsável por ler o papel físico onde os horários foram manusalmente registrados.
        </p>

        <h3 className="text-lg font-black text-slate-800 mt-4">Como Digitalizar Documentos</h3>
        <ul className="list-decimal pl-5 space-y-2 text-slate-600 mb-6">
          <li>Aesse a ficha de um <strong>Prestador</strong> na lista.</li>
          <li>Desça até a aba <strong>Lançamentos e Horas</strong> e clique em <em>Digitalizar Folha</em>.</li>
          <li>A câmera abrirá (se for no celular) ou um seletor de arquivos aparecerá. Capte a foto da folha em um local <strong>bem iluminado</strong>, priorizando um enquadramento sem fundos irregulares.</li>
          <li>Na segunda tela, utilize as âncoras para <strong>Mapear e Recortar</strong> as bordas isolando apenas a tabela/dados.</li>
          <li>Aperte *"Ler e Analisar"*. O motor irá rodar o processamento visual da geometria das palavras por alguns instantes.</li>
          <li>Todos os dias e horas descem para avaliação final. <strong>Confira o somatório total no topo se bate com os seus cálculos. Você tem liberdade para editar eventuais linhas lidas de forma errônea.</strong></li>
          <li>Aperte Salvar; A folha e os tempos são lançados permanentemente no perfil do prestador.</li>
        </ul>

        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mt-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-amber-900 font-medium">
              Sempre realize uma conferência se o documento não apresentar caligrafia muito rasurada. A tecnologia ajuda a poupar tempo, mas a verificação do Militar operador continua soberana no momento de assinar e confirmar os dados contábeis.
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
    tags: ['biometria', 'checkin', 'rosto', 'facial', 'câmera', 'enrolment', 'cadastrar'],
    content: (
      <div className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          O sistema pode substituir cadernos de papel e o controle por OCR instalando-se um quiosque de <strong>Reconhecimento Facial (Check-in Facial)</strong> para os prestadores na recepção ou corpo da guarda.
        </p>
        
        <h3 className="text-lg font-black text-slate-800 mt-4">1. Enrolment (Cadastrando a Biometria)</h3>
        <p className="text-slate-600">
          Para que o prestador seja reconhecido por vídeo livre, ele precisa ter a sua "assinatura de vetor facial" mapeada. Na página de detalhes do prestador, ao lado da foto de perfil, clique em <strong>Cadastrar Rosto</strong>. 
          O usuário deverá ser posto em frente a câmera até as marcações de captura mapearem sua geometria (aguarde de 3 a 5 segundos de análise estática). Assim que preenchido, ele está aprovado na biometria do banco de dados.
        </p>

        <h3 className="text-lg font-black text-slate-800 mt-6">2. O Check-in em Sí</h3>
        <p className="text-slate-600">
          Ao deixar um computador aberto na página <strong>"Check-in Facial"</strong> usando a interface do menu lateral, os prestadores poderão sozinhos chegar diante da tela. 
          O sistema detectará o rosto organicamente comparando com toda a base de dados. Quando identificar, dirá "Bom dia / Boa tarde", marcando a ENTRADA, ou então a SAÍDA. 
        </p>
        <p className="text-slate-600">Esses registros descem com o rótulo de <em>Justificativa: BIOMETRIA</em>, injetado de modo assíncrono na nuvem de forma nativa e inviolável, computando as horas automáticas todos os dias que vierem.</p>
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
          O controle de combustíveis serve para monitorar gastos e consumo de frota de forma fácil e rastreável, interligando viaturas a cupons escaneados por Leitura Inteligente.
        </p>

        <div className="space-y-6 mt-4">
          <div className="border-l-4 border-blue-600 pl-4">
            <h4 className="font-black text-slate-800">1. Cadastrando Viaturas</h4>
            <p className="text-sm text-slate-600 mt-1">
              Primeiro defina quais são os veículos do batalhão de Sapucaia nas configurações ou direto nesta aba, inserido odômetro atual, ano, se é flex/diesel.
            </p>
          </div>
          
          <div className="border-l-4 border-blue-600 pl-4">
            <h4 className="font-black text-slate-800">2. Mapeamento de OCR do Cupom (Digitalizar Nota Fiscal)</h4>
            <p className="text-sm text-slate-600 mt-1">
              Esqueça de ter que digitar quantidade de litros, tipo e valor do posto manualmente. Utilize a câmera do pwa para escanear um Cupom Fiscal. A leitura inteligente preenche valores, data e local instantaneamente.
            </p>
          </div>

          <div className="border-l-4 border-blue-600 pl-4">
            <h4 className="font-black text-slate-800">3. Fluxo de Conferência</h4>
            <p className="text-sm text-slate-600 mt-1">
              Pelo painel, as notas fiscais cadastradas descem sem confirmação. O Chefe do Transporte, Setor de Finanças ou Encarregado Administrativo pode visualizar as notas registradas pelo motorista em campo, conferir os valores de Odômetro (que indicam consumo kml em tela) e o print original de imagem para atestar e fechar o abastecimento do dia. Validadas as medições, o abastecimento é efetivado.
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
    tags: ['relatório', 'ofício', 'juiz', 'imprimir', 'papel', 'processos', 'horas cumpridas', 'pdf'],
    content: (
      <div className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          O módulo <strong>Relatórios</strong> tira de você a necessidade de manusear ou de fazer "Ctrl+C Ctrl+V" de horas em um Word todas as vezes.
        </p>
        <p className="text-slate-600">
          Você pode simplesmente abrir o perfil do prestador desejado (ou usar a aba exclusiva de Relatórios), e escolher a predefinição <strong>"Ofício de Finalização"</strong> ou <strong>"Ofício de Andamento"</strong>.
          O sistema gera em tela um documento completo da instituição padronizado (com Brasão, identificação oficial VEPMA, horários consolidados, parágrafos formais da brigada civil e assinador automático em rodapé). 
        </p>
        <div className="bg-slate-50 p-4 border rounded-xl flex items-center justify-between mt-4">
          <p className="text-sm font-bold text-slate-600">Apenas aperte IMPRIMIR no navegador, ou gere e exporte o arquivo nativamente como PDF sem rasuras de bordas ou layouts tortos.</p>
        </div>
      </div>
    )
  },
  {
    id: 'faq-1',
    category: 'FAQ / Dúvidas Frequentes',
    title: 'Perguntas Frequentes do Sistema (FAQ)',
    icon: AlertCircle,
    tags: ['faq', 'dúvidas', 'erros', 'problemas', 'ajuda', 'suporte', 'como fazer'],
    content: (
      <div className="space-y-2">
        <details className="group border border-slate-200 bg-white rounded-xl p-4 cursor-pointer">
          <summary className="font-black text-slate-800 outline-none list-none flex justify-between items-center group-open:text-blue-600">
            O aplicativo não aparece com ícone correto / Não abre, fica tudo branco?
            <ChevronDown className="group-open:rotate-180 transition-transform text-slate-400 group-open:text-blue-600" size={18} />
          </summary>
          <div className="mt-4 text-sm text-slate-600 leading-relaxed">
            Problemas de "Tela Branca" ou de versão que não reage ocorrem devido ao "Cache Pesado" do Navegador, que tentou instalar sem sucesso por falha de internet os "Service Workers". <strong>Solução Rápida:</strong> Vá nas configurações de Aplicativos do celular (ou configurações do navegador de iOS/Safari), clique em limpar "Armazenamento do Site/Cache" ou simplesmente desinstale o app da tela de início e adicione-o novamente por meio do link original. 
          </div>
        </details>
        
        <details className="group border border-slate-200 bg-white rounded-xl p-4 cursor-pointer mt-3">
          <summary className="font-black text-slate-800 outline-none list-none flex justify-between items-center group-open:text-blue-600">
            A Leitura Inteligente (OCR) está demorando além de 30-40 segundos?
            <ChevronDown className="group-open:rotate-180 transition-transform text-slate-400 group-open:text-blue-600" size={18} />
          </summary>
          <div className="mt-4 text-sm text-slate-600 leading-relaxed">
            Ao digitalizar um documento, o Motor de Leitura pode estar sofrendo para extrair informações puras pois a imagem está desfocada ou o acesso da internet principal local está falhando a rota com nossos servidores remotos. <strong>Solução:</strong> Se uma análise demorar demais ou travar, feche (x) o processo e retome tirando uma foto com maior contraste e foco puro na folha sem ruídos visuais paralelos na mesa/fundo.
          </div>
        </details>

        <details className="group border border-slate-200 bg-white rounded-xl p-4 cursor-pointer mt-3">
          <summary className="font-black text-slate-800 outline-none list-none flex justify-between items-center group-open:text-blue-600">
            Posso estender as permissões de um Operador do Corpo da Guarda?
            <ChevronDown className="group-open:rotate-180 transition-transform text-slate-400 group-open:text-blue-600" size={18} />
          </summary>
          <div className="mt-4 text-sm text-slate-600 leading-relaxed">
            Apenas um Master/Admin (ex: o usuário master criado na nuvem) pode acessar todos os cantos. Se um novo soldado entrar na escala, e ele estiver enxergando apenas "Check in Facial", será necessário que um conta de nível Administrador promova ele alterando suas permissões oficiais na própria infraestrutura em banco de dados Supabase/Auth. 
          </div>
        </details>
      </div>
    )
  }
];

const HelpCenter: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTopicId, setActiveTopicId] = useState<string>(HELP_DATA[0].id);

  const filteredTopics = useMemo(() => {
    if (!searchTerm.trim()) return HELP_DATA;
    const lowerSearch = searchTerm.toLowerCase();
    
    return HELP_DATA.filter(topic => {
      const matchTitle = topic.title.toLowerCase().includes(lowerSearch);
      const matchCategory = topic.category.toLowerCase().includes(lowerSearch);
      const matchTags = topic.tags.some(tag => tag.toLowerCase().includes(lowerSearch));
      
      // Basic text search in content strings wasn't feasible due to JSX structure, 
      // but tags, title and category cover 99% of search paths
      return matchTitle || matchCategory || matchTags;
    });
  }, [searchTerm]);

  const activeTopic = HELP_DATA.find(t => t.id === activeTopicId) || filteredTopics[0];

  // Group filtered results by category for the sidebar
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
        <div className="w-full lg:w-1/3 flex flex-col gap-4 border-r-0 lg:border-r border-slate-100 pr-0 lg:pr-4 overflow-y-auto no-scrollbar max-h-[300px] lg:max-h-full">
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
            <div className="max-w-3xl animate-in slide-in-from-right-4 fade-in duration-500">
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
                <p className="text-xs font-medium text-slate-400">Este tópico foi útil?</p>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-slate-50 text-slate-600 text-xs font-black uppercase rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition-colors border border-slate-100">Sim</button>
                  <button className="px-4 py-2 bg-slate-50 text-slate-600 text-xs font-black uppercase rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors border border-slate-100">Não</button>
                </div>
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
