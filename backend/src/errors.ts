/**
 * Errore applicativo con uno status HTTP esplicito e un payload opzionale.
 * I service lo lanciano per condizioni note (es. embedding non abilitato) e
 * l'error handler centralizzato lo traduce nella risposta JSON corretta.
 */
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public payload?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
