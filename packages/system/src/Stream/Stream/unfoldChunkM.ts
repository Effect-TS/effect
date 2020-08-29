import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import type * as Array from "../../Array"
import { pipe } from "../../Function"
import * as Option from "../../Option"
import * as Ref from "../../Ref"
import * as Pull from "../Pull"
import { Stream } from "./definitions"

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export const unfoldChunkM = <Z>(z: Z) => <S, R, E, A>(
  f: (z: Z) => T.Effect<S, R, E, Option.Option<readonly [Array.Array<A>, Z]>>
): Stream<S, R, E, A> =>
  new Stream(
    pipe(
      M.of,
      M.bind("done", () => Ref.makeManagedRef(false)),
      M.bind("ref", () => Ref.makeManagedRef(z)),
      M.let("pull", ({ done, ref }) =>
        pipe(
          done.get,
          T.chain((isDone) =>
            isDone
              ? Pull.end
              : pipe(
                  ref.get,
                  T.chain(f),
                  T.foldM(
                    Pull.fail,
                    Option.fold(
                      () =>
                        pipe(
                          done.set(true),
                          T.chain(() => Pull.end)
                        ),
                      ([a, z]) =>
                        pipe(
                          ref.set(z),
                          T.map(() => a)
                        )
                    )
                  )
                )
          )
        )
      ),
      M.map(({ pull }) => pull)
    )
  )
