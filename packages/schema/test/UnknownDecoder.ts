import { pipe } from "@fp-ts/data/Function"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"
import * as UD from "@fp-ts/schema/UnknownDecoder"

describe("UnknownDecoder", () => {
  it("should allow custom errors", () => {
    const mystring = pipe(
      S.string,
      S.clone(Symbol.for("mystring"), {
        [UD.UnknownDecoderId]: () => mystringDecoder
      })
    )

    const mystringDecoder = D.make(
      mystring,
      (u) =>
        typeof u === "string" ?
          D.success(u) :
          D.failure(DE.custom({ message: "not a string" }, u))
    )

    const Person = S.struct({
      name: mystring,
      age: S.number
    })
    const decoder = UD.unknownDecoderFor(Person)

    expect(decoder.decode({ name: "name", age: 18 })).toEqual(D.success({ name: "name", age: 18 }))

    Util.expectFailure(
      decoder,
      { name: null, age: 18 },
      "/name null did not satisfy {\"message\":\"not a string\"}"
    )
  })
})
