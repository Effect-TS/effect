import type { HashMap } from "./HashMap.js"
import type { Inspectable } from "./Inspectable.js"
import type { TypeId } from "./MutableHashMap.impl.js"
import type { MutableRef } from "./MutableRef.js"
import type { Pipeable } from "./Pipeable.js"

export * from "./internal/Jumpers/MutableHashMap.js"
export * from "./MutableHashMap.impl.js"

export declare namespace MutableHashMap {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./MutableHashMap.impl.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface MutableHashMap<K, V> extends Iterable<readonly [K, V]>, Pipeable, Inspectable {
  readonly [TypeId]: TypeId

  /** @internal */
  readonly backingMap: MutableRef<HashMap<K, V>>
}
