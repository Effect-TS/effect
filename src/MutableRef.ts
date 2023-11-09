import type { TypeId } from "./impl/MutableRef.js"
import type { Inspectable } from "./Inspectable.js"
import type { Pipeable } from "./Pipeable.js"

export * from "./impl/MutableRef.js"
export * from "./internal/Jumpers/MutableRef.js"

export declare namespace MutableRef {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/MutableRef.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface MutableRef<T> extends Pipeable, Inspectable {
  readonly [TypeId]: TypeId

  /** @internal */
  current: T
}
