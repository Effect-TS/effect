/**
 * @since 2.0.0
 */
import type { Equal } from "./Equal.js"
import type { DurationValue, TypeId } from "./impl/Duration.js"
import type { Inspectable } from "./Inspectable.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/Duration.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/Duration.js"

/**
 * @since 2.0.0
 */
export declare namespace Duration {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Duration.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface Duration extends Equal, Pipeable, Inspectable {
  readonly [TypeId]: TypeId
  readonly value: DurationValue
}
