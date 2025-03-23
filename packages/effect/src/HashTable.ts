/**
 * @since 3.15.0
 */

import type { Equal } from "./Equal.js"
import type { Inspectable } from "./Inspectable.js"
import * as HT from "./internal/hashTable.js"
import type { Option } from "./Option.js"
import type { Pipeable } from "./Pipeable.js"

const TypeId: unique symbol = HT.HashTableTypeId as TypeId

/**
 * @since 3.15.0
 * @category symbol
 */
export type TypeId = typeof TypeId

/**
 * @since 3.15.0
 * @category models
 */
export interface HashTable<out Key, out Value> extends Iterable<[Key, Value, number]>, Equal, Pipeable, Inspectable {
  readonly [TypeId]: TypeId
}

/**
 * @since 3.15.0
 * @category models
 */
export interface HashTableRow<out Key, out Value> {
  readonly keys: ReadonlyArray<Key>
  readonly values: ReadonlyArray<Value>
  readonly index: number
}

/**
 * @since 3.15.0
 * @category models
 */
export interface HashTableColumn<out Key, out Value> {
  readonly key: Key
  readonly values: ReadonlyArray<Value>
  readonly index: number
}

/**
 * @since 3.15.0
 */
export declare namespace HashTable {
  /**
   * This type-level utility extracts the key type `K` from a `HashTable<K, V>` type.
   *
   * @since 3.15.0
   * @category type-level
   */
  export type Key<T extends HashTable<any, any>> = [T] extends [HashTable<infer _K, infer _V>] ? _K : never

  /**
   * This type-level utility extracts the value type `V` from a `HashTable<K, V>` type.
   *
   * @since 3.15.0
   * @category type-level
   */
  export type Value<T extends HashTable<any, any>> = [T] extends [HashTable<infer _K, infer _V>] ? _V : never
}

/**
 * @since 3.15.0
 * @category refinements
 */
export const isHashTable: {
  <K, V>(u: unknown): u is HashTable<K, V>
  (u: unknown): u is HashTable<unknown, unknown>
} = HT.isHashTable

/**
 * Creates a new empty `HashTable`.
 *
 * @since 3.15.0
 * @category constructors
 */
export const empty: <K = never, V = never>() => HashTable<K, V> = HT.empty

/**
 * Constructs a new `HashTable` from an array of key/values pairs, where values are arrays.
 * Each key represents a column, and the arrays of values represent the values in each row for that column.
 *
 * @since 3.15.0
 * @category constructors
 */
export const make: <K, V>(...entries: ReadonlyArray<[K, ReadonlyArray<V>]>) => HashTable<K, V> = HT.make

/**
 * Checks if the `HashTable` contains any entries.
 *
 * @since 3.15.0
 * @category elements
 */
export const isEmpty: <K, V>(self: HashTable<K, V>) => boolean = HT.isEmpty

/**
 * Gets the total number of rows in the `HashTable`.
 *
 * @since 3.15.0
 * @category elements
 */
export const size: <K, V>(self: HashTable<K, V>) => number = HT.size

/**
 * Gets the number of columns in the `HashTable`.
 *
 * @since 3.15.0
 * @category elements
 */
export const columnsLength: <K, V>(self: HashTable<K, V>) => number = HT.columnsLength

/**
 * Gets the number of rows in the `HashTable`.
 *
 * @since 3.15.0
 * @category elements
 */
export const rowsLength: <K, V>(self: HashTable<K, V>) => number = HT.rowsLength

/**
 * Safely lookup the value at the specified column key and row index in the `HashTable`.
 *
 * @since 3.15.0
 * @category elements
 */
export const get: {
  <K1, V>(key: K1, rowIndex: number): <K extends K1, V1 extends V>(self: HashTable<K, V1>) => Option<V1>
  <K, V, K1 extends K>(self: HashTable<K, V>, key: K1, rowIndex: number): Option<V>
} = HT.get

/**
 * Sets the value at the specified column key and row index in the `HashTable`.
 *
 * @since 3.15.0
 * @category elements
 */
export const set: {
  <K, V>(key: K, rowIndex: number, value: V): (self: HashTable<K, V>) => HashTable<K, V>
  <K, V>(self: HashTable<K, V>, key: K, rowIndex: number, value: V): HashTable<K, V>
} = HT.set

/**
 * Gets a specific row from the `HashTable` by index.
 *
 * @since 3.15.0
 * @category elements
 */
export const getRow: {
  <K, V>(rowIndex: number): (self: HashTable<K, V>) => Option<HashTableRow<K, V>>
  <K, V>(self: HashTable<K, V>, rowIndex: number): Option<HashTableRow<K, V>>
} = HT.getRow

/**
 * Gets a specific column from the `HashTable` by key.
 *
 * @since 3.15.0
 * @category elements
 */
export const getColumn: {
  <K1, V>(key: K1): <K extends K1, V1 extends V>(self: HashTable<K, V1>) => Option<HashTableColumn<K, V1>>
  <K, V, K1 extends K>(self: HashTable<K, V>, key: K1): Option<HashTableColumn<K, V>>
} = HT.getColumn

/**
 * Prepares the `HashTable` to be modified.
 *
 * @since 3.15.0
 * @category mutations
 */
export const beginMutation: <K, V>(self: HashTable<K, V>) => HashTable<K, V> = HT.beginMutation

/**
 * Finalizes mutations to the `HashTable`.
 *
 * @since 3.15.0
 * @category mutations
 */
export const endMutation: <K, V>(self: HashTable<K, V>) => HashTable<K, V> = HT.endMutation

/**
 * Applies a function to a mutable copy of the `HashTable` and returns a new immutable version.
 *
 * @since 3.15.0
 * @category mutations
 */
export const mutate: {
  <K, V>(f: (self: HashTable<K, V>) => void): (self: HashTable<K, V>) => HashTable<K, V>
  <K, V>(self: HashTable<K, V>, f: (self: HashTable<K, V>) => void): HashTable<K, V>
} = HT.mutate

/**
 * Inserts a new row with the provided values into the `HashTable`.
 *
 * @since 3.15.0
 * @category elements
 */
export const insertRow: {
  <K, V>(values: ReadonlyArray<V>): (self: HashTable<K, V>) => HashTable<K, V>
  <K, V>(self: HashTable<K, V>, values: ReadonlyArray<V>): HashTable<K, V>
} = HT.insertRow

/**
 * Inserts a new column with the provided key and values into the `HashTable`.
 *
 * @since 3.15.0
 * @category elements
 */
export const insertColumn: {
  <K, V>(key: K, values: ReadonlyArray<V>): (self: HashTable<K, V>) => HashTable<K, V>
  <K, V>(self: HashTable<K, V>, key: K, values: ReadonlyArray<V>): HashTable<K, V>
} = HT.insertColumn

/**
 * Removes a column with the specified key from the `HashTable`.
 *
 * @since 3.15.0
 * @category elements
 */
export const removeColumn: {
  <K1, V>(key: K1): <K extends K1, V1 extends V>(self: HashTable<K, V1>) => HashTable<K, V1>
  <K, V, K1 extends K>(self: HashTable<K, V>, key: K1): HashTable<K, V>
} = HT.removeColumn

/**
 * Removes a row at the specified index from the `HashTable`.
 *
 * @since 3.15.0
 * @category elements
 */
export const removeRow: {
  (rowIndex: number): <K, V>(self: HashTable<K, V>) => HashTable<K, V>
  <K, V>(self: HashTable<K, V>, rowIndex: number): HashTable<K, V>
} = HT.removeRow

/**
 * Creates a new `HashTable` from an array of column key/values pairs.
 *
 * @since 3.15.0
 * @category constructors
 */
export const fromColumns: <K, V>(columns: ReadonlyArray<[K, ReadonlyArray<V>]>) => HashTable<K, V> = HT.fromColumns

/**
 * Creates a new `HashTable` from column keys and an array of rows.
 *
 * @since 3.15.0
 * @category constructors
 */
export const fromRows: <K, V>(
  columnKeys: ReadonlyArray<K>,
  rows: ReadonlyArray<ReadonlyArray<V>>
) => HashTable<K, V> = HT.fromRows
