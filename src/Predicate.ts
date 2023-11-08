export * from "./internal/Jumpers/Predicate.js"
export * from "./Predicate.impl.js"

export declare namespace Predicate {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./Predicate.impl.js"
}
/**
 * @category models
 * @since 2.0.0
 */
export interface Predicate<A> {
  (a: A): boolean
}
