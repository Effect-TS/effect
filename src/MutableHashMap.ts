import type { HashMap } from "./HashMap.js"
import type { TypeId } from "./impl/MutableHashMap.js"
import type { Inspectable } from "./Inspectable.js"
import type { MutableRef } from "./MutableRef.js"
import type { Pipeable } from "./Pipeable.js"

export * from "./impl/MutableHashMap.js"
export * from "./internal/Jumpers/MutableHashMap.js"

export declare namespace MutableHashMap {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/MutableHashMap.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface MutableHashMap<K, V> extends Iterable<[K, V]>, Pipeable, Inspectable {
  readonly [TypeId]: TypeId

  /** @internal */
  readonly backingMap: MutableRef<HashMap<K, V>>
}
