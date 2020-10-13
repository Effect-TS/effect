import { makeBy_ } from "../Array"
import { interrupt } from "../Fiber"
import { pipe, tuple } from "../Function"
import * as P from "../Promise"
import * as Q from "../Queue"
import { foldCauseM } from "."
import { bracket } from "./bracket"
import { collectAll } from "./collectAll"
import { chain, fork } from "./core"
import * as D from "./do"
import type { Effect } from "./effect"
import { foreach } from "./foreach"
import { foreachUnit } from "./foreachUnit"
import { forever } from "./forever"
import { map } from "./map"
import { sandbox } from "./sandbox"
import { tap } from "./tap"
import { unsandbox } from "./unsandbox"

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
            D.bind("fibers", ({ pairs }) =>
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
                collectAll
              )
            ),
            D.bind("res", ({ fibers, pairs }) =>
              pipe(
                pairs,
                foreach(([p]) => P.await(p)),
                sandbox,
                tap(() => pipe(fibers, foreach(interrupt))),
                unsandbox
              )
            ),
            map(({ res }) => res)
          ),
        (q) => q.shutdown
      )
    )
}
