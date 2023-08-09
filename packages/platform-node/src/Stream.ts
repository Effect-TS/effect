/**
 * @since 1.0.0
 */
import type { LazyArg } from "@effect/data/Function"
import type { Option } from "@effect/data/Option"
import type { Effect } from "@effect/io/Effect"
import * as internal from "@effect/platform-node/internal/stream"
import type { Size } from "@effect/platform/FileSystem"
import type { Stream } from "@effect/stream/Stream"
import type { Readable } from "stream"

/**
 * @category models
 * @since 1.0.0
 */
export interface FromReadableOptions {
  /** Defaults to None, which lets Node.js decide the chunk size */
  readonly chunkSize?: Option<Size>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const fromReadable: <E, A>(
  evaluate: LazyArg<Readable>,
  onError: (error: unknown) => E,
  options?: FromReadableOptions
) => Stream<never, E, A> = internal.fromReadable

/**
 * @since 1.0.0
 * @category conversions
 */
export const toString: <E>(
  evaluate: LazyArg<Readable>,
  onError: (error: unknown) => E,
  encoding?: BufferEncoding
) => Effect<never, E, string> = internal.toString

/**
 * @since 1.0.0
 * @category conversions
 */
export const toUint8Array: <E>(
  evaluate: LazyArg<Readable>,
  onError: (error: unknown) => E
) => Effect<never, E, Uint8Array> = internal.toUint8Array
