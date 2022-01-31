// ets_tracing: off

import { pipe } from "../../Function/index.js"
import * as T from "../_internal/effect.js"
import { chain } from "./chain.js"
import type { Stream } from "./definitions.js"
import { fromEffect } from "./fromEffect.js"
import { map } from "./map.js"

function bind<R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Stream<R, E, A>
) {
  return <R2, E2>(mk: Stream<R2, E2, K>): Stream<R & R2, E | E2, K & { [k in N]: A }> =>
    pipe(
      mk,
      chain((k) =>
        pipe(
          f(k),
          map((a): K & { [k in N]: A } => ({ ...k, [tag]: a } as any))
        )
      )
    )
}

function let_<A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => A) {
  return <R2, E2>(mk: Stream<R2, E2, K>): Stream<R2, E2, K & { [k in N]: A }> =>
    pipe(
      mk,
      map((k): K & { [k in N]: A } => ({ ...k, [tag]: f(k) } as any))
    )
}

const do_ = fromEffect(T.succeed({}))

export { let_ as let, bind, do_ as do }
