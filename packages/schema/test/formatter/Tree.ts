import * as _ from "@fp-ts/schema/formatter/Tree"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("Tree", () => {
  it("formatErrors/ Unexpected", () => {
    const schema = S.struct({ a: S.string })
    Util.expectDecodingFailureTree(
      schema,
      { a: "a", b: 1 },
      `1 error(s) found
└─ key "b"
   └─ is unexpected`
    )
  })

  it("formatAST/ any", () => {
    const schema = S.any
    expect(_.formatAST(schema.ast)).toEqual("any")
  })

  it("formatAST/ unknown", () => {
    const schema = S.unknown
    expect(_.formatAST(schema.ast)).toEqual("unknown")
  })

  it("formatAST/ union", () => {
    const schema = S.union(S.string, S.number)
    expect(_.formatAST(schema.ast)).toEqual("a string or a number")
  })

  it("formatAST/ lazy", () => {
    type A = string | readonly [A]
    const schema: S.Schema<A> = S.lazy("A", () => S.union(S.string, S.tuple(schema)))
    expect(_.formatAST(schema.ast)).toEqual("an instance of A")
  })
})
