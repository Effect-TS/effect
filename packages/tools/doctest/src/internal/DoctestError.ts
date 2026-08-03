import * as Data from "effect/Data"

export class DoctestError extends Data.TaggedError("DoctestError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export const fromUnknown = (cause: unknown, message?: string): DoctestError => {
  const details = cause instanceof Error ? cause.message : String(cause)
  return new DoctestError({ message: message === undefined ? details : `${message}: ${details}`, cause })
}
