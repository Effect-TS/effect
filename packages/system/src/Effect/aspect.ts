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
  <R = unknown, E = never, A = never>(
    effect: Effect<
      (R | ([X] extends [{ LimitEnv: infer K }] ? K : never)) &
        ([X] extends [{ ProvideEnv: infer K }] ? K : unknown),
      | (E & ([X] extends [{ LimitError: infer K }] ? K : unknown))
      | ([X] extends [{ HandleError: infer K }] ? K : never),
      A
    >
  ): Effect<
    R & ([X] extends [{ RequireEnv: infer K }] ? K : unknown),
    | (E & ([X] extends [{ LimitError: infer K }] ? K : unknown))
    | ([X] extends [{ ProduceError: infer K }] ? K : never),
    A
  >
}

export function aspect<X extends EffectAspectConfig>(
  _: (_: <A>() => A) => X
): {
  /**
   * @optimize identity
   */
  (_: EffectAspect<X>): EffectAspect<X>
} {
  return (_) => _
}
