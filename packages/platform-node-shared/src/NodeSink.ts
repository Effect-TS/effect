/**
 * @since 1.0.0
 */
import type { PlatformError } from "@effect/platform/Error"
import { SystemError } from "@effect/platform/Error"
import type { Channel } from "effect/Channel"
import type { Chunk } from "effect/Chunk"
import type { LazyArg } from "effect/Function"
import type * as Sink from "effect/Sink"
import type { Writable } from "stream"
import * as internal from "./internal/sink.js"
import type { FromWritableOptions } from "./NodeStream.js"

/**
 * @category constructor
 * @since 1.0.0
 */
export const fromWritable: <E, A = string | Uint8Array>(
  evaluate: LazyArg<Writable | NodeJS.WritableStream>,
  onError: (error: unknown) => E,
  options?: FromWritableOptions
) => Sink.Sink<void, A, never, E> = internal.fromWritable

/**
 * @category constructor
 * @since 1.0.0
 */
export const fromWritableChannel: <IE, OE, A>(
  writable: LazyArg<Writable | NodeJS.WritableStream>,
  onError: (error: unknown) => OE,
  options?: FromWritableOptions
) => Channel<Chunk<never>, Chunk<A>, IE | OE, IE, void, unknown> = internal.fromWritableChannel

/**
 * @category stdio
 * @since 1.0.0
 */
export const stdout: Sink.Sink<void, string | Uint8Array, never, PlatformError> = fromWritable(
  () => process.stdout,
  (cause) =>
    new SystemError({
      module: "Stream",
      method: "stdout",
      reason: "Unknown",
      cause
    })
)

/**
 * @category stdio
 * @since 1.0.0
 */
export const stderr: Sink.Sink<void, string | Uint8Array, never, PlatformError> = fromWritable(
  () => process.stderr,
  (cause) =>
    new SystemError({
      module: "Stream",
      method: "stderr",
      reason: "Unknown",
      cause
    })
)

/**
 * @category stdio
 * @since 1.0.0
 */
export const stdin: Sink.Sink<void, string | Uint8Array, never, PlatformError> = fromWritable(
  () => process.stdin,
  (cause) =>
    new SystemError({
      module: "Stream",
      method: "stdin",
      reason: "Unknown",
      cause
    })
)
