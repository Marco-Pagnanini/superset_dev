import { config } from '../config/env';
import type { SupersetTokens } from '../types';

/** Base URL dell'istanza Superset. */
export const SUPERSET_URL = config.superset.url;

/**
 * Header per le chiamate di sola lettura (GET): basta il Bearer token.
 */
export function readHeaders(tokens: Pick<SupersetTokens, 'accessToken'>) {
  return { Authorization: `Bearer ${tokens.accessToken}` };
}

/**
 * Header per le chiamate che mutano stato (POST/PUT): oltre al Bearer servono
 * il token CSRF, i cookie di sessione e l'header `Referer` (Superset lo verifica).
 */
export function writeHeaders(tokens: SupersetTokens) {
  return {
    Authorization: `Bearer ${tokens.accessToken}`,
    'X-CSRFToken': tokens.csrfToken,
    'Content-Type': 'application/json',
    Cookie: tokens.cookies,
    Referer: SUPERSET_URL,
  };
}
