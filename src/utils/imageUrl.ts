import { API_BASE_URL } from '../api/client';

export const getImageUrl = (path?: string | null): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  let baseUrl = API_BASE_URL;
  try {
    baseUrl = new URL(API_BASE_URL).origin;
  } catch (e) {
    if (baseUrl.endsWith('/api/v1')) baseUrl = baseUrl.slice(0, -7);
    else if (baseUrl.endsWith('/api')) baseUrl = baseUrl.slice(0, -4);
  }
  
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${normalizedBase}${normalizedPath}`;
};
