import * as Option from "@effect/data/Option"
import * as AST from "@effect/schema/AST"

describe("AST/partial", () => {
  it("tuple/ e", () => {
    // type A = [string]
    // type B = Partial<A>
    const tuple = AST.createTuple(
      [AST.createElement(AST.stringKeyword, false)],
      Option.none(),
      true
    )
    expect(AST.partial(tuple)).toEqual(
      AST.createTuple([AST.createElement(AST.stringKeyword, true)], Option.none(), true)
    )
  })

  it("tuple/ e + r", () => {
    // type A = readonly [string, ...Array<number>]
    // type B = Partial<A>
    const tuple = AST.createTuple(
      [AST.createElement(AST.stringKeyword, false)],
      Option.some([AST.numberKeyword]),
      true
    )
    expect(AST.partial(tuple)).toEqual(
      AST.createTuple(
        [AST.createElement(AST.stringKeyword, true)],
        Option.some([AST.createUnion([AST.numberKeyword, AST.undefinedKeyword])]),
        true
      )
    )
  })

  it("tuple/ e + r + e", () => {
    // type A = readonly [string, ...Array<number>, boolean]
    // type B = Partial<A>
    const tuple = AST.createTuple(
      [AST.createElement(AST.stringKeyword, false)],
      Option.some([AST.numberKeyword, AST.booleanKeyword]),
      true
    )
    expect(AST.partial(tuple)).toEqual(
      AST.createTuple(
        [AST.createElement(AST.stringKeyword, true)],
        Option.some([
          AST.createUnion([AST.numberKeyword, AST.booleanKeyword, AST.undefinedKeyword])
        ]),
        true
      )
    )
  })
})
