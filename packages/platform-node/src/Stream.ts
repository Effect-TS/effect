/**
 * @since 1.0.0
 */
import type { LazyArg } from "@effect/data/Function"
import * as internal from "@effect/platform-node/internal/stream"
import type { Size } from "@effect/platform/FileSystem"
import type { Stream } from "@effect/stream/Stream"
import type { Readable } from "stream"

/**
 * @category model
 * @since 1.0.0
 */
export interface FromReadableOptions {
  /** Defaults to 64kb */
  readonly chunkSize?: Size
}

/**
 * @category constructor
 * @since 1.0.0
 */
export const fromReadable: <E, A>(
  evaluate: LazyArg<Readable>,
  onError: (error: unknown) => E,
  options?: FromReadableOptions
) => Stream<never, E, A> = internal.fromReadable
