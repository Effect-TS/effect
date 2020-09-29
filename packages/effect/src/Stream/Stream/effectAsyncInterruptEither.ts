import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import type * as Array from "../../Array"
import * as Either from "../../Either"
import type { Exit } from "../../Exit"
import type { Callback } from "../../Fiber"
import { pipe } from "../../Function"
import type * as Option from "../../Option"
import { makeBounded } from "../../Queue"
import * as Ref from "../../Ref"
import * as Pull from "../Pull"
import * as Take from "../Take"
import { Stream } from "./definitions"

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback returns either a canceler or synchronously returns a stream.
 * The optionality of the error type `E` can be used to signal the end of the stream, by
 * setting it to `None`.
 */
export const effectAsyncInterruptEither = <R, E, A>(
  register: (
    cb: (
      next: T.Effect<R, Option.Option<E>, Array.Array<A>>,
      offerCb?: Callback<never, boolean>
    ) => T.UIO<Exit<never, boolean>>
  ) => Either.Either<T.Canceler<R>, Stream<R, E, A>>,
  outputBuffer = 16
): Stream<R, E, A> =>
  new Stream(
    pipe(
      M.do,
      M.bind("output", () =>
        pipe(makeBounded<Take.Take<E, A>>(outputBuffer), T.toManaged())
      ),
      M.bind("runtime", () => pipe(T.runtime<R>(), T.toManaged())),
      M.bind("eitherStream", ({ output, runtime }) =>
        M.effectTotal(() =>
          register((k, cb) =>
            pipe(Take.fromPull(k), T.chain(output.offer), (x) =>
              runtime.runCancel(x, cb)
            )
          )
        )
      ),
      M.bind("pull", ({ eitherStream, output }) =>
        Either.fold_(
          eitherStream,
          (canceler) =>
            pipe(
              M.do,
              M.bind("done", () => Ref.makeManagedRef(false)),
              M.map(({ done }) =>
                pipe(
                  done.get,
                  T.chain((b) =>
                    b
                      ? Pull.end
                      : pipe(
                          output.take,
                          T.chain(Take.done),
                          T.onError(() =>
                            pipe(
                              done.set(true),
                              T.chain(() => output.shutdown)
                            )
                          )
                        )
                  )
                )
              ),
              M.ensuring(canceler)
            ),
          (s) =>
            pipe(
              output.shutdown,
              T.toManaged(),
              M.chain(() => s.proc)
            )
        )
      ),
      M.map(({ pull }) => pull)
    )
  )
