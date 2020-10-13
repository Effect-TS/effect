import { makeBy_ } from "../Array"
import { pipe, tuple } from "../Function"
import * as P from "../Promise"
import * as Q from "../Queue"
import { foldCauseM } from "."
import { bracket } from "./bracket"
import { collectAllUnit } from "./collectAllUnit"
import { chain, fork } from "./core"
import * as D from "./do"
import type { Effect } from "./effect"
import { foreach } from "./foreach"
import { foreachUnit } from "./foreachUnit"
import { forever } from "./forever"
import { map } from "./map"
import { tap } from "./tap"

/**
 * Applies the functionw `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * Unlike `foreachPar`, this method will use at most up to `n` fibers.
 */
export function foreachParN_(n: number) {
  return <A, R, E, B>(
    as: Iterable<A>,
    f: (a: A) => Effect<R, E, B>
  ): Effect<R, E, readonly B[]> =>
    pipe(
      Q.makeBounded<readonly [P.Promise<E, B>, A]>(n),
      bracket(
        (q) =>
          pipe(
            D.do,
            D.bind("pairs", () =>
              pipe(
                as,
                foreach((a) =>
                  pipe(
                    P.make<E, B>(),
                    map((p) => tuple(p, a))
                  )
                )
              )
            ),
            tap(({ pairs }) => pipe(pairs, foreachUnit(q.offer), fork)),
            tap(({ pairs }) =>
              pipe(
                makeBy_(n, () =>
                  pipe(
                    q.take,
                    chain(([p, a]) =>
                      pipe(
                        f(a),
                        foldCauseM(
                          (c) =>
                            pipe(
                              pairs,
                              foreach(([promise]) => pipe(promise, P.halt(c)))
                            ),
                          (b) => pipe(p, P.succeed(b))
                        )
                      )
                    ),
                    forever,
                    fork
                  )
                ),
                collectAllUnit
              )
            ),
            D.bind("res", ({ pairs }) =>
              pipe(
                pairs,
                foreach(([p]) => P.await(p))
              )
            ),
            map(({ res }) => res)
          ),
        (q) => q.shutdown
      )
    )
}
