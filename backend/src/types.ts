/**
 * Tipi condivisi dal backend. Rappresentano sia le risposte che esponiamo al
 * frontend (forma "snella") sia alcune strutture interne di Superset che usiamo.
 */

/** Token e cookie ottenuti autenticandosi su Superset come admin. */
export interface SupersetTokens {
  accessToken: string;
  csrfToken: string;
  cookies: string;
}

/** Dashboard nella forma esposta al frontend. */
export interface DashboardDto {
  id: number;
  title: string;
  uuid: string;
}

/** Chart nella forma esposta al frontend. */
export interface ChartDto {
  id: number;
  uuid: string;
  title: string;
  viz_type: string;
  datasource_id?: number;
}

/** Filtro nativo di una dashboard nella forma esposta al frontend. */
export interface NativeFilterDto {
  id: string;
  name: string;
  filterType: string;
  defaultDataMask: Record<string, unknown>;
  targets: Array<Record<string, unknown>>;
}

/** Risposta del guest token: id embed + token JWT. */
export interface GuestTokenResponse {
  id: string;
  token: string;
}

/** dataMask di Superset: stato dei filtri nativi (forma libera, gestita dal client). */
export type DataMask = Record<string, unknown>;

/** Voce salvata nello store dei filtri. */
export interface FilterStateEntry {
  dataMask: DataMask;
  savedAt: string;
}
