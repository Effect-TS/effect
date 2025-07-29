import { describe, it } from "@effect/vitest"
import { HashTable, Option } from "effect"
import {
  assertFalse,
  assertNone,
  assertSome,
  assertTrue,
  deepStrictEqual,
  notDeepStrictEqual,
  strictEqual,
  throws
} from "effect/test/util"

describe("HashTable", () => {
  it("should create an empty table", () => {
    const table = HashTable.empty<string, number>()
    assertTrue(HashTable.isEmpty(table))
    strictEqual(HashTable.size(table), 0)
    strictEqual(HashTable.columnsLength(table), 0)
    strictEqual(HashTable.rowsLength(table), 0)
  })

  it("should create a table from columns", () => {
    const table = HashTable.unsafeFromColumns([
      ["a", [1, 2, 3]],
      ["b", [4, 5, 6]],
      ["c", [7, 8, 9]]
    ])

    assertFalse(HashTable.isEmpty(table))
    strictEqual(HashTable.size(table), 3)
    strictEqual(HashTable.columnsLength(table), 3)
    strictEqual(HashTable.rowsLength(table), 3)

    // Check values
    const val1 = HashTable.get(table, "a", 0)
    assertSome(val1, 1)

    const val2 = HashTable.get(table, "b", 1)
    assertSome(val2, 5)

    const val3 = HashTable.get(table, "c", 2)
    assertSome(val3, 9)
  })

  it("should create a table from rows", () => {
    const table = HashTable.unsafeFromRows(
      ["a", "b", "c"],
      [
        [1, 4, 7],
        [2, 5, 8],
        [3, 6, 9]
      ]
    )

    assertFalse(HashTable.isEmpty(table))
    strictEqual(HashTable.size(table), 3)
    strictEqual(HashTable.columnsLength(table), 3)
    strictEqual(HashTable.rowsLength(table), 3)

    // Check values
    const val1 = HashTable.get(table, "a", 0)
    assertSome(val1, 1)

    const val2 = HashTable.get(table, "b", 1)
    assertSome(val2, 5)

    const val3 = HashTable.get(table, "c", 2)
    assertSome(val3, 9)
  })

  it("should get and set values", () => {
    const table = HashTable.unsafeFromColumns([
      ["a", [1, 2, 3]],
      ["b", [4, 5, 6]]
    ])

    const updatedTable = HashTable.set(table, "a", 1, 99)

    const val1 = HashTable.get(table, "a", 1)
    assertSome(val1, 2)

    const val2 = HashTable.get(updatedTable, "a", 1)
    assertSome(val2, 99)
  })

  it("should get rows and columns", () => {
    const table = HashTable.unsafeFromColumns([
      ["a", [1, 2, 3]],
      ["b", [4, 5, 6]]
    ])

    const row = HashTable.getRow(table, 1)
    assertTrue(Option.isSome(row))
    if (Option.isSome(row)) {
      assertTrue(row.value.keys.includes("a"))
      assertTrue(row.value.keys.includes("b"))
      assertTrue(row.value.values.includes(2))
      assertTrue(row.value.values.includes(5))
      strictEqual(row.value.index, 1)
    }

    const column = HashTable.getColumn(table, "b")
    assertTrue(Option.isSome(column))
    if (Option.isSome(column)) {
      strictEqual(column.value.key, "b")
      deepStrictEqual(column.value.values, [4, 5, 6])
      assertTrue(column.value.index >= 0)
    }
  })

  it("should insert and remove rows", () => {
    const table = HashTable.unsafeFromColumns([
      ["a", [1, 2]],
      ["b", [3, 4]]
    ])

    const withRow = HashTable.unsafeInsertRow(table, [5, 6])
    strictEqual(HashTable.rowsLength(withRow), 3)

    const val1 = HashTable.get(withRow, "a", 2)
    assertSome(val1, 5)

    const val2 = HashTable.get(withRow, "b", 2)
    assertSome(val2, 6)

    const afterRemove = HashTable.removeRow(withRow, 1)
    strictEqual(HashTable.rowsLength(afterRemove), 2)

    const val3 = HashTable.get(afterRemove, "a", 0)
    assertSome(val3, 1)

    const val4 = HashTable.get(afterRemove, "a", 1)
    assertSome(val4, 5)
  })

  it("should insert and remove columns", () => {
    const table = HashTable.unsafeFromColumns([
      ["a", [1, 2]],
      ["b", [3, 4]]
    ])

    const withColumn = HashTable.unsafeInsertColumn(table, "c", [5, 6])
    strictEqual(HashTable.columnsLength(withColumn), 3)

    const val1 = HashTable.get(withColumn, "c", 0)
    assertSome(val1, 5)

    const val2 = HashTable.get(withColumn, "c", 1)
    assertSome(val2, 6)

    const afterRemove = HashTable.removeColumn(withColumn, "b")
    strictEqual(HashTable.columnsLength(afterRemove), 2)

    const val3 = HashTable.get(afterRemove, "a", 0)
    assertSome(val3, 1)

    const val4 = HashTable.get(afterRemove, "c", 0)
    assertSome(val4, 5)
  })

  it("should iterate over entries", () => {
    const table = HashTable.unsafeFromColumns([
      ["a", [1, 2]],
      ["b", [3, 4]]
    ])

    const entries: Array<[string, number, number]> = []
    for (const [key, value, rowIndex] of table) {
      entries.push([key, value, rowIndex])
    }

    strictEqual(entries.length, 4)

    // Check that each expected entry exists in the array
    let found = entries.filter((entry) => entry[0] === "a" && entry[1] === 1 && entry[2] === 0)
    strictEqual(found.length, 1)

    found = entries.filter((entry) => entry[0] === "b" && entry[1] === 3 && entry[2] === 0)
    strictEqual(found.length, 1)

    found = entries.filter((entry) => entry[0] === "a" && entry[1] === 2 && entry[2] === 1)
    strictEqual(found.length, 1)

    found = entries.filter((entry) => entry[0] === "b" && entry[1] === 4 && entry[2] === 1)
    strictEqual(found.length, 1)
  })

  it("should handle mutations", () => {
    const table = HashTable.unsafeFromColumns([
      ["a", [1, 2]],
      ["b", [3, 4]]
    ])

    const result = HashTable.mutate(table, (mutable) => {
      HashTable.set(mutable, "a", 0, 99)
      HashTable.set(mutable, "b", 1, 88)
    })

    const val1 = HashTable.get(result, "a", 0)
    assertSome(val1, 99)

    const val2 = HashTable.get(result, "b", 1)
    assertSome(val2, 88)

    // Original should be unchanged
    const val3 = HashTable.get(table, "a", 0)
    assertSome(val3, 1)

    const val4 = HashTable.get(table, "b", 1)
    assertSome(val4, 4)
  })

  it("should properly compare HashTables for equality", () => {
    const table1 = HashTable.unsafeFromColumns([
      ["a", [1, 2]],
      ["b", [3, 4]]
    ])

    const table2 = HashTable.unsafeFromColumns([
      ["a", [1, 2]],
      ["b", [3, 4]]
    ])

    const table3 = HashTable.unsafeFromColumns([
      ["a", [1, 2]],
      ["b", [3, 5]] // Different value
    ])

    const table4 = HashTable.unsafeFromColumns([
      ["a", [1, 2]],
      ["c", [3, 4]] // Different key
    ])

    // Equal tables
    assertFalse(Object.is(table1, table2)) // Different references
    deepStrictEqual(table1, table2) // But equal contents

    // Different values
    notDeepStrictEqual(table1, table3)

    // Different keys
    notDeepStrictEqual(table1, table4)
  })

  it("should throw errors for inconsistent dimensions", () => {
    // Trying to create a table with inconsistent row lengths
    throws(() => {
      HashTable.unsafeFromColumns([
        ["a", [1, 2, 3]],
        ["b", [4, 5]] // Missing one value
      ])
    })

    // Trying to create a table with inconsistent column count
    throws(() => {
      HashTable.unsafeFromRows(
        ["a", "b", "c"],
        [
          [1, 4, 7],
          [2, 5] // Missing one value
        ]
      )
    })

    // Trying to insert a row with wrong length
    const table = HashTable.unsafeFromColumns([
      ["a", [1, 2]],
      ["b", [3, 4]]
    ])

    throws(() => {
      HashTable.unsafeInsertRow(table, [5]) // Too few values
    })

    throws(() => {
      HashTable.unsafeInsertRow(table, [5, 6, 7]) // Too many values
    })
  })

  it("should handle empty columns and rows correctly", () => {
    // Table with no rows
    const emptyRowsTable = HashTable.unsafeFromColumns([
      ["a", []],
      ["b", []]
    ])

    strictEqual(HashTable.columnsLength(emptyRowsTable), 2)
    strictEqual(HashTable.rowsLength(emptyRowsTable), 0)

    // Insert row into empty rows table
    const withRow = HashTable.unsafeInsertRow(emptyRowsTable, [1, 2])
    strictEqual(HashTable.rowsLength(withRow), 1)

    const val1 = HashTable.get(withRow, "a", 0)
    assertSome(val1, 1)

    const val2 = HashTable.get(withRow, "b", 0)
    assertSome(val2, 2)

    // Test getting nonexistent values
    const table = HashTable.unsafeFromColumns([
      ["a", [1, 2]],
      ["b", [3, 4]]
    ])

    assertNone(HashTable.get(table, "nonexistent", 0))
    assertNone(HashTable.get(table, "a", 99))
  })

  it("should handle large tables efficiently", () => {
    // Create a larger table to test performance
    const columns = 100
    const rows = 100

    // Create column definitions
    const columnEntries: Array<[string, Array<number>]> = []
    for (let c = 0; c < columns; c++) {
      const values = []
      for (let r = 0; r < rows; r++) {
        values.push(c * 1000 + r)
      }
      columnEntries.push([`col${c}`, values])
    }

    // Create the table
    const largeTable = HashTable.unsafeFromColumns(columnEntries)

    // Verify dimensions
    strictEqual(HashTable.columnsLength(largeTable), columns)
    strictEqual(HashTable.rowsLength(largeTable), rows)

    // Verify some random values
    const val1 = HashTable.get(largeTable, "col0", 0)
    assertSome(val1, 0)

    const val2 = HashTable.get(largeTable, "col50", 50)
    assertSome(val2, 50050)

    const val3 = HashTable.get(largeTable, "col99", 99)
    assertSome(val3, 99099)

    // Test performance of iteration
    let count = 0
    // Only iterate part of the table to keep test fast
    for (const [_key, _value, _rowIndex] of largeTable) {
      if (count++ > 1000) break
    }

    // If we got here without timing out, the iteration is efficient enough
    assertTrue(true)
  })

  it("should handle Option-returning functions", () => {
    // Test the safe fromColumns function
    const tableOption = HashTable.fromColumns([
      ["a", [1, 2, 3]],
      ["b", [4, 5, 6]]
    ])
    assertTrue(Option.isSome(tableOption))

    // Testing safe fromColumns with inconsistent row lengths
    const invalidTableOption = HashTable.fromColumns([
      ["a", [1, 2, 3]],
      ["b", [4, 5]] // Missing one value
    ])
    assertTrue(Option.isNone(invalidTableOption))

    // Testing safe fromRows function
    const rowsTableOption = HashTable.fromRows(
      ["a", "b"],
      [
        [1, 3],
        [2, 4]
      ]
    )
    assertTrue(Option.isSome(rowsTableOption))

    // Test insertRow with valid data
    if (Option.isSome(tableOption)) {
      const withRowOption = HashTable.insertRow(tableOption.value, [7, 8])
      assertTrue(Option.isSome(withRowOption))

      if (Option.isSome(withRowOption)) {
        const value = HashTable.get(withRowOption.value, "a", 3)
        assertSome(value, 7)
      }
    }

    // Test insertRow with invalid data
    if (Option.isSome(tableOption)) {
      const invalidRowOption = HashTable.insertRow(tableOption.value, [7]) // Too few values
      assertTrue(Option.isNone(invalidRowOption))
    }

    // Test insertColumn with valid data
    if (Option.isSome(tableOption)) {
      const withColOption = HashTable.insertColumn(tableOption.value, "c", [9, 10, 11])
      assertTrue(Option.isSome(withColOption))

      if (Option.isSome(withColOption)) {
        const value = HashTable.get(withColOption.value, "c", 0)
        assertSome(value, 9)
      }
    }

    // Test insertColumn with invalid data
    if (Option.isSome(tableOption)) {
      const invalidColOption = HashTable.insertColumn(tableOption.value, "a", [9, 10, 11]) // Key already exists
      assertTrue(Option.isNone(invalidColOption))
    }
  })
})
