import * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import { pipe } from "effect/Function"
import * as Sink from "effect/Sink"
import type { Writable } from "node:stream"
import type { FromWritableOptions } from "../Sink"

/** @internal */
export const fromWritable = <E, A>(
  evaluate: LazyArg<Writable>,
  onError: (error: unknown) => E,
  { encoding, endOnClose = true }: FromWritableOptions = {}
): Sink.Sink<never, E, A, never, void> =>
  endOnClose ?
    makeSinkWithRelease<E, A>(evaluate, onError, encoding) :
    makeSink<E, A>(evaluate, onError, encoding)

const makeSink = <E, A>(stream: LazyArg<Writable>, onError: (error: unknown) => E, encoding?: BufferEncoding) =>
  pipe(
    Effect.sync(stream),
    Effect.map((stream) => Sink.forEach(write<E, A>(stream, onError, encoding))),
    Sink.unwrap
  )

const makeSinkWithRelease = <E, A>(
  stream: LazyArg<Writable>,
  onError: (error: unknown) => E,
  encoding?: BufferEncoding
) =>
  pipe(
    Effect.acquireRelease(Effect.sync(stream), endWritable),
    Effect.map((stream) => Sink.forEach(write<E, A>(stream, onError, encoding))),
    Sink.unwrapScoped
  )

const endWritable = (stream: Writable) =>
  Effect.async<never, never, void>((resume) => {
    if (stream.closed) {
      resume(Effect.unit)
      return
    }

    stream.end(() => resume(Effect.unit))
  })

const write = <E, A>(stream: Writable, onError: (error: unknown) => E, encoding?: BufferEncoding) => (_: A) =>
  Effect.async<never, E, void>((resume) => {
    const cb = (err?: Error | null) => {
      if (err) {
        resume(Effect.fail(onError(err)))
      } else {
        resume(Effect.unit)
      }
    }

    if (encoding) {
      stream.write(_, encoding, cb)
    } else {
      stream.write(_, cb)
    }
  })
