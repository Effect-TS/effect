/** @internal */
export const clear: (id: NodeJS.Timeout) => void = (id) => clearTimeout(id)

/** @internal */
export const set: (fn: () => void, ms: number) => NodeJS.Timeout = 
  (fn: () => void, ms: number) => setTimeout(fn, ms)
