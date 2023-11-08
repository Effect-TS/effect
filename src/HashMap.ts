import type { Equal } from "./Equal.js"
import type { TypeId } from "./HashMap.impl.js"
import type { Inspectable } from "./Inspectable.js"
import type { Option } from "./Option.js"
import type { Pipeable } from "./Pipeable.js"

export * from "./HashMap.impl.js"
export * from "./internal/Jumpers/HashMap.js"

export declare namespace HashMap {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./HashMap.impl.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface HashMap<Key, Value> extends Iterable<[Key, Value]>, Equal, Pipeable, Inspectable {
  [TypeId]: TypeId
}

/**
 * @since 2.0.0
 */
export declare namespace HashMap {
  /**
   * @since 2.0.0
   * @category models
   */
  export type UpdateFn<V> = (option: Option<V>) => Option<V>
  /**
   * This type-level utility extracts the key type `K` from a `HashMap<K, V>` type.
   *
   * @example
   * import { HashMap } from "effect/HashMap"
   *
   * declare const hm: HashMap<string, number>
   *
   * // $ExpectType string
   * type K = HashMap.Key<typeof hm>
   *
   * @since 2.0.0
   * @category type-level
   */
  export type Key<T extends HashMap<any, any>> = [T] extends [HashMap<infer _K, infer _V>] ? _K : never
  /**
   * This type-level utility extracts the value type `V` from a `HashMap<K, V>` type.
   *
   * @example
   * import { HashMap } from "effect/HashMap"
   *
   * declare const hm: HashMap<string, number>
   *
   * // $ExpectType number
   * type V = HashMap.Value<typeof hm>
   *
   * @since 2.0.0
   * @category type-level
   */
  export type Value<T extends HashMap<any, any>> = [T] extends [HashMap<infer _K, infer _V>] ? _V : never
}
