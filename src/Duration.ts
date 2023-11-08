import type { DurationValue, TypeId } from "./Duration.impl.js"
import type { Equal } from "./Equal.js"
import type { Inspectable } from "./Inspectable.js"
import type { Pipeable } from "./Pipeable.js"

export * from "./Duration.impl.js"
export * from "./internal/Jumpers/Duration.js"

export declare namespace Duration {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./Duration.impl.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface Duration extends Equal, Pipeable, Inspectable {
  readonly [TypeId]: TypeId
  readonly value: DurationValue
}
