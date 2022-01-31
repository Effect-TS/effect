// ets_tracing: off

import type * as A from "../../Collections/Immutable/Chunk/index.js"
import type * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import * as Pull from "../Pull/index.js"
import { Stream } from "./definitions.js"

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldChunkM<R, E, A, Z>(
  z: Z,
  f: (z: Z) => T.Effect<R, E, O.Option<Tp.Tuple<[A.Chunk<A>, Z]>>>
): Stream<R, E, A> {
  return new Stream(
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
                      ({ tuple: [a, z] }) =>
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
