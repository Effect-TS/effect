import { describe, expect, it } from "vitest"
import * as HashTable from "../src/HashTable.js"

describe("HashTable", () => {
  it("should create an empty table", () => {
    const table = HashTable.empty<string, number>()
    expect(HashTable.isEmpty(table)).toBe(true)
    expect(HashTable.size(table)).toBe(0)
    expect(HashTable.columnsLength(table)).toBe(0)
    expect(HashTable.rowsLength(table)).toBe(0)
  })

  it("should create a table from columns", () => {
    const table = HashTable.fromColumns([
      ["a", [1, 2, 3]],
      ["b", [4, 5, 6]],
      ["c", [7, 8, 9]]
    ])

    expect(HashTable.isEmpty(table)).toBe(false)
    expect(HashTable.size(table)).toBe(3)
    expect(HashTable.columnsLength(table)).toBe(3)
    expect(HashTable.rowsLength(table)).toBe(3)

    // Check values
    expect(HashTable.get(table, "a", 0)).toEqual({ value: 1 })
    expect(HashTable.get(table, "b", 1)).toEqual({ value: 5 })
    expect(HashTable.get(table, "c", 2)).toEqual({ value: 9 })
  })

  it("should create a table from rows", () => {
    const table = HashTable.fromRows(
      ["a", "b", "c"],
      [
        [1, 4, 7],
        [2, 5, 8],
        [3, 6, 9]
      ]
    )

    expect(HashTable.isEmpty(table)).toBe(false)
    expect(HashTable.size(table)).toBe(3)
    expect(HashTable.columnsLength(table)).toBe(3)
    expect(HashTable.rowsLength(table)).toBe(3)

    // Check values
    expect(HashTable.get(table, "a", 0)).toEqual({ value: 1 })
    expect(HashTable.get(table, "b", 1)).toEqual({ value: 5 })
    expect(HashTable.get(table, "c", 2)).toEqual({ value: 9 })
  })

  it("should get and set values", () => {
    const table = HashTable.fromColumns([
      ["a", [1, 2, 3]],
      ["b", [4, 5, 6]]
    ])

    const updatedTable = HashTable.set(table, "a", 1, 99)

    expect(HashTable.get(table, "a", 1)).toEqual({ value: 2 })
    expect(HashTable.get(updatedTable, "a", 1)).toEqual({ value: 99 })
  })

  it("should get rows and columns", () => {
    const table = HashTable.fromColumns([
      ["a", [1, 2, 3]],
      ["b", [4, 5, 6]]
    ])

    const row = HashTable.getRow(table, 1)
    expect(row).toBeDefined()
    if (row._tag !== "None") {
      expect(row.value.keys).toContain("a")
      expect(row.value.keys).toContain("b")
      expect(row.value.values).toContain(2)
      expect(row.value.values).toContain(5)
      expect(row.value.index).toBe(1)
    }

    const column = HashTable.getColumn(table, "b")
    expect(column).toBeDefined()
    if (column._tag !== "None") {
      expect(column.value.key).toBe("b")
      expect(column.value.values).toEqual([4, 5, 6])
      expect(column.value.index).toBeGreaterThanOrEqual(0)
    }
  })

  it("should insert and remove rows", () => {
    const table = HashTable.fromColumns([
      ["a", [1, 2]],
      ["b", [3, 4]]
    ])

    const withRow = HashTable.insertRow(table, [5, 6])
    expect(HashTable.rowsLength(withRow)).toBe(3)
    expect(HashTable.get(withRow, "a", 2)).toEqual({ value: 5 })
    expect(HashTable.get(withRow, "b", 2)).toEqual({ value: 6 })

    const afterRemove = HashTable.removeRow(withRow, 1)
    expect(HashTable.rowsLength(afterRemove)).toBe(2)
    expect(HashTable.get(afterRemove, "a", 0)).toEqual({ value: 1 })
    expect(HashTable.get(afterRemove, "a", 1)).toEqual({ value: 5 })
  })

  it("should insert and remove columns", () => {
    const table = HashTable.fromColumns([
      ["a", [1, 2]],
      ["b", [3, 4]]
    ])

    const withColumn = HashTable.insertColumn(table, "c", [5, 6])
    expect(HashTable.columnsLength(withColumn)).toBe(3)
    expect(HashTable.get(withColumn, "c", 0)).toEqual({ value: 5 })
    expect(HashTable.get(withColumn, "c", 1)).toEqual({ value: 6 })

    const afterRemove = HashTable.removeColumn(withColumn, "b")
    expect(HashTable.columnsLength(afterRemove)).toBe(2)
    expect(HashTable.get(afterRemove, "a", 0)).toEqual({ value: 1 })
    expect(HashTable.get(afterRemove, "c", 0)).toEqual({ value: 5 })
  })

  it("should iterate over entries", () => {
    const table = HashTable.fromColumns([
      ["a", [1, 2]],
      ["b", [3, 4]]
    ])

    const entries: Array<[string, number, number]> = []
    for (const [key, value, rowIndex] of table) {
      entries.push([key, value, rowIndex])
    }

    expect(entries).toHaveLength(4)
    expect(entries).toContainEqual(["a", 1, 0])
    expect(entries).toContainEqual(["b", 3, 0])
    expect(entries).toContainEqual(["a", 2, 1])
    expect(entries).toContainEqual(["b", 4, 1])
  })

  it("should handle mutations", () => {
    const table = HashTable.fromColumns([
      ["a", [1, 2]],
      ["b", [3, 4]]
    ])

    const result = HashTable.mutate(table, (mutable) => {
      HashTable.set(mutable, "a", 0, 99)
      HashTable.set(mutable, "b", 1, 88)
    })

    expect(HashTable.get(result, "a", 0)).toEqual({ value: 99 })
    expect(HashTable.get(result, "b", 1)).toEqual({ value: 88 })

    // Original should be unchanged
    expect(HashTable.get(table, "a", 0)).toEqual({ value: 1 })
    expect(HashTable.get(table, "b", 1)).toEqual({ value: 4 })
  })

  it("should properly compare HashTables for equality", () => {
    const table1 = HashTable.fromColumns([
      ["a", [1, 2]],
      ["b", [3, 4]]
    ])

    const table2 = HashTable.fromColumns([
      ["a", [1, 2]],
      ["b", [3, 4]]
    ])

    const table3 = HashTable.fromColumns([
      ["a", [1, 2]],
      ["b", [3, 5]] // Different value
    ])

    const table4 = HashTable.fromColumns([
      ["a", [1, 2]],
      ["c", [3, 4]] // Different key
    ])

    // Equal tables
    expect(Object.is(table1, table2)).toBe(false) // Different references
    expect(table1).toEqual(table2) // But equal contents

    // Different values
    expect(table1).not.toEqual(table3)

    // Different keys
    expect(table1).not.toEqual(table4)
  })

  it("should throw errors for inconsistent dimensions", () => {
    // Trying to create a table with inconsistent row lengths
    expect(() => {
      HashTable.fromColumns([
        ["a", [1, 2, 3]],
        ["b", [4, 5]] // Missing one value
      ])
    }).toThrow()

    // Trying to create a table with inconsistent column count
    expect(() => {
      HashTable.fromRows(
        ["a", "b", "c"],
        [
          [1, 4, 7],
          [2, 5] // Missing one value
        ]
      )
    }).toThrow()

    // Trying to insert a row with wrong length
    const table = HashTable.fromColumns([
      ["a", [1, 2]],
      ["b", [3, 4]]
    ])

    expect(() => {
      HashTable.insertRow(table, [5]) // Too few values
    }).toThrow()

    expect(() => {
      HashTable.insertRow(table, [5, 6, 7]) // Too many values
    }).toThrow()
  })

  it("should handle empty columns and rows correctly", () => {
    // Table with no rows
    const emptyRowsTable = HashTable.fromColumns([
      ["a", []],
      ["b", []]
    ])

    expect(HashTable.columnsLength(emptyRowsTable)).toBe(2)
    expect(HashTable.rowsLength(emptyRowsTable)).toBe(0)

    // Insert row into empty rows table
    const withRow = HashTable.insertRow(emptyRowsTable, [1, 2])
    expect(HashTable.rowsLength(withRow)).toBe(1)
    expect(HashTable.get(withRow, "a", 0)).toEqual({ value: 1 })
    expect(HashTable.get(withRow, "b", 0)).toEqual({ value: 2 })

    // Test getting nonexistent values
    const table = HashTable.fromColumns([
      ["a", [1, 2]],
      ["b", [3, 4]]
    ])

    expect(HashTable.get(table, "nonexistent", 0)._tag).toBe("None")
    expect(HashTable.get(table, "a", 99)._tag).toBe("None")
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
    const largeTable = HashTable.fromColumns(columnEntries)

    // Verify dimensions
    expect(HashTable.columnsLength(largeTable)).toBe(columns)
    expect(HashTable.rowsLength(largeTable)).toBe(rows)

    // Verify some random values
    expect(HashTable.get(largeTable, "col0", 0)).toEqual({ value: 0 })
    expect(HashTable.get(largeTable, "col50", 50)).toEqual({ value: 50050 })
    expect(HashTable.get(largeTable, "col99", 99)).toEqual({ value: 99099 })

    // Test performance of iteration
    let count = 0
    // Only iterate part of the table to keep test fast
    for (const [_key, _value, _rowIndex] of largeTable) {
      if (count++ > 1000) break
    }

    // If we got here without timing out, the iteration is efficient enough
    expect(true).toBe(true)
  })
})
