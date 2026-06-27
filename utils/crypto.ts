/**
 * Utilitário de Criptografia Simétrica (AES-256-GCM) para Credenciais
 * Utiliza a API Web Crypto nativa do navegador (zero dependências)
 */

// Chave padrão em caso de ausência de variável de ambiente (apenas fallback)
const DEFAULT_KEY = 'mtabi-gestao-secret-default-key-32chars';

/**
 * Deriva uma CryptoKey estável a partir de uma frase de senha usando SHA-256
 */
async function getCryptoKey(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const rawKey = encoder.encode(passphrase);
  
  // Hash da senha para gerar uma chave estável de 256 bits (32 bytes)
  const hash = await window.crypto.subtle.digest('SHA-256', rawKey);
  
  return window.crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Criptografa texto puro usando AES-256-GCM
 * Retorna uma string em formato hexadecimal contendo IV + Dados Criptografados
 */
export async function encryptText(text: string): Promise<string> {
  if (!text) return '';
  
  try {
    const passphrase = import.meta.env.VITE_ENCRYPTION_KEY || DEFAULT_KEY;
    const key = await getCryptoKey(passphrase);
    const encoder = new TextEncoder();
    const encodedText = encoder.encode(text);
    
    // Vetor de Inicialização (IV) de 12 bytes - padrão seguro para AES-GCM
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedText
    );
    
    // Junta o IV (12 bytes) e o buffer criptografado para persistência conjunta
    const encryptedBytes = new Uint8Array(encryptedBuffer);
    const combined = new Uint8Array(iv.length + encryptedBytes.length);
    combined.set(iv, 0);
    combined.set(encryptedBytes, iv.length);
    
    // Converte o array de bytes em uma string hexadecimal
    return Array.from(combined)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    console.error('Erro na criptografia:', error);
    throw new Error('Falha ao criptografar dados.');
  }
}

/**
 * Descriptografa texto em formato hexadecimal usando AES-256-GCM
 */
export async function decryptText(hexString: string): Promise<string> {
  if (!hexString) return '';
  
  try {
    const passphrase = import.meta.env.VITE_ENCRYPTION_KEY || DEFAULT_KEY;
    const key = await getCryptoKey(passphrase);
    
    // Converte de hexadecimal de volta para Uint8Array
    const matches = hexString.match(/.{1,2}/g);
    if (!matches) throw new Error('String hexadecimal inválida');
    
    const combined = new Uint8Array(matches.map(byte => parseInt(byte, 16)));
    
    // Separa o IV (primeiros 12 bytes) dos dados criptografados
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Erro na descriptografia:', error);
    throw new Error('Falha ao descriptografar dados. Verifique a chave de criptografia.');
  }
}
