import type { Lazy } from "../../Function"

export const defaultScheduler: (thunk: Lazy<void>) => void =
  typeof setImmediate !== "undefined" ? setImmediate : (x) => setTimeout(x, 0)
