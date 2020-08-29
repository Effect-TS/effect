import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import type * as Array from "../../Array"
import { pipe } from "../../Function"
import * as Option from "../../Option"
import { makeBounded } from "../../Queue"
import * as Ref from "../../Ref"
import * as Pull from "../Pull"
import * as Take from "../Take"
import { Stream } from "./definitions"

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback can possibly return the stream synchronously.
 * The optionality of the error type `E` can be used to signal the end of the stream,
 * by setting it to `None`.
 */
export const effectAsyncMaybe = <R, E, A>(
  register: (
    cb: (
      next: T.Effect<unknown, R, Option.Option<E>, Array.Array<A>>
    ) => Promise<boolean>
  ) => Option.Option<Stream<unknown, R, E, A>>,
  outputBuffer = 16
): Stream<unknown, R, E, A> =>
  new Stream(
    pipe(
      M.of,
      M.bind("output", () =>
        pipe(makeBounded<Take.Take<E, A>>(outputBuffer), T.toManaged())
      ),
      M.bind("runtime", () => pipe(T.runtime<R>(), T.toManaged())),
      M.bind("maybeStream", ({ output, runtime }) =>
        M.effectTotal(() =>
          register((k) =>
            pipe(Take.fromPull(k), T.chain(output.offer), runtime.runPromise)
          )
        )
      ),
      M.bind("pull", ({ maybeStream, output }) =>
        Option.fold_(
          maybeStream,
          () =>
            pipe(
              M.of,
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
              )
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
