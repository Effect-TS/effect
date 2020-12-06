import type * as A from "@effect-ts/core/Classic/Array"
import * as O from "@effect-ts/core/Classic/Option"
import * as T from "@effect-ts/core/Effect"
import * as M from "@effect-ts/core/Effect/Managed"
import * as S from "@effect-ts/core/Effect/Stream"
import * as Push from "@effect-ts/core/Effect/Stream/Push"
import * as Sink from "@effect-ts/core/Effect/Stream/Sink"
import { pipe } from "@effect-ts/core/Function"
import type * as stream from "stream"

export class ReadableError {
  readonly _tag = "ReadableError"
  constructor(readonly error: Error) {}
}

/**
 * Captures a Node `Readable`, converting it into a `Stream`,
 *
 * Note: your Readable should not have an encoding set in order to work with buffers,
 * calling this with a Readable with an encoding setted with `Die`.
 */
export function streamFromReadable(
  r: () => stream.Readable
): S.Stream<unknown, ReadableError, Buffer> {
  return pipe(
    T.effectTotal(r),
    T.tap((sr) =>
      sr.readableEncoding != null
        ? T.dieMessage(
            `stream.Readable encoding set to ${sr.readableEncoding} cannot be used to produce Buffer`
          )
        : T.unit
    ),
    S.bracket((sr) =>
      T.effectTotal(() => {
        sr.destroy()
      })
    ),
    S.chain((sr) =>
      S.effectAsync<unknown, ReadableError, Buffer>((cb) => {
        sr.on("data", (data) => {
          cb(T.succeed(data))
        })
        sr.on("end", () => {
          cb(T.fail(O.none))
        })
        sr.on("error", (err) => {
          cb(T.fail(O.some(new ReadableError(err))))
        })
      })
    )
  )
}

export class WritableError {
  readonly _tag = "WritableError"
  constructor(readonly error: Error) {}
}

/**
 * Captures a Node `Writable`, converting it into a `Sink`
 */
export function sinkFromWritable(
  w: () => stream.Writable
): Sink.Sink<unknown, WritableError, Buffer, never, void> {
  return new Sink.Sink(
    pipe(
      T.effectTotal(w),
      M.makeExit((sw) =>
        T.effectTotal(() => {
          sw.destroy()
        })
      ),
      M.map((sw) => (o: O.Option<A.Array<Buffer>>) =>
        O.isNone(o)
          ? Push.emit(undefined, [])
          : T.effectAsync((cb) => {
              sw.write(Buffer.concat(o.value), (err) => {
                if (err) {
                  cb(Push.fail(new WritableError(err), []))
                } else {
                  cb(Push.more)
                }
              })
            })
      )
    )
  )
}
