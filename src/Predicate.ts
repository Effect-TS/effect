export * from "./impl/Predicate.js"
export * from "./internal/Jumpers/Predicate.js"

export declare namespace Predicate {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Predicate.js"
}
/**
 * @category models
 * @since 2.0.0
 */
export interface Predicate<A> {
  (a: A): boolean
}
