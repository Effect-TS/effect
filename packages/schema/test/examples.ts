// import * as A from "@fp-ts/schema/Arbitrary"
import { pipe } from "@fp-ts/data/Function"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as JC from "@fp-ts/schema/JsonCodec"
import * as JD from "@fp-ts/schema/JsonDecoder"
import * as S from "@fp-ts/schema/Schema"
// import * as fc from "fast-check"
// import { pipe } from "@fp-ts/data/Function"

describe("examples", () => {
  describe("README", () => {
    it("Summary", () => {
      const Person = JC.struct({
        name: JC.string,
        age: JC.number
      })

      // extract the inferred type
      type Person = JC.Infer<typeof Person>
      /*
      type Person = {
        readonly name: string;
        readonly age: number;
      }
      */

      // decode from JSON
      expect(Person.decode({ name: "name", age: 18 })).toEqual(
        D.success({ name: "name", age: 18 })
      )
      expect(Person.decode(null)).toEqual(
        D.failure(DE.notType("JsonObject", null))
      )

      // encode to JSON
      expect(Person.encode({ name: "name", age: 18 })).toEqual({ name: "name", age: 18 })

      // guard
      expect(Person.is({ name: "name", age: 18 })).toEqual(true)
      expect(Person.is(null)).toEqual(false)

      // pretty print
      expect(Person.pretty({ name: "name", age: 18 })).toEqual(
        "{ \"name\": \"name\", \"age\": 18 }"
      )

      // arbitrary
      // console.log(fc.sample(Person.arbitrary(fc), 2))
    })

    it("Custom decode errors", () => {
      const mystring = pipe(
        S.string,
        S.clone(Symbol.for("mystring"), {
          [JD.JsonDecoderId]: () => myJsonDecoder
        })
      )

      const myJsonDecoder = D.make(mystring, (u) =>
        typeof u === "string"
          ? D.success(u)
          : D.failure(DE.custom({ myCustomErrorConfig: "not a string" }, u)))

      const Person = S.struct({
        name: mystring,
        age: S.number
      })

      const codec = JC.jsonCodecFor(Person)

      expect(codec.decode({ name: null, age: 18 })).toEqual(
        D.failure(DE.key("name", [DE.custom({ myCustomErrorConfig: "not a string" }, null)]))
      )
    })
  })
})
