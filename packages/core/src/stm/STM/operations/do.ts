/**
 * Binds an effectful value in a `do` scope
 *
 * @tsplus static effect/core/stm/STM.Aspects bind
 * @tsplus pipeable effect/core/stm/STM bind
 * @category do
 * @since 1.0.0
 */
export function bind<R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => STM<R, E, A>
) {
  return <R2, E2>(
    self: STM<R2, E2, K>
  ): STM<
    R | R2,
    E | E2,
    MergeRecord<
      K,
      {
        [k in N]: A
      }
    >
  > =>
    self.flatMap((k) =>
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
 * @tsplus static effect/core/stm/STM.Aspects bindValue
 * @tsplus pipeable effect/core/stm/STM bindValue
 * @category do
 * @since 1.0.0
 */
export function bindValue<A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => A
) {
  return <R2, E2>(
    self: STM<R2, E2, K>
  ): STM<
    R2,
    E2,
    MergeRecord<
      K,
      {
        [k in N]: A
      }
    >
  > =>
    self.map(
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
 * @tsplus static effect/core/stm/STM.Ops Do
 * @category do
 * @since 1.0.0
 */
export function Do(): STM<never, never, {}> {
  return STM.succeed({})
}
