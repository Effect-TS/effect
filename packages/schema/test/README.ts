// import * as A from "@fp-ts/codec/Arbitrary"
import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as G from "@fp-ts/codec/Guard"
import * as S from "@fp-ts/codec/Schema"
// import * as fc from "fast-check"
// import { pipe } from "@fp-ts/data/Function"

describe("README", () => {
  // it("Creating a schema", () => {
  //   const Person = S.struct({
  //     name: S.string,
  //     age: S.number
  //   })
  //   type Person = S.Infer<typeof Person>
  // })

  it("Deriving a decoder from a schema", () => {
    const schema = S.struct({
      name: S.string,
      age: S.number
    })

    const decoder = D.unsafeDecoderFor(schema)
    /*
    const decoder: D.Decoder<unknown, {
      readonly name: string;
      readonly age: number;
    }>
    */

    expect(decoder.decode({ name: "name", age: 18 })).toEqual(D.succeed({ name: "name", age: 18 }))
    expect(decoder.decode(null)).toEqual(
      D.fail(DE.notType("{ readonly [_: string]: unknown }", null))
    )
  })

  it("Deriving a guard from a schema", () => {
    const schema = S.struct({
      name: S.string,
      age: S.number
    })

    const guard = G.unsafeGuardFor(schema)
    /*
    const decoder: G.Guard<{
      readonly name: string;
      readonly age: number;
    }>
    */

    expect(guard.is({ name: "name", age: 18 })).toEqual(true)
    expect(guard.is(null)).toEqual(false)
  })

  // it("Deriving an arbitrary from a schema", () => {
  //   const schema = S.struct({
  //     name: S.string,
  //     age: S.number
  //   })

  //   const arb = A.unsafeArbitraryFor(schema).arbitrary(fc)
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
