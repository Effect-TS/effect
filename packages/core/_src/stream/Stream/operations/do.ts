/**
 * @tsplus fluent ets/Stream bind
 */
export function bind_<R, E, R2, E2, A, K, N extends string>(
  self: Stream<R, E, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => Stream<R2, E2, A>
): Stream<R & R2, E | E2, K & { [k in N]: A; }> {
  return self.flatMap((k) => f(k).map((a): K & { [k in N]: A; } => ({ ...k, [tag]: a } as any)));
}

/**
 * @tsplus static ets/Stream/Aspects bind
 */
export const bind = Pipeable(bind_);

/**
 * @tsplus fluent ets/Stream bindValue
 */
export function bindValue_<R, E, A, K, N extends string>(
  self: Stream<R, E, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => A
): Stream<R, E, K & { [k in N]: A; }> {
  return self.map((k): K & { [k in N]: A; } => ({ ...k, [tag]: f(k) } as any));
}

/**
 * @tsplus static ets/Stream/Aspects bindValue
 */
export const bindValue = Pipeable(bindValue_);

/**
 * @tsplus static ets/Stream/Ops Do
 */
export function Do(__tsplusTrace?: string): Stream<unknown, never, {}> {
  return Stream.fromEffect(Effect.succeedNow({}));
}
