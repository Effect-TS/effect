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
    const fallback = sql.onDialectOrElse({ spark: () => "custom", orElse: () => false })
    expect(fallback).type.toBe<string | boolean>()
  })

  it("accepts named branch maps and rejects custom branches hidden by explicit generics", () => {
    interface PgOrElse {
      readonly orElse: () => string
      readonly pg?: () => number
    }
    const pgOrElse = {} as PgOrElse
    const fallback = sql.onDialectOrElse(pgOrElse)
    expect(fallback).type.toBe<string | number>()

    const custom = { orElse: () => 1, spark: () => "custom" }
    const inferred = sql.onDialectOrElse(custom)
    expect(inferred).type.toBe<number | string>()
    expect(sql.onDialectOrElse<number>).type.not.toBeCallableWith(custom)
    expect(sql.onDialectOrElse<number>).type.toBeCallableWith({ orElse: () => 1 })
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
