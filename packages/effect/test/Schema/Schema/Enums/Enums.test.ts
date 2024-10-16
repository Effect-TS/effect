import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("Enums", () => {
  it("enums should be exposed", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = S.Enums(Fruits).annotations({ identifier: "Fruits" })
    expect(schema.enums.Apple).toBe(0)
    expect(schema.enums.Banana).toBe(1)
  })

  describe("Numeric enums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = S.Enums(Fruits)

    it("decoding", async () => {
      await Util.expectDecodeUnknownSuccess(schema, Fruits.Apple)
      await Util.expectDecodeUnknownSuccess(schema, Fruits.Banana)
      await Util.expectDecodeUnknownSuccess(schema, 0)
      await Util.expectDecodeUnknownSuccess(schema, 1)

      await Util.expectDecodeUnknownFailure(
        schema,
        3,
        `Expected <enum 2 value(s): 0 | 1>, actual 3`
      )
    })

    it("encoding", async () => {
      await Util.expectEncodeSuccess(schema, Fruits.Apple, 0)
      await Util.expectEncodeSuccess(schema, Fruits.Banana, 1)
    })
  })

  describe("String enums", () => {
    enum Fruits {
      Apple = "apple",
      Banana = "banana",
      Cantaloupe = 0
    }
    const schema = S.Enums(Fruits)

    it("decoding", async () => {
      await Util.expectDecodeUnknownSuccess(schema, Fruits.Apple)
      await Util.expectDecodeUnknownSuccess(schema, Fruits.Cantaloupe)
      await Util.expectDecodeUnknownSuccess(schema, "apple")
      await Util.expectDecodeUnknownSuccess(schema, "banana")
      await Util.expectDecodeUnknownSuccess(schema, 0)

      await Util.expectDecodeUnknownFailure(
        schema,
        "Cantaloupe",
        `Expected <enum 3 value(s): 0 | 1 | 2>, actual "Cantaloupe"`
      )
    })

    it("encoding", async () => {
      await Util.expectEncodeSuccess(schema, Fruits.Apple, "apple")
      await Util.expectEncodeSuccess(schema, Fruits.Banana, "banana")
      await Util.expectEncodeSuccess(schema, Fruits.Cantaloupe, 0)
    })
  })

  describe("Const enums", () => {
    const Fruits = {
      Apple: "apple",
      Banana: "banana",
      Cantaloupe: 3
    } as const
    const schema = S.Enums(Fruits)

    it("decoding", async () => {
      await Util.expectDecodeUnknownSuccess(schema, "apple")
      await Util.expectDecodeUnknownSuccess(schema, "banana")
      await Util.expectDecodeUnknownSuccess(schema, 3)

      await Util.expectDecodeUnknownFailure(
        schema,
        "Cantaloupe",
        `Expected <enum 3 value(s): 0 | 1 | 2>, actual "Cantaloupe"`
      )
    })

    it("encoding", async () => {
      await Util.expectEncodeSuccess(schema, Fruits.Apple, "apple")
      await Util.expectEncodeSuccess(schema, Fruits.Banana, "banana")
      await Util.expectEncodeSuccess(schema, Fruits.Cantaloupe, 3)
    })
  })
})
