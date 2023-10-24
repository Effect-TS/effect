import * as AST from "@effect/schema/AST"
import * as Option from "effect/Option"
import { describe, expect, it } from "vitest"

describe("AST/appendElement", () => {
  it("should append an element (rest element)", () => {
    const tuple = AST.createTuple(
      [AST.createElement(AST.stringKeyword, false)],
      Option.none(),
      true
    )
    expect(AST.appendElement(tuple, AST.createElement(AST.numberKeyword, false))).toEqual(
      AST.createTuple(
        [
          AST.createElement(AST.stringKeyword, false),
          AST.createElement(AST.numberKeyword, false)
        ],
        Option.none(),
        true
      )
    )
  })

  it("should append an element (existing rest element)", () => {
    const tuple = AST.createTuple(
      [AST.createElement(AST.stringKeyword, false)],
      Option.some([AST.numberKeyword]),
      true
    )
    expect(AST.appendElement(tuple, AST.createElement(AST.booleanKeyword, false))).toEqual(
      AST.createTuple(
        [AST.createElement(AST.stringKeyword, false)],
        Option.some([AST.numberKeyword, AST.booleanKeyword]),
        true
      )
    )
  })

  it("A required element cannot follow an optional element", () => {
    const tuple = AST.createTuple([AST.createElement(AST.stringKeyword, true)], Option.none(), true)
    expect(() => AST.appendElement(tuple, AST.createElement(AST.numberKeyword, false)))
      .toThrow(
        new Error("A required element cannot follow an optional element. ts(1257)")
      )
  })

  it("An optional element cannot follow a rest element", () => {
    const tuple = AST.createTuple([], Option.some([AST.stringKeyword]), true)
    expect(() => AST.appendElement(tuple, AST.createElement(AST.numberKeyword, true)))
      .toThrow(
        new Error("An optional element cannot follow a rest element. ts(1266)")
      )
  })
})
