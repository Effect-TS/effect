import type * as Array from "../../Array"
import type { Exit } from "../../Exit"
import type { Callback } from "../../Fiber"
import { pipe } from "../../Function"
import type * as Option from "../../Option"
import { makeBounded } from "../../Queue"
import * as Ref from "../../Ref"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Pull from "../Pull"
import * as Take from "../Take"
import { chain } from "./chain"
import type { Stream } from "./definitions"
import { managed } from "./managed"
import { repeatEffectChunkOption } from "./repeatEffectChunkOption"

/**
 * Creates a stream from an asynchronous callback that can be called multiple times
 * The registration of the callback itself returns an effect. The optionality of the
 * error type `E` can be used to signal the end of the stream, by setting it to `None`.
 */
export function effectAsyncM<R, E, A, R1 = R, E1 = E>(
  register: (
    cb: (
      next: T.Effect<R, Option.Option<E>, Array.Array<A>>,
      offerCb?: Callback<never, boolean>
    ) => T.UIO<Exit<never, boolean>>
  ) => T.Effect<R1, E1, unknown>,
  outputBuffer = 16
): Stream<R & R1, E | E1, A> {
  return pipe(
    M.do,
    M.bind("output", () =>
      pipe(makeBounded<Take.Take<E, A>>(outputBuffer), T.toManaged())
    ),
    M.bind("runtime", () => pipe(T.runtime<R>(), T.toManaged())),
    M.tap(({ output, runtime }) =>
      T.toManaged()(
        register((k, cb) =>
          pipe(Take.fromPull(k), T.chain(output.offer), (x) => runtime.runCancel(x, cb))
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
    M.map(({ pull }) => pull),
    managed,
    chain(repeatEffectChunkOption)
  )
}
