/**
 * Binds an effectful value in a `do` scope
 *
 * @tsplus fluent ets/STM bind
 */
export function bind_<R2, E2, R, E, A, K, N extends string>(
  self: STM<R2, E2, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => STM<R, E, A>
): STM<
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
  f: (_: K) => STM<R, E, A>
) {
  return <R2, E2>(
    self: STM<R2, E2, K>
  ): STM<
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
 * @tsplus fluent ets/STM bindValue
 */
export function bindValue_<R2, E2, A, K, N extends string>(
  self: STM<R2, E2, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => A
): STM<
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
        [k in N]: A;
      }
    >
  > => self.bindValue(tag, f);
}

/**
 * @tsplus static ets/STM/Ops Do
 */
export function Do(): STM<unknown, never, {}> {
  return STM.succeedNow({});
}
