/**
 * Genera un hash SHA-256 de un mensaje dado utilizando la Web Crypto API nativa del navegador.
 * Este proceso es asíncrono y se utiliza para validar la integridad de los datos de registro.
 * 
 * @param {string} message - El texto (o cadena de datos concatenados) a hashear.
 * @returns {Promise<string>} - El hash resultante en formato hexadecimal (64 caracteres).
 */
export async function sha256(message) {
  // 1. Convertimos el mensaje de texto a un buffer de bytes (Uint8Array) usando UTF-8.
  // Es necesario porque la API Crypto trabaja con datos binarios, no con strings directamente.
  const msgBuffer = new TextEncoder().encode(message);

  // 2. Generamos el hash (digest) usando el algoritmo SHA-256.
  // crypto.subtle.digest devuelve una Promesa con un ArrayBuffer que contiene el hash.
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);

  // 3. Convertimos el buffer del hash (binario) a un array de números de 8 bits para manipularlo.
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // 4. Convertimos cada byte a su representación hexadecimal de dos dígitos.
  // padStart(2, '0') asegura que bytes pequeños como '5' se conviertan en '05'.
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Retornamos la cadena final (ej: "e3b0c442...")
  return hashHex;
}

