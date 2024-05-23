/**
 * A collection of types that are commonly used types.
 *
 * @since 2.0.0
 */

/**
 * Returns the tags in a type.
 * @example
 * import type { Types } from "effect"
 *
 * type Res = Types.Tags<string | { _tag: "a" } | { _tag: "b" } > // "a" | "b"
 *
 * @category types
 * @since 2.0.0
 */
export type Tags<E> = E extends { _tag: string } ? E["_tag"] : never

/**
 * Excludes the tagged object from the type.
 * @example
 * import type { Types } from "effect"
 *
 * type Res = Types.ExcludeTag<string | { _tag: "a" } | { _tag: "b" }, "a"> // string | { _tag: "b" }
 *
 * @category types
 * @since 2.0.0
 */
export type ExcludeTag<E, K extends Tags<E>> = Exclude<E, { _tag: K }>

/**
 * Extracts the type of the given tag.
 *
 * @example
 * import type { Types } from "effect"
 *
 * type Res = Types.ExtractTag<{ _tag: "a", a: number } | { _tag: "b", b: number }, "b"> // { _tag: "b", b: number }
 *
 * @category types
 * @since 2.0.0
 */
export type ExtractTag<E, K extends Tags<E>> = Extract<E, { _tag: K }>

/**
 * A utility type that transforms a union type `T` into an intersection type.
 *
 * @since 2.0.0
 * @category types
 */
export type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (x: infer R) => any ? R
  : never

/**
 * Simplifies the type signature of a type.
 *
 * @example
 * import type { Types } from "effect"
 *
 * type Res = Types.Simplify<{ a: number } & { b: number }> // { a: number; b: number; }
 *
 * @since 2.0.0
 * @category types
 */
export type Simplify<A> = {
  [K in keyof A]: A[K]
} extends infer B ? B : never

/**
 * Determines if two types are equal.
 *
 * @example
 * import type { Types } from "effect"
 *
 * type Res1 = Types.Equals<{ a: number }, { a: number }> // true
 * type Res2 = Types.Equals<{ a: number }, { b: number }> // false
 *
 * @since 2.0.0
 * @category models
 */
export type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <
  T
>() => T extends Y ? 1 : 2 ? true
  : false

/**
 * Determines if a record contains any of the given keys.
 *
 * @example
 * import type { Types } from "effect"
 *
 * type Res1 = Types.Has<{ a: number }, "a" | "b"> // true
 * type Res2 = Types.Has<{ c: number }, "a" | "b"> // false
 *
 * @since 2.0.0
 * @category models
 */
export type Has<A, Key extends string> = (Key extends infer K ? K extends keyof A ? true : never : never) extends never
  ? false
  : true

/**
 * Merges two object where the keys of the left object take precedence in the case of a conflict.
 *
 * @example
 * import type { Types } from "effect"
 * type MergeLeft = Types.MergeLeft<{ a: number, b: number; }, { a: string }> // { a: number; b: number; }
 *
 * @since 2.0.0
 * @category models
 */
export type MergeLeft<K, H> = Simplify<
  {
    [k in keyof K | keyof H]: k extends keyof K ? K[k] : k extends keyof H ? H[k] : never
  }
>

/**
 * Merges two object where the keys of the right object take precedence in the case of a conflict.
 *
 * @example
 * import type { Types } from "effect"
 * type MergeRight = Types.MergeRight<{ a: number, b: number; }, { a: string }> // { a: string; b: number; }
 *
 * @since 2.0.0
 * @category models
 */
export type MergeRight<K, H> = Simplify<
  {
    [k in keyof K | keyof H]: k extends keyof H ? H[k] : k extends keyof K ? K[k] : never
  }
>

/**
 * @since 2.0.0
 * @category models
 */
export type MergeRecord<K, H> = {
  [k in keyof K | keyof H]: k extends keyof K ? K[k]
    : k extends keyof H ? H[k]
    : never
} extends infer X ? X
  : never

/**
 * Describes the concurrency to use when executing multiple Effect's.
 *
 * @since 2.0.0
 * @category models
 */
export type Concurrency = number | "unbounded" | "inherit"

/**
 * Make all properties in `T` mutable. Supports arrays, tuples, and records as well.
 *
 * @example
 * import type { Types } from "effect"
 *
 * type MutableStruct = Types.Mutable<{ readonly a: string; readonly b: number }> // { a: string; b: number; }
 *
 * type MutableArray = Types.Mutable<ReadonlyArray<string>> // string[]
 *
 * type MutableTuple = Types.Mutable<readonly [string, number]> // [string, number]
 *
 * type MutableRecord = Types.Mutable<{ readonly [_: string]: number }> // { [x: string]: number; }
 *
 * @since 2.0.0
 * @category types
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}

/**
 * Like `Types.Mutable`, but works recursively.
 *
 * @example
 * import type { Types } from "effect"
 *
 * type DeepMutableStruct = Types.DeepMutable<{
 *   readonly a: string;
 *   readonly b: readonly string[]
 * }>
 * // { a: string; b: string[] }
 *
 * @since 3.1.0
 * @category types
 */
export type DeepMutable<T> = T extends ReadonlyMap<infer K, infer V> ? Map<DeepMutable<K>, DeepMutable<V>>
  : T extends ReadonlySet<infer V> ? Set<DeepMutable<V>>
  : T extends ReadonlyArray<infer V> ? Array<DeepMutable<V>>
  : [keyof T] extends [never] ? T
  : { -readonly [K in keyof T]: DeepMutable<T[K]> }

/**
 * Avoid inference on a specific parameter
 *
 * @since 2.0.0
 * @category models
 */
export type NoInfer<A> = [A][A extends any ? 0 : never]

/**
 * Invariant helper.
 *
 * @since 2.0.0
 * @category models
 */
export type Invariant<A> = (_: A) => A

/**
 * Covariant helper.
 *
 * @since 2.0.0
 * @category models
 */
export type Covariant<A> = (_: never) => A

/**
 * Contravariant helper.
 *
 * @since 2.0.0
 * @category models
 */
export type Contravariant<A> = (_: A) => void

/**
 * @since 2.0.0
 */
export type MatchRecord<S, onTrue, onFalse> = {} extends S ? onTrue : onFalse

/**
 * @since 2.0.0
 */
export type NotFunction<T> = T extends Function ? never : T
