import type { FiberId } from "../../FiberId"
import type { RuntimeConfig } from "../../RuntimeConfig"
import type { UIO } from "../definition"
import { ISucceedWith } from "../definition"

/**
 * The same as `succeed`, but also provides access to the underlying
 * `RuntimeConfig` and `FiberId`.
 */
export function succeedWith<A>(
  f: (runtimeConfig: RuntimeConfig, fiberId: FiberId) => A,
  __trace?: string
): UIO<A> {
  return new ISucceedWith(f, __trace)
}
