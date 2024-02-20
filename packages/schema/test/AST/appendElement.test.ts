import * as AST from "@effect/schema/AST"
import * as Option from "effect/Option"
import { describe, expect, it } from "vitest"

describe("AST/appendElement", () => {
  it("should append an element (rest element)", () => {
    const tuple = new AST.Tuple(
      [new AST.Element(AST.stringKeyword, false)],
      Option.none(),
      true
    )
    expect(AST.appendElement(tuple, new AST.Element(AST.numberKeyword, false))).toEqual(
      new AST.Tuple(
        [
          new AST.Element(AST.stringKeyword, false),
          new AST.Element(AST.numberKeyword, false)
        ],
        Option.none(),
        true
      )
    )
  })

  it("should append an element (existing rest element)", () => {
    const tuple = new AST.Tuple(
      [new AST.Element(AST.stringKeyword, false)],
      Option.some([AST.numberKeyword]),
      true
    )
    expect(AST.appendElement(tuple, new AST.Element(AST.booleanKeyword, false))).toEqual(
      new AST.Tuple(
        [new AST.Element(AST.stringKeyword, false)],
        Option.some([AST.numberKeyword, AST.booleanKeyword]),
        true
      )
    )
  })

  it("A required element cannot follow an optional element", () => {
    const tuple = new AST.Tuple([new AST.Element(AST.stringKeyword, true)], Option.none(), true)
    expect(() => AST.appendElement(tuple, new AST.Element(AST.numberKeyword, false)))
      .toThrow(
        new Error("A required element cannot follow an optional element. ts(1257)")
      )
  })

  it("An optional element cannot follow a rest element", () => {
    const tuple = new AST.Tuple([], Option.some([AST.stringKeyword]), true)
    expect(() => AST.appendElement(tuple, new AST.Element(AST.numberKeyword, true)))
      .toThrow(
        new Error("An optional element cannot follow a rest element. ts(1266)")
      )
  })
})
