import { describe, it } from "@effect/vitest"
import { assertTrue } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Uint8Array > Uint8Array", () => {
  const schema = S.Uint8Array

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("isSchema", () => {
    assertTrue(S.isSchema(schema))
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, [0, 1, 2, 3], Uint8Array.from([0, 1, 2, 3]))
    await Util.assertions.decoding.fail(
      schema,
      [12354],
      `Uint8Array
└─ Encoded side transformation failure
   └─ an array of 8-bit unsigned integers to be decoded into a Uint8Array
      └─ [0]
         └─ Uint8
            └─ Predicate refinement failure
               └─ Expected a 8-bit unsigned integer, actual 12354`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, Uint8Array.from([0, 1, 2, 3]), [0, 1, 2, 3])
  })
})
