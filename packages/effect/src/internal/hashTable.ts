import * as Equal from "../Equal.js"
import * as Dual from "../Function.js"
import { pipe } from "../Function.js"
import * as Hash from "../Hash.js"
import * as HashMap from "../HashMap.js"
import type * as HT from "../HashTable.js"
import { format, NodeInspectSymbol, toJSON } from "../Inspectable.js"
import * as Option from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import { hasProperty } from "../Predicate.js"

const HashTableSymbolKey = "effect/HashTable"

/** @internal */
export const HashTableTypeId: HT.TypeId = Symbol.for(HashTableSymbolKey) as HT.TypeId

/** @internal */
export interface HashTableImpl<out K, out V> extends HT.HashTable<K, V> {
  _editable: boolean // mutable by design
  _indices: HashMap.HashMap<K, number>
  _values: Array<V>
}

/** @internal */
export interface HashTableRow<out K, out V> extends HT.HashTableRow<K, V> {
  readonly keys: ReadonlyArray<K>
  readonly values: ReadonlyArray<V>
  readonly index: number
}

/** @internal */
export interface HashTableColumn<out K, out V> extends HT.HashTableColumn<K, V> {
  readonly key: K
  readonly values: ReadonlyArray<V>
  readonly index: number
}

const HashTableProto: HT.HashTable<unknown, unknown> = {
  [HashTableTypeId]: HashTableTypeId,
  [Symbol.iterator]<K, V>(this: HashTableImpl<K, V>): Iterator<[K, V, number]> {
    return new HashTableIterator(this, (k, v, r) => [k, v, r])
  },
  [Hash.symbol](this: HT.HashTable<unknown, unknown>): number {
    let hash = Hash.hash(HashTableSymbolKey)
    for (const item of this) {
      hash ^= pipe(Hash.hash(item[0]), Hash.combine(Hash.hash(item[1])), Hash.combine(Hash.hash(item[2])))
    }
    return Hash.cached(this, hash)
  },
  [Equal.symbol]<K, V>(this: HashTableImpl<K, V>, that: unknown): boolean {
    if (isHashTable(that)) {
      const thatImpl = that as HashTableImpl<K, V>

      // Quick checks for size
      if (thatImpl._values.length !== this._values.length) {
        return false
      }
      if (HashMap.size(thatImpl._indices) !== HashMap.size(this._indices)) {
        return false
      }

      // First ensure that both tables have the same keys with the same indices
      const thisKeys = new Map<K, number>()
      HashMap.forEach(this._indices, (idx, k) => {
        thisKeys.set(k, idx)
      })

      // Check if every key in that table exists in this table with the same index
      let keysMatch = true
      HashMap.forEach(thatImpl._indices, (thatIdx, thatKey) => {
        if (!thisKeys.has(thatKey) || thisKeys.get(thatKey) !== thatIdx) {
          keysMatch = false
        }
      })

      if (!keysMatch) {
        return false
      }

      // Check values vector
      return Equal.equals(this._values, thatImpl._values)
    }
    return false
  },
  toString<K, V>(this: HashTableImpl<K, V>) {
    return format(this.toJSON())
  },
  toJSON() {
    return {
      _id: "HashTable",
      values: Array.from(this).map(toJSON)
    }
  },
  [NodeInspectSymbol]() {
    return this.toJSON()
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

class HashTableIterator<in out K, in out V, out T> implements IterableIterator<T> {
  private rowIndex = 0
  private colIndex = 0
  private readonly sortedEntries: Array<[K, number]>
  private readonly columnsLength: number
  private readonly rowsLength: number

  constructor(readonly table: HashTableImpl<K, V>, readonly f: (k: K, v: V, r: number) => T) {
    // Get the columns length for calculations
    this.columnsLength = HashMap.size(table._indices)
    this.rowsLength = this.columnsLength > 0 ? table._values.length / this.columnsLength : 0

    // Get the keys sorted by their column index
    // We need to sort once since accessing values requires knowing proper column indices
    this.sortedEntries = Array.from(table._indices)
    this.sortedEntries.sort((a, b) => a[1] - b[1])
  }

  next(): IteratorResult<T> {
    if (this.rowIndex >= this.rowsLength) {
      return { done: true, value: undefined }
    }

    const [key, columnIndex] = this.sortedEntries[this.colIndex]
    const valueIndex = this.rowIndex * this.columnsLength + columnIndex
    const value = this.table._values[valueIndex]

    this.colIndex++
    if (this.colIndex >= this.columnsLength) {
      this.colIndex = 0
      this.rowIndex++
    }

    return { done: false, value: this.f(key, value, this.rowIndex - (this.colIndex > 0 ? 0 : 1)) }
  }

  [Symbol.iterator](): IterableIterator<T> {
    return new HashTableIterator(this.table, this.f)
  }
}

const makeImpl = <K, V>(
  editable: boolean,
  indices_table: HashMap.HashMap<K, number>,
  values_vector: Array<V>
): HashTableImpl<K, V> => {
  const table = Object.create(HashTableProto)
  table._editable = editable
  table._indices = indices_table
  table._values = values_vector
  return table
}

const _empty = makeImpl<never, never>(false, HashMap.empty(), [])

/** @internal */
export const empty = <K = never, V = never>(): HT.HashTable<K, V> => _empty

/** @internal */
export const make = <K, V>(...entries: ReadonlyArray<[K, ReadonlyArray<V>]>): HT.HashTable<K, V> => {
  return fromColumns(entries)
}

/** @internal */
export const isHashTable: {
  <K, V>(u: unknown): u is HT.HashTable<K, V>
  (u: unknown): u is HT.HashTable<unknown, unknown>
} = (u: unknown): u is HT.HashTable<unknown, unknown> => hasProperty(u, HashTableTypeId)

/** @internal */
export const isEmpty = <K, V>(self: HT.HashTable<K, V>): boolean => (self as HashTableImpl<K, V>)._values.length === 0

/** @internal */
export const size = <K, V>(self: HT.HashTable<K, V>): number => {
  const columnsLen = HashMap.size((self as HashTableImpl<K, V>)._indices)
  if (columnsLen === 0) return 0
  return (self as HashTableImpl<K, V>)._values.length / columnsLen
}

/** @internal */
export const columnsLength = <K, V>(self: HT.HashTable<K, V>): number =>
  HashMap.size((self as HashTableImpl<K, V>)._indices)

/** @internal */
export const rowsLength = <K, V>(self: HT.HashTable<K, V>): number => {
  const columns = columnsLength(self)
  if (columns === 0) return 0
  return (self as HashTableImpl<K, V>)._values.length / columns
}

/** @internal */
export const get = Dual.dual<
  <K1, V>(key: K1, rowIndex: number) => <K extends K1, V1 extends V>(self: HT.HashTable<K, V1>) => Option.Option<V1>,
  <K, V, K1 extends K>(self: HT.HashTable<K, V>, key: K1, rowIndex: number) => Option.Option<V>
>(3, <K, V, K1 extends K>(self: HT.HashTable<K, V>, key: K1, rowIndex: number): Option.Option<V> => {
  const columnIndexOption = HashMap.get((self as HashTableImpl<K, V>)._indices, key)
  if (Option.isNone(columnIndexOption)) {
    return Option.none()
  }

  const columns = columnsLength(self)
  if (rowIndex < 0 || rowIndex >= rowsLength(self)) {
    return Option.none()
  }

  // Use match to safely handle the Option
  return Option.match(columnIndexOption, {
    onNone: () => Option.none<V>(),
    onSome: (columnIndex) => {
      const valueIndex = rowIndex * columns + columnIndex
      return Option.some((self as HashTableImpl<K, V>)._values[valueIndex])
    }
  })
})

/** @internal */
export const set = Dual.dual<
  <K, V>(key: K, rowIndex: number, value: V) => (self: HT.HashTable<K, V>) => HT.HashTable<K, V>,
  <K, V>(self: HT.HashTable<K, V>, key: K, rowIndex: number, value: V) => HT.HashTable<K, V>
>(4, <K, V>(self: HT.HashTable<K, V>, key: K, rowIndex: number, value: V): HT.HashTable<K, V> => {
  const columnIndex = HashMap.get((self as HashTableImpl<K, V>)._indices, key)
  if (Option.isNone(columnIndex)) {
    return self
  }

  const columns = columnsLength(self)
  if (rowIndex < 0 || rowIndex >= rowsLength(self)) {
    return self
  }

  const valueIndex = rowIndex * columns + columnIndex.value

  if ((self as HashTableImpl<K, V>)._editable) {
    // Directly mutate the values vector for mutable tables
    ;(self as HashTableImpl<K, V>)._values[valueIndex] = value
    return self
  } else {
    // For immutable operations, use the mutate pattern
    return mutate(self, (mutable) => {
      ;(mutable as HashTableImpl<K, V>)._values[valueIndex] = value
    })
  }
})

/** @internal */
export const getRow = Dual.dual<
  <K, V>(rowIndex: number) => (self: HT.HashTable<K, V>) => Option.Option<HT.HashTableRow<K, V>>,
  <K, V>(self: HT.HashTable<K, V>, rowIndex: number) => Option.Option<HT.HashTableRow<K, V>>
>(2, <K, V>(self: HT.HashTable<K, V>, rowIndex: number): Option.Option<HT.HashTableRow<K, V>> => {
  if (rowIndex < 0 || rowIndex >= rowsLength(self)) {
    return Option.none()
  }

  const columns = columnsLength(self)
  const keys: Array<K> = []
  const values: Array<V> = []
  const impl = self as HashTableImpl<K, V>

  // Get all keys and indices, then sort by column index
  // Create an array of [key, index] pairs to sort them by index
  const keyIndexPairs: Array<[K, number]> = []

  // Use HashMap.forEach for a more direct approach without creating intermediate arrays
  HashMap.forEach(impl._indices, (idx, k) => {
    keyIndexPairs.push([k, idx])
  })

  // Sort by column index
  keyIndexPairs.sort((a, b) => a[1] - b[1])

  // Collect keys and values in column order
  for (const [key, columnIndex] of keyIndexPairs) {
    keys.push(key)
    const valueIndex = rowIndex * columns + columnIndex
    values.push(impl._values[valueIndex])
  }

  return Option.some({
    keys,
    values,
    index: rowIndex
  })
})

/** @internal */
export const getColumn = Dual.dual<
  <K1, V>(
    key: K1
  ) => <K extends K1, V1 extends V>(self: HT.HashTable<K, V1>) => Option.Option<HT.HashTableColumn<K, V1>>,
  <K, V, K1 extends K>(self: HT.HashTable<K, V>, key: K1) => Option.Option<HT.HashTableColumn<K, V>>
>(2, <K, V, K1 extends K>(self: HT.HashTable<K, V>, key: K1): Option.Option<HT.HashTableColumn<K, V>> => {
  const columnIndex = HashMap.get((self as HashTableImpl<K, V>)._indices, key)
  if (Option.isNone(columnIndex)) {
    return Option.none()
  }

  const columns = columnsLength(self)
  const rows = rowsLength(self)
  const values: Array<V> = []

  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    const valueIndex = rowIndex * columns + columnIndex.value
    values.push((self as HashTableImpl<K, V>)._values[valueIndex])
  }

  return Option.some({
    key,
    values,
    index: columnIndex.value
  })
})

/** @internal */
export const beginMutation = <K, V>(self: HT.HashTable<K, V>): HT.HashTable<K, V> => {
  const impl = self as HashTableImpl<K, V>
  // Create a fresh copy of the indices table and mark it as editable
  return makeImpl(
    true,
    HashMap.beginMutation(impl._indices),
    [...impl._values]
  )
}

/** @internal */
export const endMutation = <K, V>(self: HT.HashTable<K, V>): HT.HashTable<K, V> => {
  const impl = self as HashTableImpl<K, V>
  impl._editable = false
  impl._indices = HashMap.endMutation(impl._indices)
  return self
}

/** @internal */
export const mutate = Dual.dual<
  <K, V>(f: (self: HT.HashTable<K, V>) => void) => (self: HT.HashTable<K, V>) => HT.HashTable<K, V>,
  <K, V>(self: HT.HashTable<K, V>, f: (self: HT.HashTable<K, V>) => void) => HT.HashTable<K, V>
>(2, <K, V>(self: HT.HashTable<K, V>, f: (self: HT.HashTable<K, V>) => void): HT.HashTable<K, V> => {
  const transient = beginMutation(self)
  f(transient)
  return endMutation(transient)
})

/** @internal */
export const insertRow = Dual.dual<
  <K, V>(values: ReadonlyArray<V>) => (self: HT.HashTable<K, V>) => HT.HashTable<K, V>,
  <K, V>(self: HT.HashTable<K, V>, values: ReadonlyArray<V>) => HT.HashTable<K, V>
>(2, <K, V>(self: HT.HashTable<K, V>, values: ReadonlyArray<V>): HT.HashTable<K, V> => {
  const columns = columnsLength(self)
  if (columns === 0) {
    return self
  }

  if (values.length !== columns) {
    throw new Error(`Row length ${values.length} doesn't match columns count ${columns}`)
  }

  // Sort values according to column indices
  const impl = self as HashTableImpl<K, V>

  // Create an array of [key, index] pairs to sort them by index
  const keyIndexPairs: Array<[K, number]> = []

  // Use HashMap.forEach for a more direct approach
  HashMap.forEach(impl._indices, (idx, k) => {
    keyIndexPairs.push([k, idx])
  })

  // Sort by column index
  keyIndexPairs.sort((a, b) => a[1] - b[1])

  // Map input values to their correct positions
  const orderedValues = keyIndexPairs.map(([_, index]) => values[index])

  if (impl._editable) {
    // For mutable tables, directly modify the values array
    for (const val of orderedValues) {
      impl._values.push(val)
    }
    return self
  } else {
    // For immutable operations, use the mutate pattern
    return mutate(self, (mutable) => {
      for (const val of orderedValues) {
        ;(mutable as HashTableImpl<K, V>)._values.push(val)
      }
    })
  }
})

/** @internal */
export const insertColumn = Dual.dual<
  <K, V>(key: K, values: ReadonlyArray<V>) => (self: HT.HashTable<K, V>) => HT.HashTable<K, V>,
  <K, V>(self: HT.HashTable<K, V>, key: K, values: ReadonlyArray<V>) => HT.HashTable<K, V>
>(3, <K, V>(self: HT.HashTable<K, V>, key: K, values: ReadonlyArray<V>): HT.HashTable<K, V> => {
  const rows = rowsLength(self)
  const columns = columnsLength(self)
  const impl = self as HashTableImpl<K, V>

  if (rows !== values.length) {
    throw new Error(`Values length ${values.length} doesn't match rows count ${rows}`)
  }

  // Check if the key already exists
  if (HashMap.has(impl._indices, key)) {
    throw new Error(`Column with key "${String(key)}" already exists`)
  }

  if (impl._editable) {
    // For mutable tables, update in place
    // Add the new column using set
    impl._indices = HashMap.set(impl._indices, key, columns)

    // Create new values array with the new column values
    const oldValues = impl._values
    const newValues: Array<V> = []
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      // Copy existing values for this row
      for (let colIndex = 0; colIndex < columns; colIndex++) {
        const valueIndex = rowIndex * columns + colIndex
        newValues.push(oldValues[valueIndex])
      }
      // Add the new column value for this row
      newValues.push(values[rowIndex])
    }
    impl._values = newValues
    return self
  } else {
    // For immutable operations, use the mutate pattern
    return mutate(self, (mutable) => {
      const mutableImpl = mutable as HashTableImpl<K, V>
      // Add the new column
      mutableImpl._indices = HashMap.set(mutableImpl._indices, key, columns)

      // Create new values array
      const oldValues = mutableImpl._values
      const newValues: Array<V> = []
      for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
        // Copy existing values for this row
        for (let colIndex = 0; colIndex < columns; colIndex++) {
          const valueIndex = rowIndex * columns + colIndex
          newValues.push(oldValues[valueIndex])
        }
        // Add the new column value for this row
        newValues.push(values[rowIndex])
      }
      mutableImpl._values = newValues
    })
  }
})

/** @internal */
export const removeColumn = Dual.dual<
  <K1, V>(key: K1) => <K extends K1, V1 extends V>(self: HT.HashTable<K, V1>) => HT.HashTable<K, V1>,
  <K, V, K1 extends K>(self: HT.HashTable<K, V>, key: K1) => HT.HashTable<K, V>
>(2, <K, V, K1 extends K>(self: HT.HashTable<K, V>, key: K1): HT.HashTable<K, V> => {
  const impl = self as HashTableImpl<K, V>
  const columnIndexOption = HashMap.get(impl._indices, key)
  if (Option.isNone(columnIndexOption)) {
    return self
  }

  const removedIndex = columnIndexOption.value
  const columns = columnsLength(self)
  const rows = rowsLength(self)

  if (impl._editable) {
    // For mutable table, modify in place
    // Remove column and update indices in one operation
    impl._indices = HashMap.mutate(impl._indices, (mutableTable) => {
      // Remove the column
      HashMap.remove(mutableTable, key)

      // Update column indices after removal
      HashMap.forEach(mutableTable, (idx, k) => {
        if (idx > removedIndex) {
          HashMap.set(mutableTable, k, idx - 1)
        }
      })
    })

    // Create new values vector without the removed column
    const oldValues = impl._values
    const newValues: Array<V> = []
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      for (let colIndex = 0; colIndex < columns; colIndex++) {
        if (colIndex !== removedIndex) {
          const valueIndex = rowIndex * columns + colIndex
          newValues.push(oldValues[valueIndex])
        }
      }
    }
    impl._values = newValues
    return self
  } else {
    // For immutable operations, use the mutate pattern
    return mutate(self, (mutable) => {
      const mutableImpl = mutable as HashTableImpl<K, V>

      // Remove column and update indices in one operation
      mutableImpl._indices = HashMap.mutate(mutableImpl._indices, (mutableTable) => {
        // Remove the column
        HashMap.remove(mutableTable, key)

        // Update column indices after removal
        HashMap.forEach(mutableTable, (idx, k) => {
          if (idx > removedIndex) {
            HashMap.set(mutableTable, k, idx - 1)
          }
        })
      })

      // Create new values array without the removed column
      const oldValues = mutableImpl._values
      const newValues: Array<V> = []
      for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
        for (let colIndex = 0; colIndex < columns; colIndex++) {
          if (colIndex !== removedIndex) {
            const valueIndex = rowIndex * columns + colIndex
            newValues.push(oldValues[valueIndex])
          }
        }
      }
      mutableImpl._values = newValues
    })
  }
})

/** @internal */
export const removeRow = Dual.dual<
  (rowIndex: number) => <K, V>(self: HT.HashTable<K, V>) => HT.HashTable<K, V>,
  <K, V>(self: HT.HashTable<K, V>, rowIndex: number) => HT.HashTable<K, V>
>(2, <K, V>(self: HT.HashTable<K, V>, rowIndex: number): HT.HashTable<K, V> => {
  const rows = rowsLength(self)
  const columns = columnsLength(self)
  const impl = self as HashTableImpl<K, V>

  if (rowIndex < 0 || rowIndex >= rows) {
    return self
  }

  if (impl._editable) {
    // For mutable tables, build a new array and replace the existing one
    const oldValues = impl._values
    const newValues: Array<V> = []
    for (let i = 0; i < rows; i++) {
      if (i !== rowIndex) {
        for (let colIndex = 0; colIndex < columns; colIndex++) {
          const valueIndex = i * columns + colIndex
          newValues.push(oldValues[valueIndex])
        }
      }
    }
    impl._values = newValues
    return self
  } else {
    // For immutable operations, use the mutate pattern
    return mutate(self, (mutable) => {
      const mutableImpl = mutable as HashTableImpl<K, V>
      const oldValues = mutableImpl._values
      const newValues: Array<V> = []
      for (let i = 0; i < rows; i++) {
        if (i !== rowIndex) {
          for (let colIndex = 0; colIndex < columns; colIndex++) {
            const valueIndex = i * columns + colIndex
            newValues.push(oldValues[valueIndex])
          }
        }
      }
      mutableImpl._values = newValues
    })
  }
})

/** @internal */
export const fromColumns = <K, V>(
  columns: ReadonlyArray<[K, ReadonlyArray<V>]>
): HT.HashTable<K, V> => {
  if (columns.length === 0) {
    return empty()
  }

  const rowsCount = columns[0][1].length

  // Verify all columns have the same number of rows
  for (let i = 1; i < columns.length; i++) {
    if (columns[i][1].length !== rowsCount) {
      throw new Error(`Column ${i} has ${columns[i][1].length} rows, expected ${rowsCount}`)
    }
  }

  // Build indices table using mutate for efficiency
  const indicesTable = HashMap.mutate(HashMap.empty<K, number>(), (mutableTable) => {
    for (let i = 0; i < columns.length; i++) {
      const [key, _] = columns[i]
      HashMap.set(mutableTable, key, i)
    }
  })

  const valuesVector: Array<V> = []

  // Build values vector
  for (let rowIndex = 0; rowIndex < rowsCount; rowIndex++) {
    for (let colIndex = 0; colIndex < columns.length; colIndex++) {
      valuesVector.push(columns[colIndex][1][rowIndex])
    }
  }

  return makeImpl(false, indicesTable, valuesVector)
}

/** @internal */
export const fromRows = <K, V>(
  columnKeys: ReadonlyArray<K>,
  rows: ReadonlyArray<ReadonlyArray<V>>
): HT.HashTable<K, V> => {
  if (columnKeys.length === 0 || rows.length === 0) {
    return empty()
  }

  // Build indices table using mutate for efficiency
  const indicesTable = HashMap.mutate(HashMap.empty<K, number>(), (mutableTable) => {
    for (let i = 0; i < columnKeys.length; i++) {
      HashMap.set(mutableTable, columnKeys[i], i)
    }
  })

  const valuesVector: Array<V> = []

  // Verify all rows have correct number of columns
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].length !== columnKeys.length) {
      throw new Error(`Row ${i} has ${rows[i].length} columns, expected ${columnKeys.length}`)
    }
  }

  // Build values vector
  for (const row of rows) {
    for (const value of row) {
      valuesVector.push(value)
    }
  }

  return makeImpl(false, indicesTable, valuesVector)
}
