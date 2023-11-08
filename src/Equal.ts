import { symbol } from "./Equal.impl.js"
import type { Hash } from "./Hash.js"

export * from "./Equal.impl.js"
export * from "./internal/Jumpers/Equal.js"

export declare namespace Equal {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./Equal.impl.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface Equal extends Hash {
  [symbol](that: Equal): boolean
}
