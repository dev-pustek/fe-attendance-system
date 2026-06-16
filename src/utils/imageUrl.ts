export const getImageUrl = (path?: string | null): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  // Get API URL and ensure it doesn't end with /api so we can access /uploads
  let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  if (baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.slice(0, -4);
  } else if (baseUrl.endsWith('/api/')) {
    baseUrl = baseUrl.slice(0, -5);
  }
  
  // Remove trailing slash from base url and leading slash from path
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${normalizedBase}${normalizedPath}`;
};
