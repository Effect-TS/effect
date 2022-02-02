// ets_tracing: off

import { chain_, map_ } from "./core.js"
import type { Managed } from "./managed.js"
import { succeed } from "./succeed.js"

/**
 * Binds an effectful value in a `do` scope
 *
 * @ets_data_first bind_
 */
export function bind<R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Managed<R, E, A>,
  __trace?: string
) {
  return <R2, E2>(
    mk: Managed<R2, E2, K>
  ): Managed<
    R & R2,
    E | E2,
    K & {
      [k in N]: A
    }
  > => bind_(mk, tag, f, __trace)
}

/**
 * Binds an effectful value in a `do` scope
 */
export function bind_<R2, E2, R, E, A, K, N extends string>(
  mk: Managed<R2, E2, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => Managed<R, E, A>,
  __trace?: string
): Managed<
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
      } => ({ ...k, [tag]: a } as any),
      __trace
    )
  )
}

/**
 * Binds a value in a `do` scope
 *
 * @ets_data_first let_
 */
function let__<A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => A,
  __trace?: string
) {
  return <R2, E2>(
    mk: Managed<R2, E2, K>
  ): Managed<
    R2,
    E2,
    K & {
      [k in N]: A
    }
  > =>
    map_(
      mk,
      (
        k
      ): K & {
        [k in N]: A
      } => ({ ...k, [tag]: f(k) } as any),
      __trace
    )
}

/**
 * Binds a value in a `do` scope
 */
export function let_<R2, E2, A, K, N extends string>(
  mk: Managed<R2, E2, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => A
): Managed<
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

/**
 * Begin a `do` scope
 */
const do_ = succeed({})

export { let__ as let, do_ as do }
