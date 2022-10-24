/**
 * Binds an effectful value in a `do` scope
 *
 * @tsplus static effect/core/io/Effect.Aspects bind
 * @tsplus pipeable effect/core/io/Effect bind
 * @category do
 * @since 1.0.0
 */
export function bind<N extends string, K, R2, E2, A>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Effect<R2, E2, A>
) {
  return <R, E>(self: Effect<R, E, K>): Effect<
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
 * @tsplus static effect/core/io/Effect.Aspects bindValue
 * @tsplus pipeable effect/core/io/Effect bindValue
 */
export function bindValue<N extends string, K, A>(tag: Exclude<N, keyof K>, f: (_: K) => A) {
  return <R, E>(self: Effect<R, E, K>): Effect<
    R,
    E,
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
 * @tsplus static effect/core/io/Effect.Ops Do
 * @category do
 * @since 1.0.0
 */
export function Do(): Effect<never, never, {}> {
  return Effect.succeed({})
}
