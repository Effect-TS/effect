import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema > decodeUnknownSync", () => {
  it("should throw on async", () => {
    expect(() => S.decodeUnknownSync(Util.AsyncString)("a")).toThrow(
      new Error(
        `AsyncString
└─ Fiber #0 cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
      )
    )
  })
})
