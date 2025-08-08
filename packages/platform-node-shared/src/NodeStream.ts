/**
 * @since 1.0.0
 */
import type { PlatformError } from "@effect/platform/Error"
import type { SizeInput } from "@effect/platform/FileSystem"
import type { Channel } from "effect/Channel"
import type { Chunk } from "effect/Chunk"
import type { Effect } from "effect/Effect"
import type { LazyArg } from "effect/Function"
import * as Stream from "effect/Stream"
import type { Duplex, Readable } from "node:stream"
import * as internal from "./internal/stream.js"

/**
 * @category models
 * @since 1.0.0
 */
export interface FromReadableOptions {
  /** Defaults to undefined, which lets Node.js decide the chunk size */
  readonly chunkSize?: SizeInput
  /** Default to true, which means the stream will be closed when done */
  readonly closeOnDone?: boolean | undefined
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
export const fromReadable: <E, A = Uint8Array<ArrayBufferLike>>(
  evaluate: LazyArg<Readable | NodeJS.ReadableStream>,
  onError: (error: unknown) => E,
  options?: FromReadableOptions
) => Stream.Stream<A, E> = internal.fromReadable

/**
 * @category constructors
 * @since 1.0.0
 */
export const fromReadableChannel: <E, A = Uint8Array<ArrayBufferLike>>(
  evaluate: LazyArg<Readable | NodeJS.ReadableStream>,
  onError: (error: unknown) => E,
  options?: FromReadableOptions | undefined
) => Channel<Chunk<A>, unknown, E> = internal.fromReadableChannel

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
  ): <R, E, A>(self: Stream.Stream<A, E, R>) => Stream.Stream<B, E2 | E, R>
  <R, E, A, E2, B = Uint8Array>(
    self: Stream.Stream<A, E, R>,
    duplex: LazyArg<Duplex>,
    onError: (error: unknown) => E2,
    options?: (FromReadableOptions & FromWritableOptions) | undefined
  ): Stream.Stream<B, E | E2, R>
} = internal.pipeThroughDuplex

/**
 * @category combinators
 * @since 1.0.0
 */
export const pipeThroughSimple: {
  (
    duplex: LazyArg<Duplex>
  ): <R, E>(self: Stream.Stream<string | Uint8Array, E, R>) => Stream.Stream<Uint8Array, E | PlatformError, R>
  <R, E>(
    self: Stream.Stream<string | Uint8Array, E, R>,
    duplex: LazyArg<Duplex>
  ): Stream.Stream<Uint8Array, PlatformError | E, R>
} = internal.pipeThroughSimple

/**
 * @since 1.0.0
 * @category conversions
 */
export const toReadable: <E, R>(stream: Stream.Stream<string | Uint8Array, E, R>) => Effect<Readable, never, R> =
  internal.toReadable

/**
 * @since 1.0.0
 * @category conversions
 */
export const toReadableNever: <E>(stream: Stream.Stream<string | Uint8Array, E, never>) => Readable =
  internal.toReadableNever

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

/**
 * @since 1.0.0
 * @category stdio
 */
export const stdin: Stream.Stream<Uint8Array> = internal.fromReadable(() => process.stdin, (err) => err, {
  closeOnDone: false
}).pipe(Stream.orDie)

/**
 * @since 1.0.0
 * @category stdio
 */
export const stdout: Stream.Stream<Uint8Array> = internal.fromReadable(() => process.stdout, (err) => err, {
  closeOnDone: false
}).pipe(Stream.orDie)

/**
 * @since 1.0.0
 * @category stdio
 */
export const stderr: Stream.Stream<Uint8Array> = internal.fromReadable(() => process.stderr, (err) => err, {
  closeOnDone: false
}).pipe(Stream.orDie)
