/**
 * @tsplus static effect/core/io/Exit.Aspects bind
 * @tsplus pipeable effect/core/io/Exit bind
 */
export function bind<E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Exit<E, A>
) {
  return <E2>(
    mk: Exit<E2, K>
  ): Exit<
    E | E2,
    & K
    & {
      [k in N]: A
    }
  > =>
    mk.flatMap((k) =>
      f(k).map(
        (
          a
        ):
          & K
          & {
            [k in N]: A
          } => ({ ...k, [tag]: a } as any)
      )
    )
}

/**
 * @tsplus static effect/core/io/Exit.Aspects bindValue
 * @tsplus pipeable effect/core/io/Exit bindValue
 */
export function bindValue<A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => A
) {
  return <E2>(
    mk: Exit<E2, K>
  ): Exit<
    E2,
    & K
    & {
      [k in N]: A
    }
  > =>
    mk.map(
      (
        k
      ):
        & K
        & {
          [k in N]: A
        } => ({ ...k, [tag]: f(k) } as any)
    )
}

/**
 * @tsplus static effect/core/io/Exit.Ops Do
 */
export function Do() {
  return Exit.succeed({})
}
