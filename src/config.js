// Central API configuration.
// Default to same-origin so Vercel rewrites and the Vite dev proxy can avoid
// cross-origin preflight overhead. Set VITE_USE_EXTERNAL_API=true only when a
// standalone frontend must call the backend directly.
const configuredApiUrl = import.meta.env.VITE_API_URL || '';
const useExternalApi = import.meta.env.VITE_USE_EXTERNAL_API === 'true';
const productionBackendUrl = 'https://viewed-history-app-production.up.railway.app';

export const API_BASE_URL = useExternalApi ? configuredApiUrl.replace(/\/$/, '') : '';
export const API_ASSET_BASE_URL = import.meta.env.DEV
  ? API_BASE_URL
  : (configuredApiUrl || productionBackendUrl).replace(/\/$/, '');

export const resolveApiAssetUrl = (url) => {
  if (!url || !url.trim()) return '';

  const normalizedUrl = url.trim();
  if (
    normalizedUrl.startsWith('http://') ||
    normalizedUrl.startsWith('https://') ||
    normalizedUrl.startsWith('data:image/')
  ) {
    return normalizedUrl;
  }

  if (normalizedUrl.startsWith('/uploads') || normalizedUrl.startsWith('uploads/')) {
    const uploadPath = normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`;
    return `${API_ASSET_BASE_URL}${uploadPath}`;
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    if (parsedUrl.pathname.startsWith('/uploads')) {
      return `${API_ASSET_BASE_URL}${parsedUrl.pathname}`;
    }
  } catch {
    return normalizedUrl;
  }

  return normalizedUrl;
};
