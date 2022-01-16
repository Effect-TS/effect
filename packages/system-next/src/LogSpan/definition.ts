// ets_tracing: off

// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------

export class LogSpan {
  constructor(readonly label: string, readonly startTime: number) {}
}
