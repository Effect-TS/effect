import { type PlatformError, SystemError } from "@effect/platform/Error"
import type { SizeInput } from "@effect/platform/FileSystem"
import * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import type { LazyArg } from "effect/Function"
import { dual } from "effect/Function"
import * as MutableRef from "effect/MutableRef"
import * as Runtime from "effect/Runtime"
import type * as AsyncInput from "effect/SingleProducerAsyncInput"
import * as Stream from "effect/Stream"
import type { Duplex, Writable } from "node:stream"
import { Readable } from "node:stream"
import type { FromReadableOptions, FromWritableOptions } from "../NodeStream.js"

/** @internal */
export const fromReadable = <E, A = Uint8Array>(
  evaluate: LazyArg<Readable | NodeJS.ReadableStream>,
  onError: (error: unknown) => E,
  options?: FromReadableOptions
): Stream.Stream<A, E> =>
  Stream.fromChannel(
    fromReadableChannel<E, A>(evaluate, onError, options)
  )

/** @internal */
export const toString = <E>(
  readable: LazyArg<Readable | NodeJS.ReadableStream>,
  options: {
    readonly onFailure: (error: unknown) => E
    readonly encoding?: BufferEncoding | undefined
    readonly maxBytes?: SizeInput | undefined
  }
): Effect.Effect<string, E> => {
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
    readonly maxBytes?: SizeInput | undefined
  }
): Effect.Effect<Uint8Array, E> => {
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
        if ("closed" in stream && !stream.closed) {
          stream.destroy()
        }
      })
  )
}

/** @internal */
export const fromDuplex = <IE, E, I = string | Uint8Array<ArrayBufferLike>, O = Uint8Array<ArrayBufferLike>>(
  evaluate: LazyArg<Duplex>,
  onError: (error: unknown) => E,
  options?: FromReadableOptions & FromWritableOptions
): Channel.Channel<
  Chunk.Chunk<O>,
  Chunk.Chunk<I>,
  IE | E,
  IE
> =>
  Channel.suspend(() => {
    const duplex = evaluate()
    if (!duplex.readable) {
      return Channel.void
    }
    const exit = MutableRef.make<Exit.Exit<void, IE | E> | undefined>(undefined)
    return Channel.embedInput(
      unsafeReadableRead<O, IE | E>(duplex, onError, exit, options),
      writeInput<IE, I>(
        duplex,
        (cause) => Effect.sync(() => MutableRef.set(exit, Exit.failCause(cause))),
        options
      )
    )
  })

/** @internal */
export const pipeThroughDuplex = dual<
  <E2, B = Uint8Array>(
    duplex: LazyArg<Duplex>,
    onError: (error: unknown) => E2,
    options?: FromReadableOptions & FromWritableOptions
  ) => <R, E, A>(self: Stream.Stream<A, E, R>) => Stream.Stream<B, E | E2, R>,
  <R, E, A, E2, B = Uint8Array>(
    self: Stream.Stream<A, E, R>,
    duplex: LazyArg<Duplex>,
    onError: (error: unknown) => E2,
    options?: FromReadableOptions & FromWritableOptions
  ) => Stream.Stream<B, E | E2, R>
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
  ) => <R, E>(self: Stream.Stream<string | Uint8Array, E, R>) => Stream.Stream<Uint8Array, E | PlatformError, R>,
  <R, E>(
    self: Stream.Stream<string | Uint8Array, E, R>,
    duplex: LazyArg<Duplex>
  ) => Stream.Stream<Uint8Array, E | PlatformError, R>
>(
  2,
  (self, duplex) =>
    Stream.pipeThroughChannelOrFail(
      self,
      fromDuplex(duplex, (cause) =>
        new SystemError({
          module: "Stream",
          method: "pipeThroughSimple",
          reason: "Unknown",
          cause
        }))
    )
)

/** @internal */
export const fromReadableChannel = <E, A = Uint8Array>(
  evaluate: LazyArg<Readable | NodeJS.ReadableStream>,
  onError: (error: unknown) => E,
  options?: FromReadableOptions | undefined
): Channel.Channel<
  Chunk.Chunk<A>,
  unknown,
  E
> =>
  Channel.suspend(() =>
    unsafeReadableRead(
      evaluate(),
      onError,
      MutableRef.make(undefined),
      options
    )
  )

/** @internal */
export const writeInput = <IE, A>(
  writable: Writable | NodeJS.WritableStream,
  onFailure: (cause: Cause.Cause<IE>) => Effect.Effect<void>,
  { encoding, endOnDone = true }: FromWritableOptions = {},
  onDone = Effect.void
): AsyncInput.AsyncInputProducer<IE, Chunk.Chunk<A>, unknown> => {
  const write = writeEffect(writable, encoding)
  const close = endOnDone
    ? Effect.async<void>((resume) => {
      if ("closed" in writable && writable.closed) {
        resume(Effect.void)
      } else {
        writable.once("finish", () => resume(Effect.void))
        writable.end()
      }
    })
    : Effect.void
  return {
    awaitRead: () => Effect.void,
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
    Effect.void :
    Effect.async<void>((resume) => {
      const iterator = chunk[Symbol.iterator]()
      let next = iterator.next()
      function loop() {
        const item = next
        next = iterator.next()
        const success = writable.write(item.value, encoding as any)
        if (next.done) {
          resume(Effect.void)
        } else if (success) {
          loop()
        } else {
          writable.once("drain", loop)
        }
      }
      loop()
    })

const unsafeReadableRead = <A, E>(
  readable: Readable | NodeJS.ReadableStream,
  onError: (error: unknown) => E,
  exit: MutableRef.MutableRef<Exit.Exit<void, E> | undefined>,
  options: FromReadableOptions | undefined
) => {
  if (!readable.readable) {
    return Channel.void
  }

  const latch = Effect.unsafeMakeLatch(false)
  function onReadable() {
    latch.unsafeOpen()
  }
  function onErr(err: unknown) {
    exit.current = Exit.fail(onError(err))
    latch.unsafeOpen()
  }
  function onEnd() {
    exit.current = Exit.void
    latch.unsafeOpen()
  }
  readable.on("readable", onReadable)
  readable.on("error", onErr)
  readable.on("end", onEnd)

  const chunkSize = options?.chunkSize ? Number(options.chunkSize) : undefined
  const read = Channel.suspend(function loop(): Channel.Channel<Chunk.Chunk<A>, unknown, E> {
    let item = readable.read(chunkSize) as A | null
    if (item === null) {
      if (exit.current) {
        return Channel.fromEffect(exit.current)
      }
      latch.unsafeClose()
      return Channel.flatMap(latch.await, loop)
    }
    const arr = [item as A]
    while (true) {
      item = readable.read(chunkSize)
      if (item === null) {
        return Channel.flatMap(Channel.write(Chunk.unsafeFromArray(arr)), loop)
      }
      arr.push(item as A)
    }
  })

  return Channel.ensuring(
    read,
    Effect.sync(() => {
      readable.off("readable", onReadable)
      readable.off("error", onErr)
      readable.off("end", onEnd)
      if (options?.closeOnDone !== false && "closed" in readable && !readable.closed) {
        readable.destroy()
      }
    })
  )
}

class StreamAdapter<E, R> extends Readable {
  readonly readLatch: Effect.Latch
  fiber: Fiber.RuntimeFiber<void, E> | undefined = undefined

  constructor(
    runtime: Runtime.Runtime<R>,
    stream: Stream.Stream<Uint8Array | string, E, R>
  ) {
    super({})
    this.readLatch = Effect.unsafeMakeLatch(false)
    this.fiber = Runtime.runFork(runtime)(
      this.readLatch.whenOpen(
        Stream.runForEachChunk(stream, (chunk) =>
          this.readLatch.whenOpen(Effect.sync(() => {
            if (chunk.length === 0) return
            this.readLatch.unsafeClose()
            for (const item of chunk) {
              if (typeof item === "string") {
                this.push(item, "utf8")
              } else {
                this.push(item)
              }
            }
          })))
      )
    )
    this.fiber.addObserver((exit) => {
      this.fiber = undefined
      if (Exit.isSuccess(exit)) {
        this.push(null)
      } else {
        this.destroy(Cause.squash(exit.cause) as any)
      }
    })
  }

  _read(_size: number): void {
    this.readLatch.unsafeOpen()
  }

  _destroy(error: Error | null, callback: (error?: Error | null | undefined) => void): void {
    if (!this.fiber) {
      return callback(error)
    }
    Effect.runFork(Fiber.interrupt(this.fiber)).addObserver((exit) => {
      callback(exit._tag === "Failure" ? Cause.squash(exit.cause) as any : error)
    })
  }
}

/** @internal */
export const toReadable = <E, R>(
  stream: Stream.Stream<Uint8Array | string, E, R>
): Effect.Effect<Readable, never, R> =>
  Effect.map(
    Effect.runtime<R>(),
    (runtime) => new StreamAdapter(runtime, stream)
  )

/** @internal */
export const toReadableNever = <E>(
  stream: Stream.Stream<Uint8Array | string, E>
): Readable => new StreamAdapter(Runtime.defaultRuntime, stream)
