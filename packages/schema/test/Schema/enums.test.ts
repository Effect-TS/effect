import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema/enums", () => {
  describe("Numeric enums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = S.enums(Fruits)

    it("decoding", async () => {
      await Util.expectParseSuccess(schema, Fruits.Apple)
      await Util.expectParseSuccess(schema, Fruits.Banana)
      await Util.expectParseSuccess(schema, 0)
      await Util.expectParseSuccess(schema, 1)

      await Util.expectParseFailure(
        schema,
        3,
        `Expected 0 | 1, actual 3`
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
    const schema = S.enums(Fruits)

    it("decoding", async () => {
      await Util.expectParseSuccess(schema, Fruits.Apple)
      await Util.expectParseSuccess(schema, Fruits.Cantaloupe)
      await Util.expectParseSuccess(schema, "apple")
      await Util.expectParseSuccess(schema, "banana")
      await Util.expectParseSuccess(schema, 0)

      await Util.expectParseFailure(
        schema,
        "Cantaloupe",
        `Expected 0 | 1 | 2, actual "Cantaloupe"`
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
    const schema = S.enums(Fruits)

    it("decoding", async () => {
      await Util.expectParseSuccess(schema, "apple")
      await Util.expectParseSuccess(schema, "banana")
      await Util.expectParseSuccess(schema, 3)

      await Util.expectParseFailure(
        schema,
        "Cantaloupe",
        `Expected 0 | 1 | 2, actual "Cantaloupe"`
      )
    })

    it("encoding", async () => {
      await Util.expectEncodeSuccess(schema, Fruits.Apple, "apple")
      await Util.expectEncodeSuccess(schema, Fruits.Banana, "banana")
      await Util.expectEncodeSuccess(schema, Fruits.Cantaloupe, 3)
    })
  })
})
