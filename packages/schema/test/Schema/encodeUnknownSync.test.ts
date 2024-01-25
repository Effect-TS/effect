import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema > encodeUnknownSync", () => {
  it("should throw on async", () => {
    expect(() => S.encodeUnknownSync(Util.effectify(S.string))("a")).toThrow(
      new Error(
        "Fiber #0 cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work"
      )
    )
  })
})
