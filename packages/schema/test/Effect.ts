import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Effect", () => {
  it.skip("union/ should keep the member order with two structs with the same tag", async () => {
    const schema = S.union(
      S.struct({ _tag: S.literal("a"), b: S.string }),
      S.struct({ _tag: S.literal("a"), c: S.number })
    )
    await Util.expectParseSuccess(schema, { _tag: "a", b: "b" })
    await Util.expectParseSuccess(schema, { _tag: "a", c: 1 })
    await Util.expectParseFailure(
      schema,
      { _tag: "a" },
      `union member: /b is missing, union member: /c is missing`
    )
    await Util.expectParseFailure(
      schema,
      { _tag: "a", c: "c" },
      `union member: /b is missing, union member: /c Expected number, actual "c"`
    )
  })

  it.skip("union/ should keep the member order with two structs with the same tag and structs in otherwise", async () => {
    const schema = S.union(
      S.struct({ _tag: S.literal("a"), b: S.string }),
      S.struct({ _tag: S.literal("a"), c: S.number }),
      S.struct({ d: S.boolean }),
      S.struct({ e: S.object })
    )
    await Util.expectParseSuccess(schema, { _tag: "a", b: "b" })
    await Util.expectParseSuccess(schema, { _tag: "a", c: 1 })
    await Util.expectParseSuccess(schema, { d: true })
    await Util.expectParseSuccess(schema, { e: {} })
    await Util.expectParseFailure(
      schema,
      { _tag: "a" },
      `union member: /b is missing, union member: /c is missing, union member: /d is missing, union member: /e is missing`
    )
    await Util.expectParseFailure(
      schema,
      { _tag: "a", c: "c" },
      `union member: /b is missing, union member: /c Expected number, actual "c", union member: /d is missing, union member: /e is missing`
    )
  })
})
