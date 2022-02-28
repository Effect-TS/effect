import { Sync } from "../definition"

/**
 * @tsplus fluent ets/Sync bind
 */
export function bind_<R, R2, E, E2, A, K, N extends string>(
  self: Sync<R2, E2, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => Sync<R, E, A>
): Sync<R & R2, E | E2, K & { [k in N]: A }> {
  return self.flatMap((k) =>
    f(k).map(
      (
        a
      ): K & {
        [k in N]: A
      } => ({ ...k, [tag]: a } as any)
    )
  )
}

/**
 * @ets_data_first bind_
 */
export function bind<R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Sync<R, E, A>
) {
  return <R2, E2>(
    self: Sync<R2, E2, K>
  ): Sync<
    R & R2,
    E | E2,
    K & {
      [k in N]: A
    }
  > => self.bind(tag, f)
}

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
  K & {
    [k in N]: A
  }
> {
  return self.map(
    (
      k
    ): K & {
      [k in N]: A
    } => ({ ...k, [tag]: f(k) } as any)
  )
}

/**
 * @ets_data_first bindValue_
 */
export function bindValue<A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => A
) {
  return <R, E>(
    self: Sync<R, E, K>
  ): Sync<
    R,
    E,
    K & {
      [k in N]: A
    }
  > => self.bindValue(tag, f)
}

/**
 * @tsplus static ets/SyncOps Do
 */
export function Do() {
  return Sync.succeed({})
}
