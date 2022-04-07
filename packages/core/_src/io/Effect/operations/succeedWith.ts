import { ISucceedWith } from "@effect/core/io/Effect/definition/primitives";

/**
 * The same as `succeed`, but also provides access to the underlying
 * `RuntimeConfig` and `FiberId`.
 *
 * @tsplus static ets/Effect/Ops succeedWith
 */
export function succeedWith<A>(
  f: (runtimeConfig: RuntimeConfig, fiberId: FiberId) => A,
  __tsplusTrace?: string
): UIO<A> {
  return new ISucceedWith(f, __tsplusTrace);
}
