import { assert, describe, it } from "@effect/vitest"
import { Option, Result } from "effect"
import { ArrowColumn, ArrowSchema as S, ArrowTable } from "effect/arrow"

const schema = S.make([
  S.field("id", S.int32, { nullable: false }),
  S.field("name", S.utf8),
  S.field("tag", S.dictionary(S.utf8))
])
const rows = [
  { id: 1, name: "a", tag: "x" },
  { id: 2, name: null, tag: "y" },
  { id: 3, name: "c", tag: "x" },
  { id: 4, name: "d", tag: null },
  { id: 5, name: "e", tag: "z" }
]
// Two rows per batch: [1, 2], [3, 4], [5]
const table = Result.getOrThrow(ArrowTable.fromRows(schema, rows, { batchSize: 2 }))

describe("ArrowTable", () => {
  it("fromRows splits rows into batches that toRows reads back", () => {
    const built = Result.getOrThrow(
      ArrowTable.fromRows(schema, [{ id: 1, tag: "x" }, { id: 2, name: "b" }], { batchSize: 1 })
    )
    assert.deepStrictEqual(ArrowTable.toRows(built), [{ id: 1, name: null, tag: "x" }, { id: 2, name: "b", tag: null }])

    assert.deepStrictEqual(table.batches.map((batch) => batch.length), [2, 2, 1])
    assert.strictEqual(ArrowTable.numRows(table), 5)
    assert.deepStrictEqual(ArrowTable.toRows(table), rows)
    assert.deepStrictEqual(Array.from(ArrowTable.rows(table)), rows)
    // Dictionary-encoded fields share one dictionary across batches
    const [first, ...others] = table.batches.map((batch) => batch.columns[2].dictionary)
    for (const dictionary of others) assert.strictEqual(dictionary, first)
  })

  it("fromColumns and fromBatches build one batch per entry, by field name or position", () => {
    const fromBatches = Result.getOrThrow(ArrowTable.fromBatches(schema, [
      { id: [1, 2], name: ["a", null], tag: ["x", "y"] },
      [[3, 4, 5], ["c", "d", "e"], ["x", null, "z"]]
    ]))
    assert.deepStrictEqual(fromBatches.batches.map((batch) => batch.length), [2, 3])
    assert.deepStrictEqual(ArrowTable.toRows(fromBatches), rows)

    const fromColumns = Result.getOrThrow(ArrowTable.fromColumns(schema, [[1], ["a"], ["x"]]))
    assert.deepStrictEqual(ArrowTable.toRows(fromColumns), [rows[0]])
  })

  it("build errors locate the value across batches", () => {
    const failures: ReadonlyArray<
      readonly [Result.Result<ArrowTable.Table, ArrowColumn.ArrowBuildError>, ReadonlyArray<string | number>]
    > = [
      [ArrowTable.fromRows(schema, [...rows.slice(0, 3), { id: null }], { batchSize: 2 }), [3, "id"]],
      [ArrowTable.fromColumns(schema, { id: [1, 2], name: ["a"], tag: ["x", "y"] }), ["name"]],
      [ArrowTable.fromColumns(schema, { id: [1], name: ["a"] }), ["tag"]],
      [ArrowTable.fromColumns(S.make([S.field("u", S.union("sparse", [S.field("a", S.int8)], [-1]))]), { u: [] }), [
        "u"
      ]]
    ]
    for (const [result, path] of failures) {
      assert.isTrue(Result.isFailure(result))
      if (Result.isFailure(result)) {
        assert.isTrue(ArrowColumn.isArrowBuildError(result.failure))
        assert.deepStrictEqual(result.failure.path, path)
      }
    }
  })

  it("column reads one field across batches, by name or position", () => {
    const names = ["a", null, "c", "d", "e"]
    for (const field of ["name", 1]) {
      const column = Option.getOrThrow(ArrowTable.column(table, field))
      assert.strictEqual(column.field, schema.fields[1])
      assert.deepStrictEqual(ArrowColumn.toArray(column), names)
      assert.deepStrictEqual([...column], names)
      assert.deepStrictEqual([0, 1, 3, 4, 5, -1, 1.5].map((i) => ArrowColumn.get(column, i)), [
        Option.some("a"),
        Option.some(null),
        Option.some("d"),
        Option.some("e"),
        Option.none(),
        Option.none(),
        Option.none()
      ])
      assert.strictEqual(ArrowColumn.getUnsafe(column, 2), "c")
      assert.throws(() => ArrowColumn.getUnsafe(column, 5), RangeError)
    }
    assert.isTrue(Option.isNone(ArrowTable.column(table, "missing")))
    assert.isTrue(Option.isNone(ArrowTable.column(table, 3)))
  })

  it("slice keeps rows start until end across batches", () => {
    const slices: ReadonlyArray<readonly [start: number, end: number | undefined, lengths: ReadonlyArray<number>]> = [
      [0, undefined, [2, 2, 1]],
      [1, 4, [1, 2]],
      [2, 4, [2]],
      [3, 5, [1, 1]],
      [4, undefined, [1]],
      [3, 3, []]
    ]
    for (const [start, end, lengths] of slices) {
      const sliced = ArrowTable.slice(table, start, end)
      assert.deepStrictEqual(sliced.batches.map((batch) => batch.length), lengths)
      assert.strictEqual(ArrowTable.numRows(sliced), rows.slice(start, end).length)
      assert.deepStrictEqual(ArrowTable.toRows(sliced), rows.slice(start, end))
    }
    assert.deepStrictEqual(ArrowTable.toRows(ArrowTable.slice(ArrowTable.slice(table, 1), 2, 3)), [rows[3]])
    for (const [start, end] of [[-1, 2], [3, 2], [0, 6]]) {
      assert.throws(() => ArrowTable.slice(table, start, end), RangeError)
    }
  })
})
