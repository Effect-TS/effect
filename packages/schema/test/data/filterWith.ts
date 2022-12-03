import { filterWith } from "@fp-ts/schema/data/filterWith"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe("filterWith", () => {
  const min = filterWith(
    Symbol.for("@fp-ts/schema/test/min"),
    (min: number) => (n: number) => n >= min ? D.success(n) : D.failure(DE.min(min, n))
  )

  it("property tests", () => {
    Util.property(min(0)(S.number))
  })
})
