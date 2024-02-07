/**
 * @since 1.0.0
 */
import type { Channel } from "effect/Channel"
import type { Chunk } from "effect/Chunk"
import type { LazyArg } from "effect/Function"
import type { Sink } from "effect/Sink"
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
) => Sink<never, E, A, never, void> = internal.fromWritable

/**
 * @category constructor
 * @since 1.0.0
 */
export const fromWritableChannel: <IE, OE, A>(
  writable: LazyArg<Writable | NodeJS.WritableStream>,
  onError: (error: unknown) => OE,
  options?: FromWritableOptions
) => Channel<Chunk<never>, Chunk<A>, IE | OE, IE, void, unknown> = internal.fromWritableChannel
