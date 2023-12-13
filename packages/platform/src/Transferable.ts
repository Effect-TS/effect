/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category symbols
 */
export const symbol = Symbol.for("@effect/platform/Transferable")

/**
 * @since 1.0.0
 * @category models
 */
export interface Transferable {
  readonly [symbol]: () => ReadonlyArray<globalThis.Transferable>
}

/**
 * @since 1.0.0
 * @category accessors
 */
export const get = (u: unknown): ReadonlyArray<globalThis.Transferable> => {
  if (typeof u === "object" && u !== null && symbol in u) {
    return (u as Transferable)[symbol]()
  }
  return []
}
