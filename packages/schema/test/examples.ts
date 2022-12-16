// import * as A from "@fp-ts/schema/Arbitrary"
import * as O from "@fp-ts/data/Option"
import * as AST from "@fp-ts/schema/AST"
import * as C from "@fp-ts/schema/Codec"
import * as DE from "@fp-ts/schema/DecodeError"
import * as S from "@fp-ts/schema/Schema"
// import * as fc from "fast-check"
// import { pipe } from "@fp-ts/data/Function"

describe.concurrent("examples", () => {
  describe.concurrent("README", () => {
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

      const unknown: unknown = { name: "name", age: 18 }

      // decode from `unknown`
      expect(Person.decode(unknown)).toEqual(
        C.success({ name: "name", age: 18 })
      )
      expect(Person.decode(null)).toEqual(
        C.failure(DE.notType("{ readonly [_: string]: unknown }", null))
      )

      // parse from JSON string
      expect(() => Person.parseOrThrow("malformed")).toThrow(
        new Error("Cannot parse JSON from: malformed")
      )
      expect(() => Person.parseOrThrow("{}")).toThrow(
        new Error("Cannot decode JSON")
      )
      expect(() => Person.parseOrThrow("{}", (errors) => JSON.stringify(errors))).toThrow(
        new Error(
          `Cannot decode JSON, errors: [{"_tag":"Key","key":"name","errors":[{"_tag":"Missing"}]}]`
        )
      )

      // encode to `unknown`
      expect(Person.encode({ name: "name", age: 18 })).toEqual({ name: "name", age: 18 })

      // encode to JSON string
      expect(Person.stringify({ name: "name", age: 18 })).toEqual("{\"name\":\"name\",\"age\":18}")

      // guard
      expect(Person.is({ name: "name", age: 18 })).toEqual(true)
      expect(Person.is(null)).toEqual(false)

      // pretty print
      expect(Person.pretty({ name: "name", age: 18 })).toEqual(
        `{ name: "name", age: 18 }`
      )

      // arbitrary
      // console.log(fc.sample(Person.arbitrary(fc), 2))
    })

    it("custom schema combinator", () => {
      const pair = <A>(schema: S.Schema<A>): S.Schema<readonly [A, A]> => {
        const tuple = AST.tuple(
          [AST.element(schema.ast, false), AST.element(schema.ast, false)], // <= elements definitions
          O.none, // <= rest element
          true // <= specifies if the tuple is readonly
        )
        return S.make(tuple) // <= wrap the AST value in a Schema
      }
      // const pair = <A>(schema: S.Schema<A>): S.Schema<readonly [A, A]> => S.tuple(schema, schema)

      // const myNumberPair: C.Codec<readonly [number, number]>
      const myNumberPair = C.codecFor(pair(S.number))

      expect(myNumberPair.is([1, 2])).toEqual(true)
      expect(myNumberPair.is([1, "a"])).toEqual(false)
    })
  })
})
