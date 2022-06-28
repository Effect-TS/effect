import { ISucceedWith } from "@effect/core/io/Effect/definition/primitives"

/**
 * The same as `succeed`, but also provides access to the underlying
 * `RuntimeConfig` and `FiberId`.
 *
 * @tsplus static effect/core/io/Effect.Ops succeedWith
 */
export function succeedWith<A>(
  f: (runtimeConfig: RuntimeConfig, fiberId: FiberId) => A,
  __tsplusTrace?: string
): Effect<never, never, A> {
  return new ISucceedWith(f, __tsplusTrace)
}
