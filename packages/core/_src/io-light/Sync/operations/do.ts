/**
 * @tsplus fluent ets/Sync bind
 */
export function bind_<R, R2, E, E2, A, K, N extends string>(
  self: Sync<R2, E2, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => Sync<R, E, A>
): Sync<R & R2, E | E2, K & { [k in N]: A; }> {
  return self.flatMap((k) =>
    f(k).map(
      (
        a
      ):
        & K
        & {
          [k in N]: A;
        } => ({ ...k, [tag]: a } as any)
    )
  );
}

/**
 * @tsplus static ets/Sync/Aspects bind
 */
export const bind = Pipeable(bind_);

/**
 * @tsplus fluent ets/Sync bindValue
 */
export function bindValue_<R, E, A, K, N extends string>(
  self: Sync<R, E, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => A
): Sync<
  R,
  E,
  & K
  & {
    [k in N]: A;
  }
> {
  return self.map(
    (
      k
    ):
      & K
      & {
        [k in N]: A;
      } => ({ ...k, [tag]: f(k) } as any)
  );
}

/**
 * @tsplus static ets/Sync/Aspects bindValue
 */
export const bindValue = Pipeable(bindValue_);

/**
 * @tsplus static ets/Sync/Ops Do
 */
export function Do() {
  return Sync.succeed({});
}
