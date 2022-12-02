// import * as A from "@fp-ts/schema/Arbitrary"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as JC from "@fp-ts/schema/JsonCodec"
import * as S from "@fp-ts/schema/Schema"
// import * as fc from "fast-check"
// import { pipe } from "@fp-ts/data/Function"

describe("examples", () => {
  describe("README", () => {
    // it("Creating a schema", () => {
    //   const Person = S.struct({
    //     name: S.string,
    //     age: S.number
    //   })
    //   type Person = S.Infer<typeof Person>
    // })

    it("Deriving a `JsonCodec` from a schema", () => {
      const schema = S.struct({
        name: S.string,
        age: S.number
      })

      const jsonCodec = JC.jsonCodecFor(schema)
      /*
    const jsonCodec: JC.JsonCodec<{
      readonly name: string;
      readonly age: number;
    }>
    */

      expect(jsonCodec.decode({ name: "name", age: 18 })).toEqual(
        D.success({ name: "name", age: 18 })
      )
      expect(jsonCodec.decode(null)).toEqual(
        D.failure(DE.notType("JsonObject", null))
      )
    })

    it("Deriving a `Guard` from a schema", () => {
      const schema = S.struct({
        name: S.string,
        age: S.number
      })

      const guard = G.guardFor(schema)
      /*
    const decoder: G.Guard<{
      readonly name: string;
      readonly age: number;
    }>
    */

      expect(guard.is({ name: "name", age: 18 })).toEqual(true)
      expect(guard.is(null)).toEqual(false)
    })

    // it("Deriving an `Arbitrary` from a schema", () => {
    //   const schema = S.struct({
    //     name: S.string,
    //     age: S.number
    //   })

    //   const arb = A.arbitraryFor(schema).arbitrary(fc)
    //   /*
    //   const arb: fc.Arbitrary<{
    //     readonly name: string;
    //     readonly age: number;
    //   }>
    //   */

    //   console.log(fc.sample(arb, 2))
    // })

    // it("Native enums", () => {
    //   enum E {
    //     a,
    //     b
    //   }
    //   const e = S.nativeEnum(E)
    // })
  })
})
