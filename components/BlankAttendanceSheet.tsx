import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Provider, MonthlyEvaluation, AttendanceRecord } from '../types';
import { ArrowLeft, Printer, X, Clock, MapPin, User, ScanFace, Calendar, AlertCircle, ShieldCheck, FileText, CheckCircle2, Navigation, Map } from 'lucide-react';
import { formatDateBR, formatMinutesToHHMM } from '../utils/timeUtils';
import GeoMapViewer from './GeoMapViewer';

const getShortName = (name: string) => {
  if (!name) return '';
  const cleanParts = name.trim().split(/\s+/).filter(Boolean);
  if (cleanParts.length <= 2) return name.toUpperCase();
  return `${cleanParts[0]} ${cleanParts[cleanParts.length - 1]}`.toUpperCase();
};

interface AttendanceSheetPrintProps {
  provider: Provider;
  records: AttendanceRecord[];
  month: string;
  year: string;
  evaluation: MonthlyEvaluation | null;
  onShowRecordDetails?: (record: AttendanceRecord) => void;
}

export const AttendanceSheetPrint: React.FC<AttendanceSheetPrintProps> = ({
  provider,
  records,
  month,
  year,
  evaluation,
  onShowRecordDetails
}) => {
  const displayRows = useMemo(() => {
    const rows = [...records];
    const emptyNeeded = Math.max(0, 10 - rows.length);
    const emptyArray = Array.from({ length: emptyNeeded });
    return { records: rows, empty: emptyArray };
  }, [records]);

  const renderOption = (value?: boolean, expected?: boolean) => {
    if (value === undefined) return ' ';
    return value === expected ? 'X' : ' ';
  };

  return (
    <div 
      className="bg-white mx-auto print:p-0"
      style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', color: '#000', width: '100%', boxSizing: 'border-box' }}
    >
      {/* Cabeçalho */}
      <div className="flex items-center gap-4 mb-6">
        <img 
          src="/brasao.png" 
          alt="Brasão Estado" 
          style={{ width: '65px', height: 'auto', display: 'block' }}
        />
        <div className="flex flex-col" style={{ fontFamily: '"Times New Roman", Times, serif', width: 'fit-content' }}>
          <div style={{ fontSize: '7.8pt', letterSpacing: '0.04em', lineHeight: '1', whiteSpace: 'nowrap' }}>ESTADO DO RIO GRANDE DO SUL</div>
          <div style={{ fontSize: '14.5pt', letterSpacing: '0.015em', lineHeight: '1', whiteSpace: 'nowrap' }}>PODER JUDICIÁRIO</div>
        </div>
      </div>

      <div className="mb-4 leading-tight">
        <div>Comarca de Sapucaia do Sul – Vara de Execução Criminais</div>
        <div>Programa Prestação de Serviços à Comunidade (PSC)</div>
      </div>

      {/* Tabela Principal */}
      <table className="w-full border-collapse mb-6 text-slate-900 frequency-table" style={{ border: '1px solid black' }}>
        <tbody>
          {/* Título */}
          <tr>
            <td colSpan={5} className="font-bold text-center uppercase py-1" style={{ border: '1px solid black', fontSize: '11pt', color: '#000000', backgroundColor: '#f8fafc' }}>
              FOLHA DE FREQUÊNCIA
            </td>
          </tr>
          
          {/* Informações 1 (Processo e Mês) */}
          <tr>
            <td colSpan={5} className="p-0" style={{ border: '1px solid black' }}>
              <div className="flex w-full">
                <div className="flex-1 py-1 px-2 border-r border-black flex items-center gap-1 overflow-hidden whitespace-nowrap">
                  <span className="font-bold">Processo nº:</span> 
                  <span>{provider.processNumber || '____________________'}</span>
                </div>
                <div className="flex-1 py-1 px-2 flex items-center gap-1 overflow-hidden whitespace-nowrap">
                  <span className="font-bold">Mês de cumprimento:</span> 
                  <span className="font-bold text-blue-900">{month} / {year}</span>
                </div>
              </div>
            </td>
          </tr>
          
          {/* Nome */}
          <tr>
            <td colSpan={5} className="py-1 px-2" style={{ border: '1px solid black' }}>
              <span className="font-bold">Nome do Prestador:</span> <span className="uppercase">{provider.name}</span>
            </td>
          </tr>
          
          {/* Telefone */}
          <tr>
            <td colSpan={5} className="py-1 px-2" style={{ border: '1px solid black' }}>
              <span className="font-bold">Telefone:</span> <span>{provider.phone || '____________________'}</span>
            </td>
          </tr>
          
          {/* Endereço */}
          <tr>
            <td colSpan={5} className="py-1 px-2" style={{ border: '1px solid black' }}>
              <span className="font-bold">Endereço:</span> <span>{provider.address || '____________________'}</span>
            </td>
          </tr>
          
          {/* Entidade */}
          <tr>
            <td colSpan={5} className="py-1 px-2" style={{ border: '1px solid black' }}>
              <span className="font-bold">Entidade Conveniada:</span> <span>Corpo de Bombeiros Militar de Sapucaia do Sul</span>
            </td>
          </tr>
          
          {/* E-mail */}
          <tr>
            <td colSpan={5} className="py-1 px-2" style={{ border: '1px solid black' }}>
              <span className="font-bold">E-mail Entidade Conveniada:</span> <span>sapucaiadosul@cbm.rs.gov.br</span>
            </td>
          </tr>

          {/* Cabeçalho da Grade */}
          <tr className="font-bold text-center" style={{ fontSize: '11pt', backgroundColor: '#f8fafc' }}>
            <td className="py-1" style={{ border: '1px solid black', width: '18%' }}>Data</td>
            <td className="py-1" style={{ border: '1px solid black', width: '11%' }}>Chegada</td>
            <td className="py-1" style={{ border: '1px solid black', width: '11%' }}>Saída</td>
            <td className="py-1" style={{ border: '1px solid black', width: '35%' }}>Assinatura do prestador</td>
            <td className="py-1" style={{ border: '1px solid black', width: '25%' }}>
              <div className="flex flex-col items-center justify-center leading-none">
                <span>Assinatura do</span>
                <span>responsável</span>
              </div>
            </td>
          </tr>

          {/* Linhas de registros preenchidos */}
          {displayRows.records.map((r) => {
            const isJustification = r.type === 'justification';
            const providerNameShort = getShortName(provider.name);
            
            // Assinatura do prestador stamp
            let providerSig = null;
            if (isJustification) {
              providerSig = (
                <div style={{ fontSize: '7.5pt', color: '#b45309', fontWeight: 'bold', textTransform: 'uppercase', border: '1px dashed #b45309', borderRadius: '4px', padding: '1px 4px', textAlign: 'center', lineHeight: '1.1', margin: '0 auto', width: 'fit-content', backgroundColor: '#fef3c7' }}>
                  JUSTIFICADO
                </div>
              );
            } else if (r.id && r.id.startsWith('face-')) {
              providerSig = (
                <div style={{ fontSize: '6.2pt', color: '#047857', fontWeight: 'bold', textTransform: 'uppercase', border: '1px dashed #047857', borderRadius: '4px', padding: '1px 4px', textAlign: 'center', lineHeight: '1.1', margin: '0 auto', width: 'fit-content', backgroundColor: '#ecfdf5' }}>
                  [✓] ASSINATURA BIOMÉTRICA: {providerNameShort}
                </div>
              );
            } else {
              providerSig = (
                <div style={{ fontSize: '6.2pt', color: '#1d4ed8', fontWeight: 'bold', textTransform: 'uppercase', border: '1px dashed #1d4ed8', borderRadius: '4px', padding: '1px 4px', textAlign: 'center', lineHeight: '1.1', margin: '0 auto', width: 'fit-content', backgroundColor: '#eff6ff' }}>
                  [✓] PRESENÇA CONFIRMADA: {providerNameShort}
                </div>
              );
            }

            // Assinatura do responsável stamp
            let responsibleSig = null;
            if (isJustification) {
              responsibleSig = (
                <div style={{ fontSize: '7pt', color: '#b45309', fontWeight: 'bold', textTransform: 'uppercase', border: '1px dashed #b45309', borderRadius: '4px', padding: '1px 4px', textAlign: 'center', lineHeight: '1.1', margin: '0 auto', width: 'fit-content', backgroundColor: '#fef3c7' }}>
                  DOC. ANEXADO
                </div>
              );
            } else {
              // Parse operator names
              let entryOp = '';
              let exitOp = '';
              if (r.reason) {
                try {
                  const parsed = JSON.parse(r.reason);
                  entryOp = parsed.entryOperator || '';
                  exitOp = parsed.exitOperator || '';
                } catch(e) {}
              }
              
              // Fallback if no operator stored
              if (!entryOp && !exitOp) {
                if (r.id && r.id.startsWith('face-')) {
                  entryOp = 'CB COBOM';
                  exitOp = 'CB COBOM';
                } else {
                  entryOp = evaluation?.evaluatedBy || '1º SGT GONCZOROSKI';
                  exitOp = evaluation?.evaluatedBy || '1º SGT GONCZOROSKI';
                }
              }

              const opText = entryOp === exitOp || !exitOp 
                ? entryOp 
                : `${entryOp} / ${exitOp}`;

              const isFace = r.id && r.id.startsWith('face-');
              const badgeColor = isFace ? '#047857' : '#1d4ed8';
              const badgeBg = isFace ? '#ecfdf5' : '#eff6ff';
              const label = isFace ? `[✓] VALIDADO POR: ${opText}` : `[✓] HOMOLOGADO POR: ${opText}`;

              responsibleSig = (
                <div style={{ fontSize: '6.2pt', color: badgeColor, fontWeight: 'bold', textTransform: 'uppercase', border: `1px dashed ${badgeColor}`, borderRadius: '4px', padding: '1px 4px', textAlign: 'center', lineHeight: '1.1', margin: '0 auto', width: 'fit-content', backgroundColor: badgeBg }}>
                  {label}
                </div>
              );
            }

            return (
              <tr 
                key={r.id} 
                style={{ height: '36px' }}
                className={onShowRecordDetails ? "cursor-pointer hover:bg-slate-50 transition-colors" : ""}
                onClick={onShowRecordDetails ? () => onShowRecordDetails(r) : undefined}
              >
                <td style={{ border: '1px solid black', textAlign: 'center', fontSize: '9.5pt', fontWeight: 'bold' }}>
                  {formatDateBR(r.date)}
                </td>
                <td style={{ border: '1px solid black', textAlign: 'center', fontSize: '9.5pt' }}>
                  {isJustification ? '—' : r.entryTime}
                </td>
                <td style={{ border: '1px solid black', textAlign: 'center', fontSize: '9.5pt' }}>
                  {isJustification ? '—' : r.exitTime}
                </td>
                <td style={{ border: '1px solid black', verticalAlign: 'middle', textAlign: 'center' }}>
                  {isJustification && r.reason ? (
                    <div style={{ fontSize: '8pt', color: '#334155', fontWeight: 'bold', padding: '0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.reason}>
                      {r.reason}
                    </div>
                  ) : (
                    providerSig
                  )}
                </td>
                <td style={{ border: '1px solid black', verticalAlign: 'middle', textAlign: 'center' }}>
                  {responsibleSig}
                </td>
              </tr>
            );
          })}

          {/* Linhas vazias complementares */}
          {displayRows.empty.map((_, idx) => (
            <tr key={`empty-${idx}`} style={{ height: '36px' }}>
              <td style={{ border: '1px solid black' }}></td>
              <td style={{ border: '1px solid black' }}></td>
              <td style={{ border: '1px solid black' }}></td>
              <td style={{ border: '1px solid black' }}></td>
              <td style={{ border: '1px solid black' }}></td>
            </tr>
          ))}
          
          {/* Total Horas */}
          <tr>
            <td colSpan={5} className="py-2 px-3 font-bold" style={{ border: '1px solid black', fontSize: '11pt' }}>
              <span>Total de horas cumpridas no mês: </span>
              <span style={{ color: '#1e40af', backgroundColor: '#eff6ff', padding: '3px 10px', borderRadius: '6px', border: '1px solid #bfdbfe', fontWeight: 900 }}>
                {(() => {
                  const totalMins = records.reduce((sum, r) => sum + (r.durationMinutes || 0), 0);
                  return formatMinutesToHHMM(totalMins);
                })()}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Questionário Rodapé */}
      <div className="space-y-1.5" style={{ fontSize: '11pt', color: '#000' }}>
        <div className="flex flex-col">
          <span>Faltas no período?</span>
          <span className="font-mono">Sim ( &nbsp;{renderOption(evaluation?.hadAbsences, true)}&nbsp; ) &nbsp;&nbsp; Não ( &nbsp;{renderOption(evaluation?.hadAbsences, false)}&nbsp; )</span>
        </div>

        <div className="flex flex-col">
          <span>Apresentou bom comportamento?</span>
          <span className="font-mono">Sim ( &nbsp;{renderOption(evaluation?.goodBehavior, true)}&nbsp; ) &nbsp;&nbsp; Não ( &nbsp;{renderOption(evaluation?.goodBehavior, false)}&nbsp; )</span>
        </div>

        <div className="flex flex-col">
          <span>Cometeu atos indisciplinares?</span>
          <span className="font-mono">Sim ( &nbsp;{renderOption(evaluation?.disciplinaryIssues, true)}&nbsp; ) &nbsp;&nbsp; Não ( &nbsp;{renderOption(evaluation?.disciplinaryIssues, false)}&nbsp; )</span>
        </div>

        <div className="flex flex-col">
          <span>A qualidade do serviço prestado foi satisfatória?</span>
          <span className="font-mono">Sim ( &nbsp;{renderOption(evaluation?.satisfactoryService, true)}&nbsp; ) &nbsp;&nbsp; Não ( &nbsp;{renderOption(evaluation?.satisfactoryService, false)}&nbsp; )</span>
        </div>
      </div>

      {evaluation && (
        <div className="mt-6 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500 font-bold uppercase tracking-wide">
          <span>Avaliado por: {evaluation.evaluatedBy}</span>
          <span>Em: {new Date(evaluation.createdAt).toLocaleDateString('pt-BR')}</span>
        </div>
      )}
    </div>
  );
};

interface AttendanceRecordDetailsModalProps {
  record: AttendanceRecord;
  provider: Provider;
  evaluation?: MonthlyEvaluation | null;
  onClose: () => void;
}

export const AttendanceRecordDetailsModal: React.FC<AttendanceRecordDetailsModalProps> = ({
  record,
  provider,
  evaluation,
  onClose
}) => {
  const [isPhotoExpanded, setIsPhotoExpanded] = useState(false);
  const isJustification = record.type === 'justification';
  const isFace = record.id && record.id.startsWith('face-');
  
  // Parse reason JSON if possible
  let reasonObj: any = {};
  if (record.reason) {
    try {
      reasonObj = JSON.parse(record.reason);
    } catch (e) {
      reasonObj = { rawText: record.reason };
    }
  }

  // Get operators
  const entryOp = reasonObj.entryOperator || (isFace ? 'CB COBOM' : (evaluation?.evaluatedBy || '1º SGT GONCZOROSKI'));
  const exitOp = reasonObj.exitOperator || (isFace ? 'CB COBOM' : (evaluation?.evaluatedBy || '1º SGT GONCZOROSKI'));

  // Locations
  let entryLoc = reasonObj.entry;
  let exitLoc = reasonObj.exit;
  let perimeter = reasonObj.perimeter;

  if (!entryLoc && !exitLoc && record.reason) {
    const m = record.reason.match(/lat=([-\d.]+).*lng=([-\d.]+)/);
    if (m) {
      entryLoc = { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
    }
  }

  const methodLabel = isJustification
    ? 'Falta Justificada'
    : isFace
    ? 'Biometria Facial Autenticada'
    : reasonObj.ocr
    ? 'Digitalização OCR'
    : 'Homologação Manual';

  const methodColor = isJustification
    ? 'text-amber-600 bg-amber-50 border-amber-200'
    : isFace
    ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : 'text-blue-600 bg-blue-50 border-blue-200';

  return (
    <div className="fixed inset-0 z-[150] flex justify-center items-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden border border-slate-100 max-h-[90vh] text-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${methodColor} shrink-0`}>
              {isJustification && <FileText size={22} />}
              {!isJustification && isFace && <ScanFace size={22} />}
              {!isJustification && !isFace && <ShieldCheck size={22} />}
            </div>
            <div className="text-left">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Registro de Auditoria</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Verificação de Conformidade e Rastreabilidade</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
          {/* Top Panel - Provider Info */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col md:flex-row justify-between gap-4">
            <div>
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Prestador</span>
              <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight">{provider.name}</h4>
              <p className="text-xs text-slate-500 font-bold">Processo: {provider.processNumber || 'Sem número'}</p>
            </div>
            <div className="md:text-right text-left">
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Data do Lançamento</span>
              <h4 className="text-sm font-black text-slate-950 tracking-tight">{formatDateBR(record.date)}</h4>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Side: Photo & Information */}
            <div className="space-y-6">
              {/* Times and Operators */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-4">
                <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5">
                  <Clock size={12} />
                  Horários e Militares Responsáveis
                </h5>

                {isJustification ? (
                  <div className="text-xs font-bold text-slate-700 bg-amber-50/50 p-3 border border-amber-100 rounded-xl">
                    <span className="text-amber-800 block mb-1 uppercase text-[9px] font-black tracking-wider">Justificativa Anexada</span>
                    {reasonObj.rawText || 'Sem justificativa informada'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Entrada */}
                    <div className="p-3 bg-white border border-slate-200/60 rounded-xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500" />
                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Entrada</span>
                      <span className="text-xl font-black text-slate-800 block my-1">
                        {record.entryTime || '--:--'}
                      </span>
                      <span className="text-[8px] font-black uppercase text-slate-500 block truncate" title={entryOp}>
                        Por: {entryOp}
                      </span>
                    </div>

                    {/* Saída */}
                    <div className="p-3 bg-white border border-slate-200/60 rounded-xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-500" />
                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Saída</span>
                      <span className="text-xl font-black text-slate-800 block my-1">
                        {record.exitTime || '--:--'}
                      </span>
                      <span className="text-[8px] font-black uppercase text-slate-500 block truncate" title={exitOp}>
                        Por: {exitOp}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Photo Proof */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col">
                <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5 mb-3">
                  <ScanFace size={12} />
                  Comprovante Fotográfico
                </h5>
                {record.attachmentData ? (
                  <div 
                    onClick={() => setIsPhotoExpanded(true)}
                    className="relative rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center cursor-zoom-in group/photo hover:opacity-95 transition-all"
                  >
                    <img
                      src={record.attachmentData}
                      alt="Comprovante de presença"
                      className="w-full h-auto object-contain"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl text-white font-black text-[10px] uppercase tracking-wider border border-white/10 flex items-center gap-2">
                        <ScanFace size={14} />
                        Ampliar Comprovante
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-white text-center gap-2 text-slate-400">
                    <AlertCircle size={24} className="text-slate-300" />
                    <div className="text-[10px] font-black uppercase tracking-wider">Sem Comprovante Biométrico</div>
                    <div className="text-[9px] font-bold text-slate-400/80 leading-tight">Este registro foi homologado manualmente pelo militar responsável, dispensando foto facial.</div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Map & Geolocations */}
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl h-full flex flex-col min-h-[280px]">
                <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5 mb-3 shrink-0">
                  <MapPin size={12} />
                  Rastreabilidade Geográfica (GPS)
                </h5>

                {((entryLoc && entryLoc.lat) || (exitLoc && exitLoc.lat)) ? (
                  <div className="flex-1 flex flex-col gap-3">
                    <GeoMapViewer entry={entryLoc} exit={exitLoc} perimeter={perimeter} height={180} />
                    
                    <div className="grid grid-cols-1 gap-2 text-[9px] font-bold text-slate-600 bg-white p-3 border border-slate-200/60 rounded-xl">
                      {entryLoc && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shadow inline-block" />
                            GPS Entrada:
                          </span>
                          <span className="font-mono text-slate-500">{entryLoc.lat.toFixed(5)}, {entryLoc.lng.toFixed(5)}</span>
                          {entryLoc.isOutside !== undefined && (
                            <span className={`px-1.5 py-0.2 rounded text-[7px] font-black uppercase ${entryLoc.isOutside ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                              {entryLoc.isOutside ? 'Fora' : 'Dentro'}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {exitLoc && (
                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white shadow inline-block" />
                            GPS Saída:
                          </span>
                          <span className="font-mono text-slate-500">{exitLoc.lat.toFixed(5)}, {exitLoc.lng.toFixed(5)}</span>
                          {exitLoc.isOutside !== undefined && (
                            <span className={`px-1.5 py-0.2 rounded text-[7px] font-black uppercase ${exitLoc.isOutside ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                              {exitLoc.isOutside ? 'Fora' : 'Dentro'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-white text-center gap-2 text-slate-400 min-h-[200px]">
                    <Map size={24} className="text-slate-300" />
                    <div className="text-[10px] font-black uppercase tracking-wider">Sem Dados de Localização</div>
                    <div className="text-[9px] font-bold text-slate-400/80 leading-tight">Este registro não possui dados de latitude e longitude associados (Lançamento manual / digitalização).</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-black uppercase rounded-xl transition-all active:scale-95"
          >
            Fechar Auditoria
          </button>
        </div>
        {/* Full Screen Photo Zoom Overlay */}
        {isPhotoExpanded && record.attachmentData && (
          <div 
            onClick={() => setIsPhotoExpanded(false)}
            className="fixed inset-0 z-[250] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8 cursor-zoom-out animate-in fade-in duration-200"
          >
            <button 
              onClick={() => setIsPhotoExpanded(false)}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10"
            >
              <X size={24} />
            </button>
            <img
              src={record.attachmentData}
              alt="Comprovante ampliado"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border-4 border-white/10"
            />
          </div>
        )}
      </div>
    </div>
  );
};


interface Props {
  provider: Provider;
  attendance?: AttendanceRecord[];
  onClose: () => void;
}

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const BlankAttendanceSheet: React.FC<Props> = ({ provider, attendance = [], onClose }) => {
  const currentDate = new Date();
  const [targetMonth, setTargetMonth] = useState(months[currentDate.getMonth()]);
  const [targetYear, setTargetYear] = useState(currentDate.getFullYear().toString());
  const [evaluation, setEvaluation] = useState<MonthlyEvaluation | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    const monthIndex = months.indexOf(targetMonth) + 1;
    const year = parseInt(targetYear);
    if (monthIndex > 0 && year > 0) {
      import('../services/supabaseService').then(({ getMonthlyEvaluationForMonth }) => {
        getMonthlyEvaluationForMonth(provider.id, year, monthIndex).then(setEvaluation).catch(() => setEvaluation(null));
      });
    }
  }, [targetMonth, targetYear, provider.id]);

  const filteredRecords = useMemo(() => {
    const monthIndex = months.indexOf(targetMonth) + 1;
    const year = parseInt(targetYear);
    if (monthIndex <= 0 || isNaN(year)) return [];
    
    return attendance.filter(a => {
      const parts = a.date.split('-');
      const recordYear = parseInt(parts[0]);
      const recordMonth = parseInt(parts[1]);
      return recordYear === year && recordMonth === monthIndex;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [attendance, targetMonth, targetYear]);

  const handleGeneratePDF = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page { 
          size: A4 portrait; 
          margin: 0; 
        }
        body, html, #root, main { 
          background-color: white !important; 
          margin: 0 !important; 
          padding: 0 !important;
          height: auto !important;
          overflow: visible !important;
          border: none !important;
        }
        nav { display: none !important; }
        .no-print { display: none !important; }
        ::-webkit-scrollbar { display: none !important; }
        * { 
          -webkit-print-color-adjust: exact; 
          print-color-adjust: exact; 
          box-shadow: none !important; 
        }
        body > *:not(.print-wrapper) {
          display: none !important;
        }
        .print-wrapper {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          display: block !important;
        }
        .print-page {
          margin: 0 !important;
          padding: 1.5cm !important;
          border: none !important;
          width: 210mm !important;
          height: 297mm !important;
          overflow: hidden !important;
        }
        div, main { overflow: visible !important; height: auto !important; }
        table.frequency-table { border-collapse: collapse; width: 100%; }
        table.frequency-table th, table.frequency-table td { border: 1px solid black; padding: 4px 6px; }
      }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => {
      window.print();
      setTimeout(() => document.head.removeChild(style), 1000);
    }, 100);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex justify-center items-start bg-black/60 backdrop-blur-sm p-4 md:p-8 overflow-y-auto print-wrapper print:bg-white print:p-0">
      <div className="bg-slate-100 rounded-[2rem] overflow-hidden shadow-2xl max-w-4xl w-full flex flex-col relative my-auto print:rounded-none print:shadow-none print:max-w-none">
        
        {/* Barra de Ações Fixa no Topo (no-print) */}
        <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose} 
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold text-sm px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 bg-white"
            >
              <ArrowLeft size={18} />
              Voltar
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Folha de Frequência</h1>
              <p className="text-slate-500 text-xs font-bold">Preview do documento preenchido para impressão/PDF.</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <select 
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
              >
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <span className="text-slate-400 font-bold">/</span>
              <input 
                type="number" 
                value={targetYear}
                onChange={(e) => setTargetYear(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 w-24 text-center"
              />
            </div>
            
            <button 
              onClick={handleGeneratePDF}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-md font-black text-sm"
            >
              <Printer size={18} />
              Imprimir / Salvar PDF
            </button>
          </div>
        </div>

        {/* Papel A4 Oficial */}
        <div className="w-full py-8 md:py-8 overflow-visible print:p-0 print:py-0 print:border-none print:shadow-none print:bg-white flex justify-center items-start bg-slate-100">
          <div 
            id="blank-sheet-content" 
            className="bg-white min-w-[21cm] max-w-[21cm] p-[1.5cm] md:p-[2cm] shadow-xl border border-slate-200 print-page print:border-none print:shadow-none print:m-0 print:p-[1cm] print:max-w-none print:w-full"
            style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', color: '#000' }}
          >
            <AttendanceSheetPrint 
              provider={provider}
              records={filteredRecords}
              month={targetMonth}
              year={targetYear}
              evaluation={evaluation}
              onShowRecordDetails={setSelectedRecord}
            />
          </div>
        </div>
        {selectedRecord && (
          <AttendanceRecordDetailsModal 
            record={selectedRecord}
            provider={provider}
            evaluation={evaluation}
            onClose={() => setSelectedRecord(null)}
          />
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default BlankAttendanceSheet;
