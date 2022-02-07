// ets_tracing: off

import { pipe } from "../Function/index.js"
import type { Exit } from "./core.js"
import { chain, map, succeed } from "./core.js"

function bind<E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Exit<E, A>
) {
  return <E2>(
    mk: Exit<E2, K>
  ): Exit<
    E | E2,
    K & {
      [k in N]: A
    }
  > =>
    pipe(
      mk,
      chain((k) =>
        pipe(
          f(k),
          map(
            (
              a
            ): K & {
              [k in N]: A
            } => ({ ...k, [tag]: a } as any)
          )
        )
      )
    )
}

function let_<A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => A) {
  return <E2>(
    mk: Exit<E2, K>
  ): Exit<
    E2,
    K & {
      [k in N]: A
    }
  > =>
    pipe(
      mk,
      map(
        (
          k
        ): K & {
          [k in N]: A
        } => ({ ...k, [tag]: f(k) } as any)
      )
    )
}

const do_ = succeed({})

export { let_ as let, bind, do_ as do }
