import type { Equal } from "./Equal.js"
import type { TypeId } from "./impl/BigDecimal.js"
import type { Inspectable } from "./Inspectable.js"
import type { Pipeable } from "./Pipeable.js"

export * from "./impl/BigDecimal.js"
export * from "./internal/Jumpers/BigDecimal.js"

export declare namespace BigDecimal {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/BigDecimal.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface BigDecimal extends Equal, Pipeable, Inspectable {
  readonly [TypeId]: TypeId
  readonly value: bigint
  readonly scale: number
  /** @internal */
  normalized?: BigDecimal
}
