// ets_tracing: off

import * as X from "./core.js"

function bind<R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => X.Sync<R, E, A>
) {
  return <R2, E2>(
    mk: X.Sync<R2, E2, K>
  ): X.Sync<
    R & R2,
    E | E2,
    K & {
      [k in N]: A
    }
  > =>
    X.chain_(mk, (k) =>
      X.map_(
        f(k),
        (
          a
        ): K & {
          [k in N]: A
        } => ({ ...k, [tag]: a } as any)
      )
    )
}

function let_<A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => A) {
  return <R2, E2>(
    mk: X.Sync<R2, E2, K>
  ): X.Sync<
    R2,
    E2,
    K & {
      [k in N]: A
    }
  > =>
    X.map_(
      mk,
      (
        k
      ): K & {
        [k in N]: A
      } => ({ ...k, [tag]: f(k) } as any)
    )
}

const do_ = X.succeed({})

export { let_ as let, bind, do_ as do }
