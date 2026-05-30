import React, { useState, useMemo, useEffect } from 'react';
import { ServiceSwap, Operator } from '../types';
import {
  X, Printer, Filter, Calendar, CheckCircle2, XCircle, Clock,
  ArrowLeftRight, FileText, User, ChevronRight,
} from 'lucide-react';

interface EnrichedSwap extends ServiceSwap {
  escaladoName?: string;
  substitutoName?: string;
  aprovadorName?: string;
}

interface Props {
  swaps: EnrichedSwap[];
  currentUser: Operator;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  aguardando_substituto: 'Aguardando Substituto',
  recusado_substituto:   'Recusado pelo Substituto',
  pendente:              'Pendente',
  aprovado:              'Aprovado',
  reprovado:             'Reprovado',
  cancelado:             'Cancelado',
};

const STATUS_PRINT_COLOR: Record<string, string> = {
  aguardando_substituto: '#0284c7',
  recusado_substituto:   '#dc2626',
  pendente:              '#d97706',
  aprovado:              '#16a34a',
  reprovado:             '#dc2626',
  cancelado:             '#94a3b8',
};

const FUNCAO_PRINT_COLOR: Record<string, string> = {
  CG:    '#dc2626',
  COV:   '#2563eb',
  Linha: '#16a34a',
  COBOM: '#9333ea',
};

const ALL_STATUSES = [
  { value: 'todos',                 label: 'Todos os Status'             },
  { value: 'aguardando_substituto', label: 'Aguardando Substituto'       },
  { value: 'recusado_substituto',   label: 'Recusado pelo Substituto'    },
  { value: 'pendente',              label: 'Pendente (Aprovação Admin)'  },
  { value: 'aprovado',              label: 'Aprovado'                    },
  { value: 'reprovado',             label: 'Reprovado'                   },
  { value: 'cancelado',             label: 'Cancelado'                   },
];

const ServiceSwapReport: React.FC<Props> = ({ swaps, currentUser, onClose }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState(today);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const dateFiltered = useMemo(() => {
    return swaps.filter(s => {
      if (!s.data) return true; // Mantém trocas sem data no relatório
      if (dateFrom && s.data < dateFrom) return false;
      if (dateTo   && s.data > dateTo)   return false;
      return true;
    });
  }, [swaps, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    return dateFiltered.filter(s => {
      if (statusFilter.length > 0 && !statusFilter.includes(s.status)) return false;
      return true;
    }).sort((a, b) => {
      const dateA = a.data || '';
      const dateB = b.data || '';
      return dateB.localeCompare(dateA);
    });
  }, [dateFiltered, statusFilter]);

  const handlePrint = () => window.print();

  const fmtDate = (d: string) =>
    d && d !== '1970-01-01' ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : 'A definir';

  const emitDate = new Date().toLocaleString('pt-BR');

  return (
    <>
      {/* ── Screen overlay controls (hidden on print) ── */}
      <div className="fixed inset-0 bg-slate-950/90 z-[5000] flex flex-col overflow-auto print:hidden">
        {/* Top toolbar */}
        <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 uppercase text-sm tracking-tight">Relatório de Trocas de Serviço</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Pré-visualização para impressão / PDF</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 flex-1 justify-center">
            {/* Date from */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Calendar size={13} className="text-slate-400 shrink-0" />
              <span className="text-[10px] font-black text-slate-400 uppercase">De:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none"
              />
            </div>
            {/* Date to */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Calendar size={13} className="text-slate-400 shrink-0" />
              <span className="text-[10px] font-black text-slate-400 uppercase">Até:</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none"
              />
            </div>
            {/* Status Multiselect */}
            <div className="relative" ref={statusDropdownRef}>
              <button
                type="button"
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Filter size={13} className="text-slate-400 shrink-0" />
                <span>
                  {statusFilter.length === 0
                    ? 'Todos os Status'
                    : statusFilter.length === 1
                    ? STATUS_LABELS[statusFilter[0]]
                    : `${statusFilter.length} Status Selecionados`}
                </span>
                <ChevronRight
                  size={12}
                  className={`text-slate-400 transition-transform ${isStatusDropdownOpen ? 'rotate-90' : ''}`}
                />
              </button>

              {isStatusDropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-[6000] p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar Status</span>
                    {statusFilter.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setStatusFilter([])}
                        className="text-[9px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-wider"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {ALL_STATUSES.filter(s => s.value !== 'todos').map(opt => {
                      const isChecked = statusFilter.includes(opt.value);
                      return (
                        <label
                          key={opt.value}
                          className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors text-xs font-bold text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setStatusFilter(statusFilter.filter(v => v !== opt.value));
                              } else {
                                setStatusFilter([...statusFilter, opt.value]);
                              }
                            }}
                            className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-200 active:scale-95"
            >
              <Printer size={15} /> Imprimir / PDF
            </button>
            <button
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-auto p-6 flex justify-center">
          <div className="w-full max-w-6xl">
            <ReportDocument
              filtered={filtered}
              dateFiltered={dateFiltered}
              statusFilter={statusFilter}
              dateFrom={dateFrom}
              dateTo={dateTo}
              fmtDate={fmtDate}
              emitDate={emitDate}
              currentUser={currentUser}
            />
          </div>
        </div>
      </div>

      {/* ── Printable document (shown only on print) ── */}
      <div className="hidden print:block">
        <ReportDocument
          filtered={filtered}
          dateFiltered={dateFiltered}
          statusFilter={statusFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          fmtDate={fmtDate}
          emitDate={emitDate}
          currentUser={currentUser}
        />
      </div>
    </>
  );
};

/* ─── Inner document component ─────────────────────── */
interface DocProps {
  filtered: EnrichedSwap[];
  dateFiltered: EnrichedSwap[];
  statusFilter: string[];
  dateFrom: string;
  dateTo: string;
  fmtDate: (d: string) => string;
  emitDate: string;
  currentUser: Operator;
}

const ReportDocument: React.FC<DocProps> = ({
  filtered, dateFiltered, statusFilter, dateFrom, dateTo, fmtDate, emitDate, currentUser,
}) => {
  const counts = {
    total:    dateFiltered.length,
    aprovado: dateFiltered.filter(s => s.status === 'aprovado').length,
    pendente: dateFiltered.filter(s => s.status === 'pendente').length,
    reprovado: dateFiltered.filter(s => s.status === 'reprovado').length,
    aguardando: dateFiltered.filter(s => s.status === 'aguardando_substituto').length,
    recusado: dateFiltered.filter(s => s.status === 'recusado_substituto').length,
    cancelado: dateFiltered.filter(s => s.status === 'cancelado').length,
  };

  return (
    <div
      id="report-document"
      className="bg-white shadow-2xl rounded-2xl overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── HEADER ── */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)', padding: '32px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 10 }}>
                <ArrowLeftRight size={24} color="white" />
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>
                  9º BBM — Gestão CBM RS
                </p>
                <h1 style={{ color: 'white', fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, lineHeight: 1.2 }}>
                  Relatório de Trocas de Serviço
                </h1>
              </div>
            </div>
            {/* Filter summary */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {statusFilter.length > 0 ? (
                <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 8, padding: '3px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                  Status: {statusFilter.map(s => STATUS_LABELS[s] || s).join(', ')}
                </span>
              ) : (
                <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 8, padding: '3px 10px', fontSize: 10, fontWeight: 700 }}>
                  Todos os Status
                </span>
              )}
              {dateFrom && (
                <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 8, padding: '3px 10px', fontSize: 10, fontWeight: 700 }}>
                  De: {fmtDate(dateFrom)}
                </span>
              )}
              {dateTo && (
                <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 8, padding: '3px 10px', fontSize: 10, fontWeight: 700 }}>
                  Até: {fmtDate(dateTo)}
                </span>
              )}
              {statusFilter.length === 0 && !dateFrom && (
                <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 8, padding: '3px 10px', fontSize: 10, fontWeight: 700 }}>
                  Todos os registros
                </span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Emitido em</p>
            <p style={{ color: 'white', fontSize: 12, fontWeight: 800, margin: '2px 0 0' }}>{emitDate}</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', margin: '8px 0 0' }}>Emitido por</p>
            <p style={{ color: 'white', fontSize: 12, fontWeight: 800, margin: '2px 0 0' }}>{currentUser.rank} {currentUser.warName}</p>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginTop: 24 }}>
          {[
            { label: 'Total',        value: counts.total,     color: '#fff' },
            { label: 'Aprovados',    value: counts.aprovado,  color: '#4ade80' },
            { label: 'Ag. Admin',    value: counts.pendente,  color: '#fbbf24' },
            { label: 'Ag. Subst.',   value: counts.aguardando,color: '#38bdf8' },
            { label: 'Recusados',    value: counts.recusado + counts.reprovado, color: '#f87171' },
            { label: 'Cancelados',   value: counts.cancelado, color: '#94a3b8' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
              <p style={{ color: stat.color, fontSize: 20, fontWeight: 900, margin: 0, lineHeight: 1 }}>{stat.value}</p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', margin: '4px 0 0', letterSpacing: '0.05em' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TABLE ── */}
      {filtered.length === 0 ? (
        <div style={{ padding: 64, textAlign: 'center', color: '#94a3b8' }}>
          <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: 13 }}>Nenhum registro encontrado para os filtros selecionados.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {[
                  'Status', 'Função', 'Data / Horário', 'Escalado',
                  'Substituto', 'Etapa Substituto', 'Aprovador',
                ].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left',
                    fontSize: 9, fontWeight: 900, color: '#94a3b8',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((swap, i) => (
                <tr key={swap.id} style={{
                  background: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                  borderBottom: '1px solid #f1f5f9',
                }}>
                  {/* Status */}
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 8px', borderRadius: 6,
                      fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
                      color: STATUS_PRINT_COLOR[swap.status] || '#64748b',
                      background: (STATUS_PRINT_COLOR[swap.status] || '#64748b') + '18',
                      border: `1px solid ${(STATUS_PRINT_COLOR[swap.status] || '#64748b')}33`,
                    }}>
                      {swap.status === 'aprovado' && <CheckCircle2 size={9} />}
                      {(swap.status === 'reprovado' || swap.status === 'recusado_substituto' || swap.status === 'cancelado') && <XCircle size={9} />}
                      {(swap.status === 'pendente' || swap.status === 'aguardando_substituto') && <Clock size={9} />}
                      {STATUS_LABELS[swap.status]}
                    </span>
                  </td>

                  {/* Função */}
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 8px', borderRadius: 6,
                      fontSize: 9, fontWeight: 900, textTransform: 'uppercase',
                      color: FUNCAO_PRINT_COLOR[swap.funcao] || '#64748b',
                      background: (FUNCAO_PRINT_COLOR[swap.funcao] || '#64748b') + '18',
                      border: `1px solid ${(FUNCAO_PRINT_COLOR[swap.funcao] || '#64748b')}33`,
                    }}>{swap.funcao}</span>
                  </td>

                  {/* Data/Horário */}
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'block', fontWeight: 700, color: '#1e293b' }}>
                      {fmtDate(swap.data)}
                    </span>
                    <span style={{ display: 'block', fontSize: 9, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>
                      {swap.data === '1970-01-01' ? 'Horário a definir' : `${swap.horarioInicio}h → ${swap.horarioFim}h`}
                    </span>
                  </td>

                  {/* Escalado */}
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{swap.escaladoName}</span>
                  </td>

                  {/* Substituto */}
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{swap.substitutoName}</span>
                  </td>


                  {/* Etapa Substituto */}
                  <td style={{ padding: '10px 14px', maxWidth: 180 }}>
                    {swap.status === 'aguardando_substituto' && (
                      <span style={{ color: '#0284c7', fontWeight: 700, fontSize: 10 }}>⏳ Aguardando aceite</span>
                    )}
                    {swap.status === 'recusado_substituto' && (
                      <div>
                        <span style={{ color: '#dc2626', fontWeight: 800, fontSize: 10, display: 'block' }}>✗ Recusado</span>
                        {swap.observacao && (
                          <span style={{ color: '#64748b', fontSize: 9, fontStyle: 'italic', display: 'block', marginTop: 2 }}>
                            "{swap.observacao}"
                          </span>
                        )}
                      </div>
                    )}
                    {['pendente', 'aprovado', 'reprovado', 'cancelado'].includes(swap.status) && (
                      <span style={{ color: '#16a34a', fontWeight: 800, fontSize: 10 }}>✓ Aceito</span>
                    )}
                    {!['aguardando_substituto','recusado_substituto','pendente','aprovado','reprovado','cancelado'].includes(swap.status) && (
                      <span style={{ color: '#94a3b8', fontSize: 10 }}>—</span>
                    )}
                  </td>

                  {/* Aprovador */}
                  <td style={{ padding: '10px 14px', maxWidth: 180 }}>
                    {swap.aprovadorName ? (
                      <div>
                        <span style={{
                          display: 'block', fontWeight: 700, fontSize: 10,
                          color: swap.status === 'aprovado' ? '#16a34a' : (swap.status === 'reprovado' || swap.status === 'cancelado') ? '#dc2626' : '#64748b',
                        }}>
                          {swap.status === 'aprovado' ? '✓ ' : (swap.status === 'reprovado' || swap.status === 'cancelado') ? '✗ ' : ''}{swap.aprovadorName}
                        </span>
                        {swap.observacao && !['recusado_substituto'].includes(swap.status) && (
                          <span style={{ color: '#64748b', fontSize: 9, fontStyle: 'italic', display: 'block', marginTop: 2 }}>
                            "{swap.observacao}"
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: '#cbd5e1', fontSize: 10 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{
        padding: '20px 40px', borderTop: '1px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#f8fafc',
      }}>
        <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          Gestão CBM RS — Sistema de Gestão do 9º BBM
        </p>
        <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, margin: 0 }}>
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''} · Emitido em {emitDate}
        </p>
      </div>
    </div>
  );
};

export default ServiceSwapReport;
