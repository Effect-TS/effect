import * as Statement from "effect/sql/Statement"
import { describe, expect, it } from "tstyche"

declare const sql: Statement.Constructor
declare const foreignLiteral: { readonly _tag: "Literal"; readonly value: string }
declare const foreignFragment: {
  readonly "~effect/sql/Statement/Fragment": "~effect/sql/Statement/Fragment"
  readonly segments: ReadonlyArray<typeof foreignLiteral>
}

describe("Statement", () => {
  it("insert requires non-empty rows or a single record", () => {
    expect(sql.insert).type.not.toBeCallableWith([])
    expect(sql.insert).type.toBeCallableWith([{ name: "Ada" }])
    expect(sql.insert).type.toBeCallableWith({ name: "Ada" })
  })

  it("updateValues requires non-empty rows", () => {
    expect(sql.updateValues).type.not.toBeCallableWith([], "data")
    expect(sql.updateValues).type.toBeCallableWith([{ name: "Ada" }], "data")
  })

  it("accepts fragments and segments typed by another copy of effect", () => {
    expect(Statement.fragment).type.toBeCallableWith([foreignLiteral])
    expect(sql.csv).type.toBeCallableWith([foreignFragment])
  })
})
