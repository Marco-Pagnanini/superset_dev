import path from 'path';
import dotenv from 'dotenv';

// Carica le variabili da backend/.env
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variabile d'ambiente mancante: ${name}. Copia .env.example in .env e valorizzala.`);
  }
  return value;
}

/**
 * Configurazione applicativa, derivata dalle variabili d'ambiente.
 * Centralizzata qui così il resto del codice non legge mai `process.env` direttamente.
 */
export const config = {
  port: Number(process.env.PORT ?? 5000),

  superset: {
    url: required('SUPERSET_URL'),
    adminUser: required('SUPERSET_ADMIN_USER'),
    adminPassword: required('SUPERSET_ADMIN_PASSWORD'),
  },

  /**
   * Valori di default per l'utente "guest" dell'embedding.
   * Nel setup multi-tenant Trino lo username del guest token è `${trinoServer}|${userDb}`.
   */
  embed: {
    defaultTrinoServer: process.env.EMBED_TRINO_SERVER ?? 'server_x',
    defaultUserDb: process.env.EMBED_USER_DB ?? '4cosite_000415_it',
  },

  /** File JSON dove persistiamo l'ultimo stato dei filtri per dashboard+utente. */
  filterStatesFile: path.join(__dirname, '../../data/filterStates.json'),
} as const;
