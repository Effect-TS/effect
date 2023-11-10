/**
 * This module provides utility functions for working with records in TypeScript.
 *
 * @since 2.0.0
 */

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/ReadonlyRecord.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/ReadonlyRecord.js"

/**
 * @since 2.0.0
 */
export declare namespace ReadonlyRecord {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/ReadonlyRecord.js"
}
/**
 * @category models
 * @since 2.0.0
 */
export interface ReadonlyRecord<A> {
  readonly [x: string]: A
}
