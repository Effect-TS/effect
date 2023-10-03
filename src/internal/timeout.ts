/**
 * Bun currently has a bug where `setTimeout` doesn't behave correctly with a 0ms delay.
 *
 * @see https://github.com/oven-sh/bun/issues/3333
 */

/** @internal */
const isBun = typeof process === "undefined" ? false : !!((process as any)?.isBun)

/** @internal */
export const clear: (id: NodeJS.Timeout) => void = isBun ? (id) => clearInterval(id) : (id) => clearTimeout(id)

/** @internal */
export const set: (fn: () => void, ms: number) => NodeJS.Timeout = isBun ?
  (fn: () => void, ms: number) => {
    const id = setInterval(() => {
      fn()
      clearInterval(id)
    }, ms)

    return id
  } :
  (fn: () => void, ms: number) => setTimeout(fn, ms)
