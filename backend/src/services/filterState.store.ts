import fs from 'fs';
import { config } from '../config/env';
import type { DataMask, FilterStateEntry } from '../types';

/**
 * Persistenza su file (JSON) dell'ultimo stato filtri scelto da un utente su una
 * dashboard. La chiave è `${dashboardId}:${userId}`.
 *
 * È volutamente un semplice file store: in produzione andrebbe sostituito da un DB,
 * ma per la POC mantiene la logica trasparente e ispezionabile a mano.
 */

type FilterStateMap = Record<string, FilterStateEntry>;

function readAll(): FilterStateMap {
  try {
    return JSON.parse(fs.readFileSync(config.filterStatesFile, 'utf8')) as FilterStateMap;
  } catch {
    return {};
  }
}

function writeAll(states: FilterStateMap): void {
  fs.writeFileSync(config.filterStatesFile, JSON.stringify(states, null, 2), 'utf8');
}

function keyFor(dashboardId: string | number, userId: string): string {
  return `${dashboardId}:${userId}`;
}

/** Salva (sovrascrive) lo stato filtri per dashboard+utente. */
export function saveFilterState(dashboardId: string | number, userId: string, dataMask: DataMask): void {
  const states = readAll();
  states[keyFor(dashboardId, userId)] = { dataMask, savedAt: new Date().toISOString() };
  writeAll(states);
}

/** Legge lo stato filtri per dashboard+utente, oppure `null` se assente. */
export function getFilterState(dashboardId: string | number, userId: string): DataMask | null {
  const entry = readAll()[keyFor(dashboardId, userId)];
  return entry ? entry.dataMask : null;
}
