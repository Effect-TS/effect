/**
 * @since 2.0.0
 */
import type { Equal } from "./Equal.js"
import type {
  ChunkPatchTypeId,
  ContextPatchTypeId,
  HashMapPatchTypeId,
  HashSetPatchTypeId,
  OrPatchTypeId,
  TypeId
} from "./impl/Differ.js"

/**
 * @since 2.0.0
 */
export * from "./impl/Differ.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/Differ.js"

/**
 * @since 2.0.0
 */
export declare namespace Differ {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Differ.js"
}
/**
 * A `Differ<Value, Patch>` knows how to compare an old value and new value of
 * type `Value` to produce a patch of type `Patch` that describes the
 * differences between those values. A `Differ` also knows how to apply a patch
 * to an old value to produce a new value that represents the old value updated
 * with the changes described by the patch.
 *
 * A `Differ` can be used to construct a `FiberRef` supporting compositional
 * updates using the `FiberRef.makePatch` constructor.
 *
 * The `Differ` companion object contains constructors for `Differ` values for
 * common data types such as `Chunk`, `HashMap`, and `HashSet``. In addition,
 * `Differ`values can be transformed using the `transform` operator and combined
 * using the `orElseEither` and `zip` operators. This allows creating `Differ`
 * values for arbitrarily complex data types compositionally.
 *
 * @since 2.0.0
 * @category models
 */
export interface Differ<Value, Patch> {
  readonly [TypeId]: {
    readonly _V: (_: Value) => Value
    readonly _P: (_: Patch) => Patch
  }
  readonly empty: Patch
  readonly diff: (oldValue: Value, newValue: Value) => Patch
  readonly combine: (first: Patch, second: Patch) => Patch
  readonly patch: (patch: Patch, oldValue: Value) => Value
}

/**
 * @since 2.0.0
 */
export declare namespace Differ {
  /**
   * @since 2.0.0
   */
  export namespace Context {
    /**
     * @since 2.0.0
     * @category symbol
     */
    export type TypeId = typeof ContextPatchTypeId
    /**
     * A `Patch<Input, Output>` describes an update that transforms a `Env<Input>`
     * to a `Env<Output>` as a data structure. This allows combining updates to
     * different services in the environment in a compositional way.
     *
     * @since 2.0.0
     * @category models
     */
    export interface Patch<Input, Output> extends Equal {
      readonly [ContextPatchTypeId]: {
        readonly _Input: (_: Input) => void
        readonly _Output: (_: never) => Output
      }
    }
  }

  /**
   * @since 2.0.0
   */
  export namespace Chunk {
    /**
     * @since 2.0.0
     * @category symbol
     */
    export type TypeId = typeof ChunkPatchTypeId
    /**
     * A patch which describes updates to a chunk of values.
     *
     * @since 2.0.0
     * @category models
     */
    export interface Patch<Value, Patch> extends Equal {
      readonly [ChunkPatchTypeId]: {
        readonly _Value: (_: Value) => Value
        readonly _Patch: (_: Patch) => Patch
      }
    }
  }

  /**
   * @since 2.0.0
   */
  export namespace HashMap {
    /**
     * @since 2.0.0
     * @category symbol
     */
    export type TypeId = typeof HashMapPatchTypeId
    /**
     * A patch which describes updates to a map of keys and values.
     *
     * @since 2.0.0
     * @category models
     */
    export interface Patch<Key, Value, Patch> extends Equal {
      readonly [HashMapPatchTypeId]: {
        readonly _Key: (_: Key) => Key
        readonly _Value: (_: Value) => Value
        readonly _Patch: (_: Patch) => Patch
      }
    }
  }

  /**
   * @since 2.0.0
   */
  export namespace HashSet {
    /**
     * @since 2.0.0
     * @category symbol
     */
    export type TypeId = typeof HashSetPatchTypeId
    /**
     * A patch which describes updates to a set of values.
     *
     * @since 2.0.0
     * @category models
     */
    export interface Patch<Value> extends Equal {
      readonly [HashSetPatchTypeId]: {
        readonly _Value: (_: Value) => Value
      }
    }
  }

  /**
   * @since 2.0.0
   */
  export namespace Or {
    /**
     * @since 2.0.0
     * @category symbol
     */
    export type TypeId = typeof OrPatchTypeId
    /**
     * A patch which describes updates to either one value or another.
     *
     * @since 2.0.0
     * @category models
     */
    export interface Patch<Value, Value2, Patch, Patch2> extends Equal {
      readonly [OrPatchTypeId]: {
        readonly _Value: (_: Value) => Value
        readonly _Value2: (_: Value2) => Value2
        readonly _Patch: (_: Patch) => Patch
        readonly _Patch2: (_: Patch2) => Patch2
      }
    }
  }
}
