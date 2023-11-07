/**
 * @since 1.0.0
 */

import type { LazyArg } from "effect/Function"
import type { Sink } from "effect/Sink"
import type { Writable } from "stream"
import * as internal from "./internal/sink.js"
import type { FromWritableOptions } from "./Stream.js"

/**
 * @category constructor
 * @since 1.0.0
 */
export const fromWritable: <E, A = string | Uint8Array>(
  evaluate: LazyArg<Writable | NodeJS.WritableStream>,
  onError: (error: unknown) => E,
  options?: FromWritableOptions
) => Sink<never, E, A, never, void> = internal.fromWritable
