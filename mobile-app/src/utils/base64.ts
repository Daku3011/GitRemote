export const decodeBase64 = (str: string): string => {
  const cleaned = str.replace(/\s/g, '');
  if (typeof atob === 'function') {
    try {
      return decodeURIComponent(escape(atob(cleaned)));
    } catch {
      return atob(cleaned);
    }
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  let bufferLength = cleaned.length * 0.75;
  if (cleaned[cleaned.length - 1] === '=') {
    bufferLength--;
    if (cleaned[cleaned.length - 2] === '=') {
      bufferLength--;
    }
  }
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < cleaned.length; i += 4) {
    const b64_1 = lookup[cleaned.charCodeAt(i)];
    const b64_2 = lookup[cleaned.charCodeAt(i + 1)];
    const b64_3 = lookup[cleaned.charCodeAt(i + 2)];
    const b64_4 = lookup[cleaned.charCodeAt(i + 3)];
    const byte1 = (b64_1 << 2) | (b64_2 >> 4);
    const byte2 = ((b64_2 & 15) << 4) | (b64_3 >> 2);
    const byte3 = ((b64_3 & 3) << 6) | (b64_4 & 63);
    bytes[p++] = byte1;
    if (p < bufferLength) bytes[p++] = byte2;
    if (p < bufferLength) bytes[p++] = byte3;
  }
  let utf8String = '';
  for (let i = 0; i < bytes.length; i++) {
    utf8String += String.fromCharCode(bytes[i]);
  }
  try {
    return decodeURIComponent(escape(utf8String));
  } catch {
    return utf8String;
  }
};

export const encodeBase64 = (str: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const utf8 = unescape(encodeURIComponent(str));
  const bytes = new Uint8Array(utf8.length);
  for (let i = 0; i < utf8.length; i++) {
    bytes[i] = utf8.charCodeAt(i);
  }
  let result = '';
  let i: number;
  const l = bytes.length;
  for (i = 2; i < l; i += 3) {
    result += chars[bytes[i - 2] >> 2];
    result += chars[((bytes[i - 2] & 3) << 4) | (bytes[i - 1] >> 4)];
    result += chars[((bytes[i - 1] & 15) << 2) | (bytes[i] >> 6)];
    result += chars[bytes[i] & 63];
  }
  if (i === l + 1) {
    result += chars[bytes[i - 2] >> 2];
    result += chars[(bytes[i - 2] & 3) << 4];
    result += '==';
  } else if (i === l) {
    result += chars[bytes[i - 2] >> 2];
    result += chars[((bytes[i - 2] & 3) << 4) | (bytes[i - 1] >> 4)];
    result += chars[(bytes[i - 1] & 15) << 2];
    result += '=';
  }
  return result;
};
