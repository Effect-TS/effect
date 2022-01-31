// ets_tracing: off

import type { Async } from "./core.js"
import { chain_, map_, succeed } from "./core.js"

/**
 * Binds an effectful value in a `do` scope
 *
 * @ets_data_first bind_
 */
function bind<R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Async<R, E, A>
) {
  return <R2, E2>(
    mk: Async<R2, E2, K>
  ): Async<
    R & R2,
    E | E2,
    K & {
      [k in N]: A
    }
  > => bind_(mk, tag, f)
}

/**
 * Binds an effectful value in a `do` scope
 */
export function bind_<R2, E2, R, E, A, K, N extends string>(
  mk: Async<R2, E2, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => Async<R, E, A>
): Async<
  R & R2,
  E | E2,
  K & {
    [k in N]: A
  }
> {
  return chain_(mk, (k) =>
    map_(
      f(k),
      (
        a
      ): K & {
        [k in N]: A
      } => ({ ...k, [tag]: a } as any)
    )
  )
}

/**
 * Like bind for values
 *
 * @ets_data_first let_
 */
function let__<A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => A) {
  return <R2, E2>(
    mk: Async<R2, E2, K>
  ): Async<
    R2,
    E2,
    K & {
      [k in N]: A
    }
  > => let_(mk, tag, f)
}

/**
 * Like bind for values
 */
export function let_<R2, E2, A, K, N extends string>(
  mk: Async<R2, E2, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => A
): Async<
  R2,
  E2,
  K & {
    [k in N]: A
  }
> {
  return map_(
    mk,
    (
      k
    ): K & {
      [k in N]: A
    } => ({ ...k, [tag]: f(k) } as any)
  )
}

const do_ = succeed({})

export { let__ as let, bind, do_ as do }
