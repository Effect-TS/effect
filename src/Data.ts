/**
 * @since 2.0.0
 */
import type { Equal } from "./Equal.js"

/**
 * @since 2.0.0
 */
export * from "./impl/Data.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/Data.js"

/**
 * @since 2.0.0
 */
export declare namespace Data {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Data.js"
}
/**
 * @category models
 * @since 2.0.0
 */
export type Data<A> =
  & { readonly [P in keyof A]: A[P] }
  & Equal
