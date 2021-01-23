import type * as A from "../../Chunk"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import * as Pull from "../Pull"
import { Stream } from "./definitions"

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldChunkM<Z>(z: Z) {
  return <R, E, A>(
    f: (z: Z) => T.Effect<R, E, O.Option<readonly [A.Chunk<A>, Z]>>
  ): Stream<R, E, A> =>
    new Stream(
      pipe(
        M.do,
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
                      O.fold(
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
}
