// ets_tracing: off

import * as T from "../../../Effect"
import { pipe } from "../../../Function"
import { fromEffect } from "./api"
import * as Chain from "./api/chain"
import * as Map from "./api/map"
import type * as C from "./core"

function bind<R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => C.Stream<R, E, A>
) {
  return <R2, E2>(
    mk: C.Stream<R2, E2, K>
  ): C.Stream<R & R2, E | E2, K & { [k in N]: A }> =>
    pipe(
      mk,
      Chain.chain((k) =>
        pipe(
          f(k),
          Map.map((a): K & { [k in N]: A } => ({ ...k, [tag]: a } as any))
        )
      )
    )
}

function let_<A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => A) {
  return <R2, E2>(mk: C.Stream<R2, E2, K>): C.Stream<R2, E2, K & { [k in N]: A }> =>
    pipe(
      mk,
      Map.map((k): K & { [k in N]: A } => ({ ...k, [tag]: f(k) } as any))
    )
}

const do_ = fromEffect(T.succeed({}))

export { let_ as let, bind, do_ as do }
