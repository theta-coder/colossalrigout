export const FALLBACK_LOGO = '/colossal-rigout-logo.png';

/**
 * Resolves a given image URL or path.
 * If empty, invalid, or missing, returns the project logo fallback.
 */
export function resolveProductImage(urlOrPath?: string | null): string {
  if (!urlOrPath || typeof urlOrPath !== 'string') {
    return FALLBACK_LOGO;
  }
  
  const trimmed = urlOrPath.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
    return FALLBACK_LOGO;
  }
  
  return trimmed;
}
