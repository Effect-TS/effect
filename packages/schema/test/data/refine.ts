import { pipe } from "@fp-ts/data/Function"
import { refine } from "@fp-ts/schema/data/refine"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as E from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

const id = Symbol.for("@fp-ts/schema/data/int")
type Int = number & { __brand: "Int" }
const isInt = (n: number): n is Int => Number.isInteger(n)
const Int = refine(
  id,
  (n: number) => isInt(n) ? D.success(n) : D.failure(DE.custom("not an int", n))
)

describe("refine", () => {
  const schema = pipe(S.number, Int)

  it("property tests", () => {
    Util.property(schema)
  })

  it("guard", () => {
    const guard = G.guardFor(schema)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(1.2)).toEqual(false)
  })

  it("Decoder", () => {
    const decoder = D.decoderFor(schema)
    expect(decoder.decode(1)).toEqual(D.success(1))
    Util.expectFailure(decoder, 1.2, "1.2 \"not an int\"")
  })

  it("Encoder", () => {
    const encoder = E.encoderFor(schema)
    expect(encoder.encode(1 as any)).toEqual(1)
  })
})
