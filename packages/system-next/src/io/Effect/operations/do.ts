import type { MergeRecord } from "../../../data/Utils/types"
import { Effect } from "../definition"

/**
 * Binds an effectful value in a `do` scope
 *
 * @ets_data_first bind_
 */
export function bind<R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Effect<R, E, A>,
  __etsTrace?: string
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
  > => bind_(mk, tag, f)
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
  __etsTrace?: string
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
  return mk.flatMap((k) =>
    f(k).map(
      (
        a
      ): MergeRecord<
        K,
        {
          [k in N]: A
        }
      > => ({ ...k, [tag]: a } as any)
    )
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
  __etsTrace?: string
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
 *
 * @ets fluent ets/Effect bindValue
 */
export function bindValue_<R2, E2, A, K, N extends string>(
  mk: Effect<R2, E2, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => A,
  __etsTrace?: string
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
  return mk.map(
    (
      k
    ): MergeRecord<
      K,
      {
        [k in N]: A
      }
    > => ({ ...k, [tag]: f(k) } as any)
  )
}

/**
 * @ets static ets/EffectOps Do
 */
export function Do() {
  return Effect.succeedNow({})
}
