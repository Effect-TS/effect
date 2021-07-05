import type { Effect } from "./effect"

export interface EffectAspectConfig {
  RequireEnv?: any
  LimitEnv?: any
  ProvideEnv?: any
  HandleError?: any
  LimitError?: any
  ProduceError?: any
}

export interface EffectAspect<X extends EffectAspectConfig> {
  <R, E, A>(
    effect: Effect<R & ([X] extends [{ ProvideEnv: infer K }] ? K : unknown), E, A> &
      ([X] extends [{ LimitEnv: infer K }] ? Effect<K, unknown, A> : unknown) &
      ([X] extends [{ LimitError: infer K }]
        ? Effect<R & ([X] extends [{ ProvideEnv: infer K }] ? K : unknown), K, A>
        : unknown)
  ): Effect<
    R & ([X] extends [{ RequireEnv: infer K }] ? K : unknown),
    | Exclude<E, [X] extends [{ HandleError: infer K }] ? K : never>
    | ([X] extends [{ ProduceError: infer K }] ? K : never),
    A
  >
}

/**
 * @optimize identity
 */
export function aspect<X extends EffectAspectConfig>(
  _: (_: <A>() => A) => X
): (_: EffectAspect<X>) => EffectAspect<X> {
  return (_) => _
}
