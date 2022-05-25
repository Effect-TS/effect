export const defaultScheduler: (thunk: Lazy<void>) => void =
  // @ts-ignore
  typeof setImmediate === "undefined" ? (thunk) => setTimeout(thunk, 0) : setImmediate
