// Central API configuration.
// Default to same-origin so Vercel rewrites and the Vite dev proxy can avoid
// cross-origin preflight overhead. Set VITE_USE_EXTERNAL_API=true only when a
// standalone frontend must call the backend directly.
const configuredApiUrl = import.meta.env.VITE_API_URL || '';
const useExternalApi = import.meta.env.VITE_USE_EXTERNAL_API === 'true';

export const API_BASE_URL = useExternalApi ? configuredApiUrl.replace(/\/$/, '') : '';
