import * as AST from "@effect/schema/AST"
import * as Option from "effect/Option"
import { describe, expect, it } from "vitest"

describe("AST/appendRestElement", () => {
  it("should add a rest element", () => {
    const tuple = AST.createTuple(
      [AST.createElement(AST.stringKeyword, false)],
      Option.none(),
      true
    )
    const actual = AST.appendRestElement(tuple, AST.numberKeyword)
    expect(actual).toEqual(
      AST.createTuple(
        [AST.createElement(AST.stringKeyword, false)],
        Option.some([AST.numberKeyword]),
        true
      )
    )
  })

  it("multiple `rest` calls must throw", () => {
    expect(() =>
      AST.appendRestElement(
        AST.appendRestElement(
          AST.createTuple([AST.createElement(AST.stringKeyword, false)], Option.none(), true),
          AST.numberKeyword
        ),
        AST.booleanKeyword
      )
    ).toThrow(new Error("A rest element cannot follow another rest element. ts(1265)"))
  })
})
