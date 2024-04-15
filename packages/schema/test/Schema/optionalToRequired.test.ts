import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as Option from "effect/Option"
import { describe, it } from "vitest"

describe("Schema > optionalToRequired", () => {
  it("two transformation schemas", async () => {
    const ps = S.optionalToRequired(
      S.NumberFromString,
      S.BigIntFromNumber,
      { decode: Option.getOrElse(() => 0), encode: Option.some }
    )
    const schema = S.Struct({ a: ps })
    await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1n })
  })
})
