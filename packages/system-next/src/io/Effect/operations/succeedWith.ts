import type { FiberId } from "../../FiberId"
import type { RuntimeConfig } from "../../RuntimeConfig"
import type { UIO } from "../definition"
import { ISucceedWith } from "../definition"

/**
 * The same as `succeed`, but also provides access to the underlying
 * `RuntimeConfig` and `FiberId`.
 *
 * @tsplus static ets/EffectOps succeedWith
 */
export function succeedWith<A>(
  f: (runtimeConfig: RuntimeConfig, fiberId: FiberId) => A,
  __etsTrace?: string
): UIO<A> {
  return new ISucceedWith(f, __etsTrace)
}
