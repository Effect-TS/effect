import { describe, expect, it } from "tstyche"

// Simple type-level test for basic functionality
type SimpleString = string
type SimpleNumber = number

describe("Basic Types", () => {
  it("string type works", () => {
    expect<SimpleString>().type.toBe<string>()
  })

  it("number type works", () => {
    expect<SimpleNumber>().type.toBe<number>()
  })
})
