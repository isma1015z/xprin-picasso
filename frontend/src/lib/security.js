/**
 * Genera un hash SHA-256 de un mensaje dado utilizando la Web Crypto API nativa del navegador.
 * Este proceso es asíncrono y se utiliza para validar la integridad de los datos de registro.
 * 
 * @param {string} message - El texto (o cadena de datos concatenados) a hashear.
 * @returns {Promise<string>} - El hash resultante en formato hexadecimal (64 caracteres).
 */
export async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
