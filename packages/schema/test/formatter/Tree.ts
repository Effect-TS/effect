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
})
