import * as Data from "effect/Data"
import type { SessionDelta } from "./protocol.ts"

/**
 * The step of the client protocol that failed.
 */
export type Operation =
  | "connect"
  | "execute"
  | "poll"
  | "cancel"
  | "spool"
  | "ack"
  | "decode"

/**
 * A Trino `QueryError`, as sent in `QueryResults.error`.
 */
export interface QueryError {
  readonly message: string
  readonly sqlState: string | undefined
  readonly errorCode: number
  readonly errorName: string
  readonly errorType: string
  readonly errorLocation: { readonly lineNumber: number; readonly columnNumber: number } | undefined
  readonly failureInfo: unknown
}

/**
 * The server reported a query failure. `delta` carries the session headers
 * the server sent before failing, such as `X-Trino-Clear-Transaction-Id` from
 * a failed `COMMIT`, for the connection to apply.
 */
export class QueryFailed extends Data.TaggedError("QueryFailed")<{
  readonly queryId: string | undefined
  readonly error: QueryError
  readonly operation: Operation
  readonly delta?: SessionDelta | undefined
}> {}

/**
 * The coordinator answered with a non-success HTTP status after retries.
 */
export class HttpStatusFailure extends Data.TaggedError("HttpStatusFailure")<{
  readonly status: number
  readonly body: string
  readonly operation: Operation
}> {}

/**
 * The request did not complete: connection refused, reset, timed out.
 */
export class TransportFailure extends Data.TaggedError("TransportFailure")<{
  readonly cause: unknown
  readonly operation: Operation
}> {}

/**
 * The server sent something the protocol does not allow.
 */
export class ProtocolViolation extends Data.TaggedError("ProtocolViolation")<{
  readonly message: string
  readonly operation: Operation
}> {}

/**
 * A response body, segment or value could not be decoded.
 */
export class DecodeFailure extends Data.TaggedError("DecodeFailure")<{
  readonly message: string
  readonly column: string | undefined
  readonly cause: unknown
}> {}

/**
 * A statement parameter has no Trino literal.
 */
export class EncodeFailure extends Data.TaggedError("EncodeFailure")<{
  readonly message: string
  readonly cause: unknown
}> {}

/**
 * The server asked for something this client cannot do on this runtime.
 */
export class Unsupported extends Data.TaggedError("Unsupported")<{
  readonly message: string
  readonly operation: Operation
}> {}

/**
 * Every failure crossing the internal module boundaries.
 */
export type TrinoFailure =
  | QueryFailed
  | HttpStatusFailure
  | TransportFailure
  | ProtocolViolation
  | DecodeFailure
  | EncodeFailure
  | Unsupported
