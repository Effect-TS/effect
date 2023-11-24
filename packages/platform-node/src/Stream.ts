/**
 * @since 1.0.0
 */
import type { SizeInput } from "@effect/platform/FileSystem"
import type { Channel } from "effect/Channel"
import type { Chunk } from "effect/Chunk"
import type { Effect } from "effect/Effect"
import type { LazyArg } from "effect/Function"
import type { Stream } from "effect/Stream"
import type { Duplex, Readable } from "stream"
import type { PlatformError } from "./Error.js"
import * as internal from "./internal/stream.js"

/**
 * @category models
 * @since 1.0.0
 */
export interface FromReadableOptions {
  /** Defaults to undefined, which lets Node.js decide the chunk size */
  readonly chunkSize?: SizeInput
}

/**
 * @category model
 * @since 1.0.0
 */
export interface FromWritableOptions {
  readonly endOnDone?: boolean
  readonly encoding?: BufferEncoding
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const fromReadable: <E, A = Uint8Array>(
  evaluate: LazyArg<Readable | NodeJS.ReadableStream>,
  onError: (error: unknown) => E,
  { chunkSize }?: FromReadableOptions
) => Stream<never, E, A> = internal.fromReadable

/**
 * @category constructors
 * @since 1.0.0
 */
export const fromReadableChannel: <E, A = Uint8Array>(
  evaluate: LazyArg<Readable | NodeJS.ReadableStream>,
  onError: (error: unknown) => E,
  chunkSize: number | undefined
) => Channel<never, unknown, unknown, unknown, E, Chunk<A>, void> = internal.fromReadableChannel

/**
 * @category constructors
 * @since 1.0.0
 */
export const fromDuplex: <IE, E, I = Uint8Array, O = Uint8Array>(
  evaluate: LazyArg<Duplex>,
  onError: (error: unknown) => E,
  options?: FromReadableOptions & FromWritableOptions
) => Channel<never, IE, Chunk<I>, unknown, IE | E, Chunk<O>, void> = internal.fromDuplex

/**
 * @category combinators
 * @since 1.0.0
 */
export const pipeThroughDuplex: {
  <E2, B = Uint8Array>(
    duplex: LazyArg<Duplex>,
    onError: (error: unknown) => E2,
    options?: FromReadableOptions & FromWritableOptions
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E2 | E, B>
  <R, E, A, E2, B = Uint8Array>(
    self: Stream<R, E, A>,
    duplex: LazyArg<Duplex>,
    onError: (error: unknown) => E2,
    options?: FromReadableOptions & FromWritableOptions
  ): Stream<R, E | E2, B>
} = internal.pipeThroughDuplex

/**
 * @category combinators
 * @since 1.0.0
 */
export const pipeThroughSimple: {
  (duplex: LazyArg<Duplex>): <R, E>(self: Stream<R, E, string | Uint8Array>) => Stream<R, E | PlatformError, Uint8Array>
  <R, E>(self: Stream<R, E, string | Uint8Array>, duplex: LazyArg<Duplex>): Stream<R, PlatformError | E, Uint8Array>
} = internal.pipeThroughSimple

/**
 * @since 1.0.0
 * @category conversions
 */
export const toString: <E>(
  readable: LazyArg<Readable | NodeJS.ReadableStream>,
  options: {
    readonly onFailure: (error: unknown) => E
    readonly encoding?: BufferEncoding | undefined
    readonly maxBytes?: SizeInput | undefined
  }
) => Effect<never, E, string> = internal.toString

/**
 * @since 1.0.0
 * @category conversions
 */
export const toUint8Array: <E>(
  readable: LazyArg<Readable | NodeJS.ReadableStream>,
  options: { readonly onFailure: (error: unknown) => E; readonly maxBytes?: SizeInput | undefined }
) => Effect<never, E, Uint8Array> = internal.toUint8Array
