// tracing: off

import { traceAs } from "@effect-ts/tracing-utils"

import { chain_, succeed } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map"

/**
 * @dataFirst bind_
 * @trace 1
 */
function bind<R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Effect<R, E, A>
) {
  return <R2, E2>(
    mk: Effect<R2, E2, K>
  ): Effect<
    R & R2,
    E | E2,
    K &
      {
        [k in N]: A
      }
  > => bind_(mk, tag, f)
}

/**
 * @trace 2
 */
export function bind_<R2, E2, R, E, A, K, N extends string>(
  mk: Effect<R2, E2, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => Effect<R, E, A>
): Effect<
  R & R2,
  E | E2,
  K &
    {
      [k in N]: A
    }
> {
  return chain_(
    mk,
    traceAs(f, (k) =>
      map_(
        f(k),
        (
          a
        ): K &
          {
            [k in N]: A
          } => ({ ...k, [tag]: a } as any)
      )
    )
  )
}

/**
 * @dataFirst let_
 * @trace 1
 */
function let__<A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => A) {
  return <R2, E2>(
    mk: Effect<R2, E2, K>
  ): Effect<
    R2,
    E2,
    K &
      {
        [k in N]: A
      }
  > => let_(mk, tag, f)
}

/**
 * @trace 2
 */
export function let_<R2, E2, A, K, N extends string>(
  mk: Effect<R2, E2, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => A
): Effect<
  R2,
  E2,
  K &
    {
      [k in N]: A
    }
> {
  return map_(
    mk,
    traceAs(
      f,
      (
        k
      ): K &
        {
          [k in N]: A
        } => ({ ...k, [tag]: f(k) } as any)
    )
  )
}

const do_ = succeed({})

export { let__ as let, bind, do_ as do }
