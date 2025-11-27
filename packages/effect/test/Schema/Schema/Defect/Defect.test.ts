import { describe, it } from "@effect/vitest"
import { assertInstanceOf, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Defect", () => {
  describe("decoding", () => {
    it("a string", async () => {
      await Util.assertions.decoding.succeed(
        S.Defect,
        "error",
        "error"
      )
    })

    it("an object with a message", () => {
      const err = S.decodeUnknownSync(S.Defect)({ message: "message" })
      deepStrictEqual(err, new Error("message", { cause: { message: "message" } }))
    })

    it("a null object with a message", async () => {
      const defect = Object.create(null)
      defect.message = "message"

      const err = S.decodeUnknownSync(S.Defect)(defect)
      deepStrictEqual(err, new Error("message", { cause: defect }))
    })

    it("an object with a message and a name", () => {
      const err = S.decodeUnknownSync(S.Defect)({ message: "message", name: "name" })
      assertInstanceOf(err, Error)
      strictEqual(err.message, "message")
      strictEqual(err.name, "name")
    })

    it("an object with a message and a stack", () => {
      const err = S.decodeUnknownSync(S.Defect)({ message: "message", stack: "stack" })
      assertInstanceOf(err, Error)
      strictEqual(err.message, "message")
      strictEqual(err.stack, "stack")
    })

    it("a null object without a message", async () => {
      const defect = Object.create(null)
      defect.a = 1

      await Util.assertions.decoding.succeed(
        S.Defect,
        defect,
        "{\"a\":1}"
      )
    })
  })

  describe("encoding", () => {
    it("a string", async () => {
      await Util.assertions.encoding.succeed(
        S.Defect,
        "error",
        "error"
      )
    })

    it("an object", async () => {
      await Util.assertions.encoding.succeed(
        S.Defect,
        { a: 1 },
        "{\"a\":1}"
      )
    })

    it("a null object", async () => {
      const defect = Object.create(null)
      defect.a = 1

      await Util.assertions.encoding.succeed(
        S.Defect,
        defect,
        "{\"a\":1}"
      )
    })

    it("an Error", async () => {
      await Util.assertions.encoding.succeed(
        S.Defect,
        new Error("message"),
        {
          "message": "message",
          "name": "Error"
        }
      )
    })
  })
})
