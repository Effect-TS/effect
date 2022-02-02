// ets_tracing: off

import { pipe } from "../Function/index.js"
import type { Cause } from "./cause.js"
import { fail } from "./cause.js"
import { chain, map } from "./core.js"

const bind =
  <A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => Cause<A>) =>
  (mk: Cause<K>): Cause<K & { [k in N]: A }> =>
    pipe(
      mk,
      chain((k) =>
        pipe(
          f(k),
          map((a): K & { [k in N]: A } => ({ ...k, [tag]: a } as any))
        )
      )
    )

const let_ =
  <A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => A) =>
  (mk: Cause<K>): Cause<K & { [k in N]: A }> =>
    pipe(
      mk,
      map((k): K & { [k in N]: A } => ({ ...k, [tag]: f(k) } as any))
    )

const do_ = fail({})

export { let_ as let, bind, do_ as do }
