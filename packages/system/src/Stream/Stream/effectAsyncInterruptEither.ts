import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as A from "../../Array"
import * as E from "../../Either"
import { pipe } from "../../Function"
import type * as O from "../../Option"
import { makeBounded } from "../../Queue"
import * as R from "../../Ref"
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
    cb: (next: T.Effect<unknown, R, O.Option<E>, A.Array<A>>) => Promise<boolean>
  ) => E.Either<T.Canceler<R>, Stream<unknown, R, E, A>>,
  outputBuffer = 16
): Stream<unknown, R, E, A> =>
  new Stream(
    pipe(
      M.of,
      M.bind("output", () =>
        pipe(makeBounded<Take.Take<E, A>>(outputBuffer), T.toManaged())
      ),
      M.bind("runtime", () => pipe(T.runtime<R>(), T.toManaged())),
      M.bind("eitherStream", ({ output, runtime }) =>
        M.effectTotal(() =>
          register((k) =>
            pipe(Take.fromPull(k), T.chain(output.offer), runtime.runPromise)
          )
        )
      ),
      M.bind("pull", ({ eitherStream, output }) =>
        E.fold_(
          eitherStream,
          (canceler) =>
            pipe(
              M.of,
              M.bind("done", () => R.makeManagedRef(false)),
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
