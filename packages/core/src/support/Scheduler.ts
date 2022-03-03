import type { Lazy } from "../data/Function"

export const defaultScheduler: (thunk: Lazy<void>) => void =
  typeof setImmediate === "undefined" ? (thunk) => setTimeout(thunk, 0) : setImmediate
