import { Effect } from "../../../io/Effect"
import { Stream } from "../definition"

export function bind_<R, E, R2, E2, A, K, N extends string>(
  self: Stream<R, E, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => Stream<R2, E2, A>
): Stream<R & R2, E | E2, K & { [k in N]: A }> {
  return self.flatMap((k) =>
    f(k).map((a): K & { [k in N]: A } => ({ ...k, [tag]: a } as any))
  )
}

export const bind = Pipeable(bind_)

export function bindValue_<R, E, A, K, N extends string>(
  self: Stream<R, E, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => A
): Stream<R, E, K & { [k in N]: A }> {
  return self.map((k): K & { [k in N]: A } => ({ ...k, [tag]: f(k) } as any))
}

export const bindValue = Pipeable(bindValue_)

export const Do = Stream.fromEffect(Effect.succeedNow({}))
