// eslint-disable-next-line import/no-cycle
import type { None, Some } from "./impl/Option.js"
// import type {} from "./Option.amb.js"

export * from "./impl/Option.js"
export * from "./internal/Jumpers/Option.js"

/**
 * @category models
 * @since 2.0.0
 */
export type Option<A> = None<A> | Some<A>

// export declare namespace Option {
//   // eslint-disable-next-line import/no-cycle
//   // @ts-expect-error
//   export type * from "./impl/Option.js"
// }
