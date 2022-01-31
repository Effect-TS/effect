import { Managed } from "../definition"

/**
 * Binds an effectful value in a `do` scope.
 *
 * @tsplus fluent ets/Managed bind
 */
export function bind_<R2, E2, R, E, A, K, N extends string>(
  self: Managed<R2, E2, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => Managed<R, E, A>,
  __etsTrace?: string
): Managed<
  R & R2,
  E | E2,
  K & {
    [k in N]: A
  }
> {
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
 * Binds an effectful value in a `do` scope.
 *
 * @ets_data_first bind_
 */
export function bind<R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Managed<R, E, A>,
  __etsTrace?: string
) {
  return <R2, E2>(
    self: Managed<R2, E2, K>
  ): Managed<
    R & R2,
    E | E2,
    K & {
      [k in N]: A
    }
  > => bind_(self, tag, f)
}

/**
 * Binds a value in a `do` scope.
 *
 * @tsplus fluent ets/Managed bindValue
 */
export function bindValue_<R2, E2, A, K, N extends string>(
  self: Managed<R2, E2, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => A,
  __etsTrace?: string
): Managed<
  R2,
  E2,
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
 * Binds a value in a `do` scope.
 *
 * @ets_data_first bindValue_
 */
export function bindValue<A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => A,
  __etsTrace?: string
) {
  return <R2, E2>(
    self: Managed<R2, E2, K>
  ): Managed<
    R2,
    E2,
    K & {
      [k in N]: A
    }
  > => bindValue_(self, tag, f)
}

/**
 * Begin a `do` scope.
 *
 * @tsplus static ets/ManagedOps Do
 */
export function Do(__etsTrace?: string) {
  return Managed.succeedNow({})
}
