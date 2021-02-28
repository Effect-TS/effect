import { chain_, succeed } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map"

/**
 * @dataFirst bind_
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
  > =>
    chain_(mk, (k) =>
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
}

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
  return chain_(mk, (k) =>
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
}

/**
 * @dataFirst let_
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
  > =>
    map_(
      mk,
      (
        k
      ): K &
        {
          [k in N]: A
        } => ({ ...k, [tag]: f(k) } as any)
    )
}

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
    (
      k
    ): K &
      {
        [k in N]: A
      } => ({ ...k, [tag]: f(k) } as any)
  )
}

const do_ = succeed({})

export { let__ as let, bind, do_ as do }
