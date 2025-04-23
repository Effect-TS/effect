import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("clamp", () => {
  it("decoding", async () => {
    const schema = S.Number.pipe(S.clamp(-1, 1))
    await Util.assertions.decoding.succeed(schema, 3, 1)
    await Util.assertions.decoding.succeed(schema, 0, 0)
    await Util.assertions.decoding.succeed(schema, -3, -1)
  })

  it("should support doubles as constraints", async () => {
    const schema = S.Number.pipe(S.clamp(1.3, 3.1))
    await Util.assertions.decoding.succeed(schema, 4, 3.1)
    await Util.assertions.decoding.succeed(schema, 2, 2)
    await Util.assertions.decoding.succeed(schema, 1, 1.3)
  })
})
