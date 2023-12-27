import type { SizeInput } from "@effect/platform/FileSystem"
import type * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import type { LazyArg } from "effect/Function"
import { dual } from "effect/Function"
import * as Queue from "effect/Queue"
import type * as AsyncInput from "effect/SingleProducerAsyncInput"
import * as Stream from "effect/Stream"
import type { Duplex, Readable, Writable } from "node:stream"
import { type PlatformError, SystemError } from "../Error.js"
import type { FromReadableOptions, FromWritableOptions } from "../Stream.js"

/** @internal */
export const fromReadable = <E, A = Uint8Array>(
  evaluate: LazyArg<Readable | NodeJS.ReadableStream>,
  onError: (error: unknown) => E,
  { chunkSize }: FromReadableOptions = {}
): Stream.Stream<never, E, A> =>
  Stream.fromChannel(
    fromReadableChannel<E, A>(evaluate, onError, chunkSize ? Number(chunkSize) : undefined)
  )

/** @internal */
export const toString = <E>(
  readable: LazyArg<Readable | NodeJS.ReadableStream>,
  options: {
    readonly onFailure: (error: unknown) => E
    readonly encoding?: BufferEncoding
    readonly maxBytes?: SizeInput
  }
): Effect.Effect<never, E, string> => {
  const maxBytesNumber = options.maxBytes ? Number(options.maxBytes) : undefined
  return Effect.acquireUseRelease(
    Effect.sync(() => {
      const stream = readable()
      stream.setEncoding(options.encoding ?? "utf8")
      return stream
    }),
    (stream) =>
      Effect.async((resume) => {
        let string = ""
        let bytes = 0
        stream.once("error", (err) => {
          resume(Effect.fail(options.onFailure(err)))
        })
        stream.once("end", () => {
          resume(Effect.succeed(string))
        })
        stream.on("data", (chunk) => {
          string += chunk
          bytes += Buffer.byteLength(chunk)
          if (maxBytesNumber && bytes > maxBytesNumber) {
            resume(Effect.fail(options.onFailure(new Error("maxBytes exceeded"))))
          }
        })
      }),
    (stream) =>
      Effect.sync(() => {
        stream.removeAllListeners()
        if ("closed" in stream && !stream.closed) {
          stream.destroy()
        }
      })
  )
}

/** @internal */
export const toUint8Array = <E>(
  readable: LazyArg<Readable | NodeJS.ReadableStream>,
  options: {
    readonly onFailure: (error: unknown) => E
    readonly maxBytes?: SizeInput
  }
): Effect.Effect<never, E, Uint8Array> => {
  const maxBytesNumber = options.maxBytes ? Number(options.maxBytes) : undefined
  return Effect.acquireUseRelease(
    Effect.sync(readable),
    (stream) =>
      Effect.async((resume) => {
        let buffer = Buffer.alloc(0)
        let bytes = 0
        stream.once("error", (err) => {
          resume(Effect.fail(options.onFailure(err)))
        })
        stream.once("end", () => {
          resume(Effect.succeed(buffer))
        })
        stream.on("data", (chunk) => {
          buffer = Buffer.concat([buffer, chunk])
          bytes += chunk.length
          if (maxBytesNumber && bytes > maxBytesNumber) {
            resume(Effect.fail(options.onFailure(new Error("maxBytes exceeded"))))
          }
        })
      }),
    (stream) =>
      Effect.sync(() => {
        stream.removeAllListeners()
        if ("closed" in stream && !stream.closed) {
          stream.destroy()
        }
      })
  )
}

/** @internal */
export const fromDuplex = <IE, E, I = Uint8Array | string, O = Uint8Array>(
  evaluate: LazyArg<Duplex>,
  onError: (error: unknown) => E,
  options: FromReadableOptions & FromWritableOptions = {}
): Channel.Channel<never, IE, Chunk.Chunk<I>, unknown, IE | E, Chunk.Chunk<O>, void> =>
  Channel.acquireUseRelease(
    Effect.tap(
      Effect.zip(
        Effect.sync(evaluate),
        Queue.unbounded<Either.Either<Exit.Exit<IE | E, void>, void>>()
      ),
      ([duplex, queue]) => readableOffer(duplex, queue, onError)
    ),
    ([duplex, queue]) =>
      Channel.embedInput(
        readableTake(duplex, queue, options.chunkSize ? Number(options.chunkSize) : undefined),
        writeInput(
          duplex,
          (cause) => Queue.offer(queue, Either.left(Exit.failCause(cause))),
          options
        )
      ),
    ([duplex, queue]) =>
      Effect.zipRight(
        Effect.sync(() => {
          duplex.removeAllListeners()
          if (!duplex.closed) {
            duplex.destroy()
          }
        }),
        Queue.shutdown(queue)
      )
  )

/** @internal */
export const pipeThroughDuplex = dual<
  <E2, B = Uint8Array>(
    duplex: LazyArg<Duplex>,
    onError: (error: unknown) => E2,
    options?: FromReadableOptions & FromWritableOptions
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E | E2, B>,
  <R, E, A, E2, B = Uint8Array>(
    self: Stream.Stream<R, E, A>,
    duplex: LazyArg<Duplex>,
    onError: (error: unknown) => E2,
    options?: FromReadableOptions & FromWritableOptions
  ) => Stream.Stream<R, E | E2, B>
>(
  (args) => Stream.StreamTypeId in args[0],
  (self, duplex, onError, options) =>
    Stream.pipeThroughChannelOrFail(
      self,
      fromDuplex(duplex, onError, options)
    )
)

/** @internal */
export const pipeThroughSimple = dual<
  (
    duplex: LazyArg<Duplex>
  ) => <R, E>(self: Stream.Stream<R, E, string | Uint8Array>) => Stream.Stream<R, E | PlatformError, Uint8Array>,
  <R, E>(
    self: Stream.Stream<R, E, string | Uint8Array>,
    duplex: LazyArg<Duplex>
  ) => Stream.Stream<R, E | PlatformError, Uint8Array>
>(
  2,
  (self, duplex) =>
    Stream.pipeThroughChannelOrFail(
      self,
      fromDuplex(duplex, (error) =>
        SystemError({
          module: "Stream",
          method: "pipeThroughSimple",
          pathOrDescriptor: "",
          reason: "Unknown",
          message: String(error)
        }))
    )
)

/** @internal */
export const fromReadableChannel = <E, A = Uint8Array>(
  evaluate: LazyArg<Readable | NodeJS.ReadableStream>,
  onError: (error: unknown) => E,
  chunkSize: number | undefined
): Channel.Channel<never, unknown, unknown, unknown, E, Chunk.Chunk<A>, void> =>
  Channel.acquireUseRelease(
    Effect.tap(
      Effect.zip(
        Effect.sync(evaluate),
        Queue.unbounded<Either.Either<Exit.Exit<E, void>, void>>()
      ),
      ([readable, queue]) => readableOffer(readable, queue, onError)
    ),
    ([readable, queue]) => readableTake(readable, queue, chunkSize),
    ([readable, queue]) =>
      Effect.zipRight(
        Effect.sync(() => {
          readable.removeAllListeners()
          if ("closed" in readable && !readable.closed) {
            readable.destroy()
          }
        }),
        Queue.shutdown(queue)
      )
  )

/** @internal */
export const writeInput = <IE, A>(
  writable: Writable | NodeJS.WritableStream,
  onFailure: (cause: Cause.Cause<IE>) => Effect.Effect<never, never, void>,
  { encoding, endOnDone = true }: FromWritableOptions,
  onDone = Effect.unit
): AsyncInput.AsyncInputProducer<IE, Chunk.Chunk<A>, unknown> => {
  const write = writeEffect(writable, encoding)
  const close = endOnDone
    ? Effect.async<never, never, void>((resume) => {
      if ("closed" in writable && writable.closed) {
        resume(Effect.unit)
      } else {
        writable.once("finish", () => resume(Effect.unit))
        writable.end()
      }
    })
    : Effect.unit
  return {
    awaitRead: () => Effect.unit,
    emit: write,
    error: (cause) => Effect.zipRight(close, onFailure(cause)),
    done: (_) => Effect.zipRight(close, onDone)
  }
}

/** @internal */
export const writeEffect = <A>(
  writable: Writable | NodeJS.WritableStream,
  encoding?: BufferEncoding
) =>
(chunk: Chunk.Chunk<A>) =>
  chunk.length === 0 ?
    Effect.unit :
    Effect.async<never, never, void>((resume) => {
      const iterator = chunk[Symbol.iterator]()
      let next = iterator.next()
      function loop() {
        const item = next
        next = iterator.next()
        const success = writable.write(item.value, encoding as any)
        if (next.done) {
          resume(Effect.unit)
        } else if (success) {
          loop()
        } else {
          writable.once("drain", loop)
        }
      }
      loop()
    })

const readableOffer = <E>(
  readable: Readable | NodeJS.ReadableStream,
  queue: Queue.Queue<Either.Either<Exit.Exit<E, void>, void>>,
  onError: (error: unknown) => E
) =>
  Effect.sync(() => {
    readable.on("readable", () => {
      const size = queue.unsafeSize()
      if (size._tag === "Some" && size.value <= 0) {
        queue.unsafeOffer(Either.right(void 0))
      }
    })
    readable.on("error", (err) => {
      queue.unsafeOffer(Either.left(Exit.fail(onError(err))))
    })
    readable.on("end", () => {
      queue.unsafeOffer(Either.left(Exit.unit))
    })
    if (readable.readable) {
      queue.unsafeOffer(Either.right(void 0))
    }
  })

const readableTake = <E, A>(
  readable: Readable | NodeJS.ReadableStream,
  queue: Queue.Queue<Either.Either<Exit.Exit<E, void>, void>>,
  chunkSize: number | undefined
) => {
  const read = readChunkChannel<A>(readable, chunkSize)
  const loop: Channel.Channel<never, unknown, unknown, unknown, E, Chunk.Chunk<A>, void> = Channel.flatMap(
    Queue.take(queue),
    Either.match({
      onLeft: Exit.match({
        onFailure: Channel.failCause,
        onSuccess: (_) => Channel.unit
      }),
      onRight: (_) => Channel.flatMap(read, () => loop)
    })
  )
  return loop
}

const readChunkChannel = <A>(
  readable: Readable | NodeJS.ReadableStream,
  chunkSize: number | undefined
) =>
  Channel.suspend(() => {
    const arr: Array<A> = []
    let chunk = readable.read(chunkSize)
    while (chunk !== null) {
      arr.push(chunk)
      chunk = readable.read(chunkSize)
    }
    return Channel.write(Chunk.unsafeFromArray(arr))
  })
