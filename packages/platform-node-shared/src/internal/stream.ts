import { type PlatformError, SystemError } from "@effect/platform/Error"
import type { SizeInput } from "@effect/platform/FileSystem"
import * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import type { LazyArg } from "effect/Function"
import { dual } from "effect/Function"
import * as Mailbox from "effect/Mailbox"
import * as Runtime from "effect/Runtime"
import * as Scope from "effect/Scope"
import type * as AsyncInput from "effect/SingleProducerAsyncInput"
import * as Stream from "effect/Stream"
import type { Duplex, Writable } from "node:stream"
import { Readable } from "node:stream"
import type { FromReadableOptions, FromWritableOptions } from "../NodeStream.js"

/** @internal */
export const fromReadable = <E, A = Uint8Array>(
  evaluate: LazyArg<Readable | NodeJS.ReadableStream>,
  onError: (error: unknown) => E,
  { chunkSize }: FromReadableOptions = {}
): Stream.Stream<A, E> =>
  Stream.fromChannel(
    fromReadableChannel<E, A>(evaluate, onError, chunkSize ? Number(chunkSize) : undefined)
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
export const fromDuplex = <IE, E, I = Uint8Array | string, O = Uint8Array>(
  evaluate: LazyArg<Duplex>,
  onError: (error: unknown) => E,
  options: FromReadableOptions & FromWritableOptions = {}
): Channel.Channel<Chunk.Chunk<O>, Chunk.Chunk<I>, IE | E, IE, void, unknown> =>
  Channel.acquireUseRelease(
    Effect.tap(
      Effect.zip(
        Effect.sync(evaluate),
        Mailbox.make<void, IE | E>()
      ),
      ([duplex, mailbox]) => readableOffer(duplex, mailbox, onError)
    ),
    ([duplex, mailbox]) =>
      Channel.embedInput(
        readableTake(duplex, mailbox, options.chunkSize ? Number(options.chunkSize) : undefined),
        writeInput(
          duplex,
          (cause) => mailbox.failCause(cause),
          options
        )
      ),
    ([duplex, mailbox]) =>
      Effect.zipRight(
        Effect.sync(() => {
          if (!duplex.closed) {
            duplex.destroy()
          }
        }),
        mailbox.shutdown
      )
  )

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
): Channel.Channel<Chunk.Chunk<A>, unknown, E, unknown, void, unknown> =>
  Channel.acquireUseRelease(
    Effect.tap(
      Effect.zip(
        Effect.sync(evaluate),
        Mailbox.make<void, E>()
      ),
      ([readable, mailbox]) => readableOffer(readable, mailbox, onError)
    ),
    ([readable, mailbox]) => readableTake(readable, mailbox, chunkSize),
    ([readable, mailbox]) =>
      Effect.zipRight(
        Effect.sync(() => {
          if ("closed" in readable && !readable.closed) {
            readable.destroy()
          }
        }),
        mailbox.shutdown
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

const readableOffer = <E>(
  readable: Readable | NodeJS.ReadableStream,
  mailbox: Mailbox.Mailbox<void, E>,
  onError: (error: unknown) => E
) =>
  Effect.sync(() => {
    readable.on("readable", () => {
      mailbox.unsafeOffer(void 0)
    })
    readable.on("error", (err) => {
      mailbox.unsafeDone(Exit.fail(onError(err)))
    })
    readable.on("end", () => {
      mailbox.unsafeDone(Exit.void)
    })
    if (readable.readable) {
      mailbox.unsafeOffer(void 0)
    }
  })

const readableTake = <E, A>(
  readable: Readable | NodeJS.ReadableStream,
  mailbox: Mailbox.Mailbox<void, E>,
  chunkSize: number | undefined
) => {
  const read = readChunkChannel<A>(readable, chunkSize)
  const loop: Channel.Channel<Chunk.Chunk<A>, unknown, E> = Channel.flatMap(
    mailbox.takeAll,
    ([, done]) => done ? read : Channel.zipRight(read, loop)
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
    if (chunk === null) {
      return Channel.void
    }
    while (chunk !== null) {
      arr.push(chunk)
      chunk = readable.read(chunkSize)
    }
    return Channel.write(Chunk.unsafeFromArray(arr))
  })

class StreamAdapter<E, R> extends Readable {
  private readonly scope: Scope.CloseableScope
  private readonly pull: (
    cb: (err: Error | null, data: ReadonlyArray<Uint8Array | string> | null) => void
  ) => void

  constructor(
    private readonly runtime: Runtime.Runtime<R>,
    private readonly stream: Stream.Stream<Uint8Array | string, E, R>
  ) {
    super({})
    this.scope = Effect.runSync(Scope.make())
    const pull = Stream.toPull(this.stream).pipe(
      Scope.extend(this.scope),
      Runtime.runSync(this.runtime),
      Effect.map(Chunk.toReadonlyArray),
      Effect.catchAll((error) => error._tag === "None" ? Effect.succeed(null) : Effect.fail(error.value))
    )
    const runFork = Runtime.runFork(this.runtime)
    this.pull = function(done) {
      runFork(pull).addObserver((exit) => {
        done(
          exit._tag === "Failure" ? new Error("failure in StreamAdapter", { cause: Cause.squash(exit.cause) }) : null,
          exit._tag === "Success" ? exit.value : null
        )
      })
    }
  }

  _read(_size: number): void {
    this.pull((error, data) => {
      if (error !== null) {
        this._destroy(error, () => {})
      } else if (data === null) {
        this.push(null)
      } else {
        for (let i = 0; i < data.length; i++) {
          const chunk = data[i]
          if (typeof chunk === "string") {
            this.push(chunk, "utf8")
          } else {
            this.push(chunk)
          }
        }
      }
    })
  }

  _destroy(_error: Error | null, callback: (error?: Error | null | undefined) => void): void {
    Runtime.runFork(this.runtime)(Scope.close(this.scope, Exit.void)).addObserver((exit) => {
      callback(exit._tag === "Failure" ? Cause.squash(exit.cause) as any : null)
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
