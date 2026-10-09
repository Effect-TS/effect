/**
 * Protocol error helpers shared by the SSH internals.
 *
 * @internal
 */
import * as Effect from "../../Effect.ts"
import { SshError, SshProtocolError } from "../SshError.ts"
import { WireError } from "./wire.ts"

/** @internal */
export const protocolError = (description: string, cause?: unknown): SshError =>
  new SshError({ reason: new SshProtocolError({ description, cause }) })

/**
 * Returns a function that wraps a cause in a protocol error, for use with
 * `Effect.mapError`.
 *
 * @internal
 */
export const protocolErrorFrom = (description: string) => (cause: unknown): SshError =>
  protocolError(description, cause)

/**
 * Runs a synchronous decoder, turning malformed input into a protocol error.
 *
 * @internal
 */
export const trySync = <A>(description: string, f: () => A): Effect.Effect<A, SshError> =>
  Effect.try({
    try: f,
    catch: (cause) =>
      cause instanceof SshError ? cause : protocolError(cause instanceof WireError ? cause.message : description, cause)
  })
