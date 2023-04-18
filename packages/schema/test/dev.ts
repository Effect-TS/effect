import * as S from "@effect/schema/Schema"

describe.concurrent("dev", () => {
  it.skip("dev", async () => {
    const schema = S.record(S.templateLiteral(S.literal("a", "b"), S.literal("c")), S.string)
    console.log("%o", schema.ast)
  })
})
