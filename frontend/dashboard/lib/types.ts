/** Tipi condivisi lato frontend, allineati alle risposte del backend. */

export interface Dashboard {
  id: number;
  title: string;
  uuid: string;
}

export interface Chart {
  id: number;
  uuid: string;
  title: string;
  viz_type: string;
  datasource_id?: number;
}

export interface NativeFilter {
  id: string;
  name: string;
  filterType: string;
  defaultDataMask: Record<string, unknown>;
  targets: Array<Record<string, unknown>>;
}

export interface GuestTokenResponse {
  id: string;
  token: string;
  error?: unknown;
}

/** Stato dei filtri nativi di Superset (forma libera, gestita dall'SDK). */
export type DataMask = Record<string, unknown>;

export interface ChartDataResponse {
  viz_type: string;
  slice_name: string;
  data: unknown;
}

export interface FilterOptionsResponse {
  values: unknown[];
  columnName: string;
  datasetId: number;
}

export interface ScreenshotResponse {
  digest: string;
  imageUrl: string;
  taskStatus: string;
}
