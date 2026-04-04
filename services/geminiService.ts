import { GoogleGenAI, Type } from "@google/genai";

// Lazy initialization: only create the client when needed, so a missing
// API key does NOT crash the full app module on import.
const getAI = (): GoogleGenAI => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (globalThis as any).process?.env?.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[Gemini] ERRO: Chave de API não encontrada!');
    throw new Error("GEMINI_API_KEY não está configurado. Contate o administrador do sistema.");
  }
  // Log mais visível para depuração de ambiente
  const maskedKey = apiKey.slice(0, 8) + '...' + apiKey.slice(-4);
  console.log('[Gemini] Initializing with key:', maskedKey);
  return new GoogleGenAI({ apiKey });
};

export const detectFaceInDocument = async (base64Data: string, mimeType: string) => {
  const prompt = `
    Identifique o rosto da pessoa neste documento de identidade.
    Retorne as coordenadas normalizadas [ymin, xmin, ymax, xmax] da caixa delimitadora do rosto.
    Os valores devem estar entre 0 e 1000.
    Retorne APENAS o JSON no formato especificado.
  `;

  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-2.0-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            box_2d: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER },
              description: "[ymin, xmin, ymax, xmax] coordenadas normalizadas 0-1000"
            }
          },
          required: ["box_2d"]
        }
      }
    });

    console.log('[Gemini Face] Raw Response:', response);
    const jsonStr = response.text?.trim();
    if (!jsonStr) throw new Error("IA não retornou coordenadas do rosto.");
    
    return JSON.parse(jsonStr);
  } catch (err: any) {
    console.error('[Gemini Face] Erro:', err);
    throw err;
  }
};

export const extractAttendanceFromFile = async (base64Data: string, mimeType: string) => {
  const prompt = `
    Analise esta 'Folha de Frequência' do Programa de Prestação de Serviços à Comunidade (PSC).
    
    INSTRUÇÕES CRÍTICAS:
    1. Extraia o NOME COMPLETO do prestador que aparece no cabeçalho ou topo do documento.
    2. Extraia os dados manuscritos das colunas 'Data', 'Chegada' (entrada) e 'Saída'.
    3. Converta as datas para o formato ISO YYYY-MM-DD. Ex: 03/01/2026 vira 2026-01-03.
    4. Garanta que os horários estejam no formato HH:mm (24h).
    5. Ignore linhas em branco ou sem horários preenchidos.
    6. Retorne APENAS o JSON conforme o esquema definido.
  `;

  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-2.0-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedProviderName: {
              type: Type.STRING,
              description: "Nome do prestador encontrado no topo do documento"
            },
            records: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING, description: "Data no formato YYYY-MM-DD" },
                  entryTime: { type: Type.STRING, description: "Hora de chegada HH:mm" },
                  exitTime: { type: Type.STRING, description: "Hora de saída HH:mm" },
                },
                required: ["date", "entryTime", "exitTime"]
              }
            }
          },
          required: ["records", "extractedProviderName"]
        }
      }
    });

    console.log('[Gemini] Raw Response:', response);

    const jsonStr = response.text?.trim();
    if (!jsonStr) {
      console.warn('[Gemini] Resposta vazia recebida.');
      throw new Error("A IA retornou uma resposta vazia. Tente uma foto mais nítida.");
    }

    try {
      return JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[Gemini] Erro ao processar JSON:', jsonStr);
      throw new Error("Erro na formatação dos dados. Tente novamente.");
    }
  } catch (err: any) {
    console.error('[Gemini] Erro na chamada da API:', err);
    throw err;
  }
};

export const extractReferralData = async (base64Data: string, mimeType: string) => {
  const prompt = `
    Analise esta 'Folha de Encaminhamento' do Poder Judiciário / Vara de Execuções Criminais.
    Extraia as seguintes informações:
    1. Nome do Prestador.
    2. Número do Processo (formato 0000000-00.202X.8.21.00XX).
    3. Telefone para contato.
    4. Endereço completo.
    5. Entidade Conveniada/Designada.
    
    LÓGICA DE CÁLCULO DE HORAS (CRÍTICO):
    6. Procure pelo campo 'Período de cumprimento'. 
       - Se encontrar 'Xh semanais por Y meses', calcule o total: X * 4 * Y.
       - Exemplo: '4h semanais por 6 meses' -> Total de 96 horas.
       - Se houver apenas um número total de horas (ex: '150 horas totais'), use esse número.
       - Retorne o resultado final no campo 'totalHours'.
    
    7. Data do Encaminhamento (formato ISO YYYY-MM-DD).
    8. Data do Recebimento (procure por carimbo ou texto 'RECEBIDO EM', formato ISO YYYY-MM-DD).
    9. Observações (texto no campo 'Observações:' ou descrição de dias/horários de trabalho).
    
    Retorne APENAS o JSON.
  `;

  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-2.0-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            processNumber: { type: Type.STRING },
            phone: { type: Type.STRING },
            address: { type: Type.STRING },
            assignedEntity: { type: Type.STRING },
            totalHours: {
              type: Type.NUMBER,
              description: "Cálculo resultante do período (Horas semanais * 4 * Meses) or total fixo."
            },
            referralDate: { type: Type.STRING },
            receiptDate: { type: Type.STRING },
            observations: { type: Type.STRING },
          },
          required: ["name", "processNumber", "totalHours"]
        }
      }
    });

    console.log('[Gemini Referral] Raw Response:', response);
    const jsonStr = response.text?.trim();
    if (!jsonStr) throw new Error("IA não retornou dados do encaminhamento.");

    return JSON.parse(jsonStr);
  } catch (err: any) {
    console.error('[Gemini Referral] Erro:', err);
    throw err;
  }
};