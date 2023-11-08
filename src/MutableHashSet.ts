import type { Inspectable } from "./Inspectable.js"
import type { MutableHashMap } from "./MutableHashMap.js"
import type { TypeId } from "./MutableHashSet.impl.js"
import type { Pipeable } from "./Pipeable.js"

export * from "./internal/Jumpers/MutableHashSet.js"
export * from "./MutableHashSet.impl.js"

export declare namespace MutableHashSet {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./MutableHashSet.impl.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface MutableHashSet<V> extends Iterable<V>, Pipeable, Inspectable {
  readonly [TypeId]: TypeId

  /** @internal */
  readonly keyMap: MutableHashMap<V, boolean>
}
