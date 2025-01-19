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
      await Util.assertions.decoding.succeed(schema, Fruits.Apple)
      await Util.assertions.decoding.succeed(schema, Fruits.Banana)
      await Util.assertions.decoding.succeed(schema, 0)
      await Util.assertions.decoding.succeed(schema, 1)

      await Util.assertions.decoding.fail(
        schema,
        3,
        `Expected <enum 2 value(s): 0 | 1>, actual 3`
      )
    })

    it("encoding", async () => {
      await Util.assertions.encoding.succeed(schema, Fruits.Apple, 0)
      await Util.assertions.encoding.succeed(schema, Fruits.Banana, 1)
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
      await Util.assertions.decoding.succeed(schema, Fruits.Apple)
      await Util.assertions.decoding.succeed(schema, Fruits.Cantaloupe)
      await Util.assertions.decoding.succeed(schema, "apple")
      await Util.assertions.decoding.succeed(schema, "banana")
      await Util.assertions.decoding.succeed(schema, 0)

      await Util.assertions.decoding.fail(
        schema,
        "Cantaloupe",
        `Expected <enum 3 value(s): 0 | 1 | 2>, actual "Cantaloupe"`
      )
    })

    it("encoding", async () => {
      await Util.assertions.encoding.succeed(schema, Fruits.Apple, "apple")
      await Util.assertions.encoding.succeed(schema, Fruits.Banana, "banana")
      await Util.assertions.encoding.succeed(schema, Fruits.Cantaloupe, 0)
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
      await Util.assertions.decoding.succeed(schema, "apple")
      await Util.assertions.decoding.succeed(schema, "banana")
      await Util.assertions.decoding.succeed(schema, 3)

      await Util.assertions.decoding.fail(
        schema,
        "Cantaloupe",
        `Expected <enum 3 value(s): 0 | 1 | 2>, actual "Cantaloupe"`
      )
    })

    it("encoding", async () => {
      await Util.assertions.encoding.succeed(schema, Fruits.Apple, "apple")
      await Util.assertions.encoding.succeed(schema, Fruits.Banana, "banana")
      await Util.assertions.encoding.succeed(schema, Fruits.Cantaloupe, 3)
    })
  })
})
