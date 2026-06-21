export const apiCall = async (
  targetIp: string,
  authToken: string,
  method: string,
  path: string,
  body: any = null,
  timeoutMs: number = 15000
) => {
  // Strip protocol prefix if present, then normalize to http://
  const cleanIp = targetIp.replace(/^(https?:\/\/)?/, '');
  const url = `http://${cleanIp}${path}`;
  
  const headers: any = {
    'Content-Type': 'application/json',
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
      signal: controller.signal
    });
    clearTimeout(id);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server responded with ${response.status}`);
    }
    
    return await response.json();
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out. Check IP address and server port.');
    }
    throw err;
  }
};
