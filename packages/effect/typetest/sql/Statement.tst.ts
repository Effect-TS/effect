import * as Statement from "effect/sql/Statement"
import { describe, expect, it } from "tstyche"

declare const sql: Statement.Constructor
declare const plainLiteral: { readonly _tag: "Literal"; readonly value: string }
declare const plainFragment: {
  readonly "~effect/sql/Statement/Fragment": "~effect/sql/Statement/Fragment"
  readonly segments: ReadonlyArray<Statement.Segment>
}

describe("Statement", () => {
  it("accepts custom dialects and infers the results of supplied branches", () => {
    expect<"spark">().type.toBeAssignableTo<Statement.CompilerOptions["dialect"]>()
    const strict = sql.onDialect({ pg: () => 1, spark: () => "custom" })
    const fallback = sql.onDialectOrElse({ spark: () => "custom", orElse: () => false })
    expect(strict).type.toBe<number | string>()
    expect(fallback).type.toBe<string | boolean>()
  })

  it("accepts named branch maps and rejects custom branches hidden by explicit generics", () => {
    interface AllBranches {
      readonly sqlite: () => number
      readonly pg: () => number
      readonly mysql: () => number
      readonly mssql: () => number
      readonly clickhouse: () => number
    }
    interface PgOrElse {
      readonly orElse: () => string
      readonly pg?: () => number
    }
    const allBranches = {} as AllBranches
    const pgOrElse = {} as PgOrElse
    const strict = sql.onDialect(allBranches)
    const fallback = sql.onDialectOrElse(pgOrElse)
    expect(strict).type.toBe<number>()
    expect(fallback).type.toBe<string | number>()

    const custom = { orElse: () => 1, spark: () => "custom" }
    const inferred = sql.onDialectOrElse(custom)
    expect(inferred).type.toBe<number | string>()
    expect(sql.onDialectOrElse<number>).type.not.toBeCallableWith(custom)
    expect(sql.onDialectOrElse<number>).type.toBeCallableWith({ orElse: () => 1 })
    expect(sql.onDialect<1, 2, 3, 4, 5>).type.toBeCallableWith({
      sqlite: () => 1 as const,
      pg: () => 2 as const,
      mysql: () => 3 as const,
      mssql: () => 4 as const,
      clickhouse: () => 5 as const
    })
  })

  it("insert requires non-empty rows or a single record", () => {
    expect(sql.insert).type.not.toBeCallableWith([])
    expect(sql.insert).type.toBeCallableWith([{ name: "Ada" }])
    expect(sql.insert).type.toBeCallableWith({ name: "Ada" })
  })

  it("updateValues requires non-empty rows", () => {
    expect(sql.updateValues).type.not.toBeCallableWith([], "data")
    expect(sql.updateValues).type.toBeCallableWith([{ name: "Ada" }], "data")
  })

  it("requires symbol-branded fragments and segments", () => {
    expect(Statement.fragment).type.toBeCallableWith([Statement.literal("SELECT 1")])
    expect(Statement.fragment).type.not.toBeCallableWith([plainLiteral])
    expect(sql.csv).type.toBeCallableWith([Statement.fragment([])])
    expect(sql.csv).type.not.toBeCallableWith([plainFragment])
  })
})
