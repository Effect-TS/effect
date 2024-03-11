import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as Option from "effect/Option"
import { describe, it } from "vitest"

describe("Schema > optionalToRequired", () => {
  it("two transformation schemas", async () => {
    const ps = S.optionalToRequired(
      S.NumberFromString,
      S.BigintFromNumber,
      Option.getOrElse(() => 0),
      Option.some
    )
    const schema = S.struct({ a: ps })
    await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1n })
  })
})
