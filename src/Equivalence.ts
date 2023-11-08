export * from "./impl/Equivalence.js"
export * from "./internal/Jumpers/Equivalence.js"

export declare namespace Equivalence {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Equivalence.js"
}
/**
 * @category type class
 * @since 2.0.0
 */
export interface Equivalence<A> {
  (self: A, that: A): boolean
}
