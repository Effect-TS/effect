// ets_tracing: off

import type * as A from "../../Collections/Immutable/Chunk/index.js"
import type * as Ex from "../../Exit/index.js"
import { pipe } from "../../Function/index.js"
import type * as O from "../../Option/index.js"
import * as Q from "../../Queue/index.js"
import * as T from "../_internal/effect.js"
import type * as F from "../_internal/fiber.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import * as Pull from "../Pull/index.js"
import * as Take from "../Take/index.js"
import { chain } from "./chain.js"
import type { Stream } from "./definitions.js"
import { managed } from "./managed.js"
import { repeatEffectChunkOption } from "./repeatEffectChunkOption.js"

/**
 * Creates a stream from an asynchronous callback that can be called multiple times
 * The registration of the callback itself returns an effect. The optionality of the
 * error type `E` can be used to signal the end of the stream, by setting it to `None`.
 */
export function effectAsyncM<R, E, A, R1 = R, E1 = E>(
  register: (
    cb: (
      next: T.Effect<R, O.Option<E>, A.Chunk<A>>,
      offerCb?: F.Callback<never, boolean>
    ) => T.UIO<Ex.Exit<never, boolean>>
  ) => T.Effect<R1, E1, unknown>,
  outputBuffer = 16
): Stream<R & R1, E | E1, A> {
  return pipe(
    M.do,
    M.bind("output", () =>
      pipe(Q.makeBounded<Take.Take<E, A>>(outputBuffer), T.toManaged)
    ),
    M.bind("runtime", () => pipe(T.runtime<R>(), T.toManaged)),
    M.tap(({ output, runtime }) =>
      T.toManaged(
        register((k, cb) =>
          pipe(
            Take.fromPull(k),
            T.chain((x) => Q.offer_(output, x)),
            (x) => runtime.runCancel(x, cb)
          )
        )
      )
    ),
    M.bind("done", () => Ref.makeManagedRef(false)),
    M.let("pull", ({ done, output }) =>
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
    ),
    M.map(({ pull }) => pull),
    managed,
    chain(repeatEffectChunkOption)
  )
}
