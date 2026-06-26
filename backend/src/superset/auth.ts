import axios from 'axios';
import { config } from '../config/env';
import type { SupersetTokens } from '../types';

/**
 * Estrae i cookie da un header `set-cookie` (array o stringa) tenendo solo la
 * coppia `nome=valore` (scarta attributi come Path/HttpOnly).
 */
function parseCookies(setCookieHeaders?: string[] | string): string {
  if (!setCookieHeaders) return '';
  const arr = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  return arr.map((c) => c.split(';')[0]).join('; ');
}

/**
 * Esegue il login admin su Superset e raccoglie tutto ciò che serve per chiamare
 * le sue API protette:
 *
 *  1. `POST /api/v1/security/login`  → access_token (JWT) + cookie di sessione
 *  2. `GET  /api/v1/security/csrf_token/` → token CSRF + cookie aggiuntivi
 *
 * Le mutazioni (PUT/POST) su Superset richiedono `Authorization: Bearer`,
 * header `X-CSRFToken` e i cookie di sessione insieme.
 */
export async function getSupersetTokens(): Promise<SupersetTokens> {
  const { url, adminUser, adminPassword } = config.superset;

  const loginRes = await axios.post(`${url}/api/v1/security/login`, {
    username: adminUser,
    password: adminPassword,
    provider: 'db',
    refresh: true,
  });

  const accessToken: string = loginRes.data.access_token;
  const loginCookies = parseCookies(loginRes.headers['set-cookie']);

  const csrfRes = await axios.get(`${url}/api/v1/security/csrf_token/`, {
    headers: { Authorization: `Bearer ${accessToken}`, Cookie: loginCookies },
  });

  const csrfToken: string = csrfRes.data.result;
  const csrfCookies = parseCookies(csrfRes.headers['set-cookie']);
  const cookies = [loginCookies, csrfCookies].filter(Boolean).join('; ');

  return { accessToken, csrfToken, cookies };
}
