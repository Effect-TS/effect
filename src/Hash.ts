import { symbol } from "./impl/Hash.js"

export * from "./impl/Hash.js"
export * from "./internal/Jumpers/Hash.js"

export declare namespace Hash {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Hash.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface Hash {
  [symbol](): number
}
