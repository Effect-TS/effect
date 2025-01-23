import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

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
      expect(err).toEqual(new Error("message"))
    })

    it("an object with a message and a name", () => {
      const err = S.decodeUnknownSync(S.Defect)({ message: "message", name: "name" })
      expect(err).toEqual(new Error("message"))
      expect(err instanceof Error).toBe(true)
      expect((err as Error).name).toEqual("name")
    })

    it("an object with a message and a stack", () => {
      const err = S.decodeUnknownSync(S.Defect)({ message: "message", stack: "stack" })
      expect(err).toEqual(new Error("message"))
      expect(err instanceof Error).toBe(true)
      expect((err as Error).stack).toEqual("stack")
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
