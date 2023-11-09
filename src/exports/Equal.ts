import { symbol } from "../Equal.js"
import type { Hash } from "./Hash.js"

export * from "../Equal.js"
export * from "../internal/Jumpers/Equal.js"

export declare namespace Equal {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../Equal.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface Equal extends Hash {
  [symbol](that: Equal): boolean
}
