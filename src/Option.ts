// eslint-disable-next-line import/no-cycle
import type { None, Some } from "./Option.impl.js"

export * from "./Option.impl.js"

/**
 * @category models
 * @since 2.0.0
 */
export type Option<A> = None<A> | Some<A>

export declare namespace Option {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./Option.impl.js"
}
