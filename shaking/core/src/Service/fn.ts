import type { FunctionN } from "../Function"
import type { Effect } from "../Support/Common"

export function fn<T extends FunctionN<any, Effect<any, any, any, any>>>(): T {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  return (() => {}) as any
}
