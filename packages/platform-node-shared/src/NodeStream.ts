/**
 * @since 1.0.0
 */
import type { PlatformError } from "@effect/platform/Error"
import type { SizeInput } from "@effect/platform/FileSystem"
import type { Channel } from "effect/Channel"
import type { Chunk } from "effect/Chunk"
import type { Effect } from "effect/Effect"
import type { LazyArg } from "effect/Function"
import type { Stream } from "effect/Stream"
import type { Duplex, Readable } from "node:stream"
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
) => Stream<A, E> = internal.fromReadable

/**
 * @category constructors
 * @since 1.0.0
 */
export const fromReadableChannel: <E, A = Uint8Array>(
  evaluate: LazyArg<Readable | NodeJS.ReadableStream>,
  onError: (error: unknown) => E,
  chunkSize: number | undefined
) => Channel<Chunk<A>, unknown, E, unknown, void, unknown> = internal.fromReadableChannel

/**
 * @category constructors
 * @since 1.0.0
 */
export const fromDuplex: <IE, E, I = Uint8Array, O = Uint8Array>(
  evaluate: LazyArg<Duplex>,
  onError: (error: unknown) => E,
  options?: FromReadableOptions & FromWritableOptions
) => Channel<Chunk<O>, Chunk<I>, IE | E, IE, void, unknown> = internal.fromDuplex

/**
 * @category combinators
 * @since 1.0.0
 */
export const pipeThroughDuplex: {
  <E2, B = Uint8Array>(
    duplex: LazyArg<Duplex>,
    onError: (error: unknown) => E2,
    options?: (FromReadableOptions & FromWritableOptions) | undefined
  ): <R, E, A>(self: Stream<A, E, R>) => Stream<B, E2 | E, R>
  <R, E, A, E2, B = Uint8Array>(
    self: Stream<A, E, R>,
    duplex: LazyArg<Duplex>,
    onError: (error: unknown) => E2,
    options?: (FromReadableOptions & FromWritableOptions) | undefined
  ): Stream<B, E | E2, R>
} = internal.pipeThroughDuplex

/**
 * @category combinators
 * @since 1.0.0
 */
export const pipeThroughSimple: {
  (duplex: LazyArg<Duplex>): <R, E>(self: Stream<string | Uint8Array, E, R>) => Stream<Uint8Array, E | PlatformError, R>
  <R, E>(self: Stream<string | Uint8Array, E, R>, duplex: LazyArg<Duplex>): Stream<Uint8Array, PlatformError | E, R>
} = internal.pipeThroughSimple

/**
 * @since 1.0.0
 * @category conversions
 */
export const toReadable: <E, R>(stream: Stream<string | Uint8Array, E, R>) => Effect<Readable, never, R> =
  internal.toReadable

/**
 * @since 1.0.0
 * @category conversions
 */
export const toReadableNever: <E>(stream: Stream<string | Uint8Array, E, never>) => Readable = internal.toReadableNever

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
) => Effect<string, E> = internal.toString

/**
 * @since 1.0.0
 * @category conversions
 */
export const toUint8Array: <E>(
  readable: LazyArg<Readable | NodeJS.ReadableStream>,
  options: { readonly onFailure: (error: unknown) => E; readonly maxBytes?: SizeInput | undefined }
) => Effect<Uint8Array, E> = internal.toUint8Array
