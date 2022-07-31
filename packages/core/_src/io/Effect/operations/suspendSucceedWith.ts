import { ISuspendWith } from "@effect/core/io/Effect/definition/primitives"

/**
 * Returns a lazily constructed effect, whose construction may itself require
 * effects. The effect must not throw any exceptions. When no environment is
 * required (i.e., when `R == unknown`) it is conceptually equivalent to
 * `flatten(succeed(effect))`. If you wonder if the effect throws
 * exceptions, do not use this method, use `suspend`.
 *
 * @tsplus static effect/core/io/Effect.Ops suspendSucceedWith
 */
export function suspendSucceedWith<R, E, A>(
  f: (runtimeConfig: RuntimeConfig, fiberId: FiberId) => Effect<R, E, A>
): Effect<R, E, A> {
  return new ISuspendWith(f)
}
