/**
 * Binds an effectful value in a `do` scope
 *
 * @tsplus fluent ets/Effect bind
 */
export function bind_<R2, E2, R, E, A, K, N extends string>(
  self: Effect<R2, E2, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<
  R & R2,
  E | E2,
  MergeRecord<
    K,
    {
      [k in N]: A;
    }
  >
> {
  return self.flatMap((k) =>
    f(k).map(
      (
        a
      ): MergeRecord<
        K,
        {
          [k in N]: A;
        }
      > => ({ ...k, [tag]: a } as any)
    )
  );
}

/**
 * Binds an effectful value in a `do` scope
 *
 * @ets_data_first bind_
 */
export function bind<R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Effect<R, E, A>,
  __tsplusTrace?: string
) {
  return <R2, E2>(
    self: Effect<R2, E2, K>
  ): Effect<
    R & R2,
    E | E2,
    MergeRecord<
      K,
      {
        [k in N]: A;
      }
    >
  > => self.bind(tag, f);
}

/**
 * Like bind for values
 *
 * @tsplus fluent ets/Effect bindValue
 */
export function bindValue_<R2, E2, A, K, N extends string>(
  self: Effect<R2, E2, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => A,
  __tsplusTrace?: string
): Effect<
  R2,
  E2,
  MergeRecord<
    K,
    {
      [k in N]: A;
    }
  >
> {
  return self.map(
    (
      k
    ): MergeRecord<
      K,
      {
        [k in N]: A;
      }
    > => ({ ...k, [tag]: f(k) } as any)
  );
}

/**
 * Like bind for values
 *
 * @ets_data_first bindValue_
 */
export function bindValue<A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => A,
  __tsplusTrace?: string
) {
  return <R2, E2>(
    self: Effect<R2, E2, K>
  ): Effect<
    R2,
    E2,
    MergeRecord<
      K,
      {
        [k in N]: A;
      }
    >
  > => self.bindValue(tag, f);
}

/**
 * @tsplus static ets/Effect/Ops Do
 */
export function Do(): Effect<unknown, never, {}> {
  return Effect.succeedNow({});
}
