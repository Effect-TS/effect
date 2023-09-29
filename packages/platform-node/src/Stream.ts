/**
 * @since 1.0.0
 */
import * as internal from "@effect/platform-node/internal/stream"
import type { SizeInput } from "@effect/platform/FileSystem"
import type { Effect } from "effect/Effect"
import type { LazyArg } from "effect/Function"
import type { Stream } from "effect/Stream"
import type { Readable } from "stream"

/**
 * @category models
 * @since 1.0.0
 */
export interface FromReadableOptions {
  /** Defaults to undefined, which lets Node.js decide the chunk size */
  readonly chunkSize?: SizeInput
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
  options: {
    readable: LazyArg<Readable>
    onFailure: (error: unknown) => E
    encoding?: BufferEncoding
    maxBytes?: SizeInput
  }
) => Effect<never, E, string> = internal.toString

/**
 * @since 1.0.0
 * @category conversions
 */
export const toUint8Array: <E>(
  options: {
    readable: LazyArg<Readable>
    onFailure: (error: unknown) => E
    maxBytes?: SizeInput
  }
) => Effect<never, E, Uint8Array> = internal.toUint8Array
