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

  it("should throw on unexpected dependencies", () => {
    try {
      S.decodeUnknownSync(Util.DependencyString as any)("a")
      throw new Error("unexpected success")
    } catch (e: any) {
      expect((e.message as string).startsWith(`DependencyString
└─ Service not found`))
    }
  })
})
