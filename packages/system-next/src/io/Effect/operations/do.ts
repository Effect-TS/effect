import type { MergeRecord } from "../../../data/Utils/types"
import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { map_ } from "./map"
import { succeedNow } from "./succeedNow"

/**
 * Binds an effectful value in a `do` scope
 *
 * @ets_data_first bind_
 */
export function bind<R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Effect<R, E, A>,
  __trace?: string
) {
  return <R2, E2>(
    mk: Effect<R2, E2, K>
  ): Effect<
    R & R2,
    E | E2,
    MergeRecord<
      K,
      {
        [k in N]: A
      }
    >
  > => bind_(mk, tag, f, __trace)
}

/**
 * Binds an effectful value in a `do` scope
 *
 * @ets fluent ets/Effect bind
 */
export function bind_<R2, E2, R, E, A, K, N extends string>(
  mk: Effect<R2, E2, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => Effect<R, E, A>,
  __trace?: string
): Effect<
  R & R2,
  E | E2,
  MergeRecord<
    K,
    {
      [k in N]: A
    }
  >
> {
  return chain_(
    mk,
    (k) =>
      map_(
        f(k),
        (
          a
        ): MergeRecord<
          K,
          {
            [k in N]: A
          }
        > => ({ ...k, [tag]: a } as any)
      ),
    __trace
  )
}

/**
 * Like bind for values
 *
 * @ets_data_first let_
 */
export function bindValue<A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => A,
  __trace?: string
) {
  return <R2, E2>(
    mk: Effect<R2, E2, K>
  ): Effect<
    R2,
    E2,
    MergeRecord<
      K,
      {
        [k in N]: A
      }
    >
  > => bindValue_(mk, tag, f)
}

/**
 * Like bind for values
 */
export function bindValue_<R2, E2, A, K, N extends string>(
  mk: Effect<R2, E2, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => A,
  __trace?: string
): Effect<
  R2,
  E2,
  MergeRecord<
    K,
    {
      [k in N]: A
    }
  >
> {
  return map_(
    mk,
    (
      k
    ): MergeRecord<
      K,
      {
        [k in N]: A
      }
    > => ({ ...k, [tag]: f(k) } as any),
    __trace
  )
}

/**
 * @ets static ets/EffectOps Do
 */
export function Do() {
  return succeedNow({})
}
