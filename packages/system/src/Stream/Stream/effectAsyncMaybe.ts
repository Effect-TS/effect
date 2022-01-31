// ets_tracing: off

import type * as A from "../../Collections/Immutable/Chunk/index.js"
import type * as Ex from "../../Exit/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as Q from "../../Queue/index.js"
import * as T from "../_internal/effect.js"
import type * as F from "../_internal/fiber.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import * as Pull from "../Pull/index.js"
import * as Take from "../Take/index.js"
import { Stream } from "./definitions.js"

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback can possibly return the stream synchronously.
 * The optionality of the error type `E` can be used to signal the end of the stream,
 * by setting it to `None`.
 */
export function effectAsyncMaybe<R, E, A>(
  register: (
    cb: (
      next: T.Effect<R, O.Option<E>, A.Chunk<A>>,
      offerCb?: F.Callback<never, boolean>
    ) => T.UIO<Ex.Exit<never, boolean>>
  ) => O.Option<Stream<R, E, A>>,
  outputBuffer = 16
): Stream<R, E, A> {
  return new Stream(
    pipe(
      M.do,
      M.bind("output", () =>
        pipe(Q.makeBounded<Take.Take<E, A>>(outputBuffer), T.toManaged)
      ),
      M.bind("runtime", () => pipe(T.runtime<R>(), T.toManaged)),
      M.bind("maybeStream", ({ output, runtime }) =>
        M.succeedWith(() =>
          register((k, cb) =>
            pipe(
              Take.fromPull(k),
              T.chain((x) => Q.offer_(output, x)),
              (x) => runtime.runCancel(x, cb)
            )
          )
        )
      ),
      M.bind("pull", ({ maybeStream, output }) =>
        O.fold_(
          maybeStream,
          () =>
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
                          Q.take(output),
                          T.chain(Take.done),
                          T.onError(() =>
                            pipe(
                              done.set(true),
                              T.chain(() => Q.shutdown(output))
                            )
                          )
                        )
                  )
                )
              )
            ),
          (s) =>
            pipe(
              Q.shutdown(output),
              T.toManaged,
              M.chain(() => s.proc)
            )
        )
      ),
      M.map(({ pull }) => pull)
    )
  )
}
