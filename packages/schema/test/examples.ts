// import * as A from "@fp-ts/schema/Arbitrary"
import { pipe } from "@fp-ts/data/Function"
import * as C from "@fp-ts/schema/Codec"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as S from "@fp-ts/schema/Schema"
// import * as fc from "fast-check"
// import { pipe } from "@fp-ts/data/Function"

describe("examples", () => {
  describe("README", () => {
    it("Summary", () => {
      const Person = C.struct({
        name: C.string,
        age: C.number
      })

      // extract the inferred type
      type Person = C.Infer<typeof Person>
      /*
      type Person = {
        readonly name: string;
        readonly age: number;
      }
      */

      // decode from JSON
      expect(Person.decode({ name: "name", age: 18 })).toEqual(
        C.success({ name: "name", age: 18 })
      )
      expect(Person.decode(null)).toEqual(
        C.failure(DE.notType(Symbol.for("@fp-ts/schema/data/UnknownObject"), null))
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
          [D.DecoderId]: () => myJsonDecoder
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

      const codec = C.codecFor(Person)

      expect(codec.decode({ name: null, age: 18 })).toEqual(
        D.failure(DE.key("name", [DE.custom({ myCustomErrorConfig: "not a string" }, null)]))
      )
    })
  })
})
