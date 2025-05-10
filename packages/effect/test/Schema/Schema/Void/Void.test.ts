import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Void", () => {
  const schema = S.Void
  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, undefined as any)
    await Util.assertions.decoding.succeed(schema, null as any)
    await Util.assertions.decoding.succeed(schema, "a" as any)
    await Util.assertions.decoding.succeed(schema, 1 as any)
    await Util.assertions.decoding.succeed(schema, true as any)
    await Util.assertions.decoding.succeed(schema, [] as any)
    await Util.assertions.decoding.succeed(schema, {} as any)
  })
})
