import { Schema } from "effect"
import { type AiError, Tool, Toolkit } from "effect/unstable/ai"
import { describe, expect, it } from "tstyche"

describe("Tool", () => {
  describe("make", () => {
    it("omitting parameters defaults to EmptyParams", () => {
      const tool = Tool.make("A")

      expect(tool).type.toBe<
        Tool.Tool<"A", {
          readonly parameters: Tool.EmptyParams
          readonly success: typeof Schema.Void
          readonly failure: typeof Schema.Never
          readonly failureMode: "error"
        }>
      >()
    })

    it("explicit EmptyParams matches omitted parameters", () => {
      const tool = Tool.make("A", { parameters: Tool.EmptyParams })

      expect(tool).type.toBe<
        Tool.Tool<"A", {
          readonly parameters: Tool.EmptyParams
          readonly success: typeof Schema.Void
          readonly failure: typeof Schema.Never
          readonly failureMode: "error"
        }>
      >()
    })
  })

  describe("HandlerResult", () => {
    it("narrows successful and failed results by isFailure", () => {
      const tool = Tool.make("A", {
        success: Schema.String,
        failure: Schema.Number,
        failureMode: "return"
      })
      const check = (result: Tool.HandlerResult<typeof tool>) => {
        if (result.isFailure) {
          expect(result.result).type.toBe<number | AiError.AiError>()
          expect(result.preliminary).type.toBe<false>()
        } else {
          expect(result.result).type.toBe<string>()
          expect(result.preliminary).type.toBe<boolean>()
        }
      }
      void check
    })
  })

  describe("makeWithHandler", () => {
    it("preserves the toolkit across encoded and decoded handlers", () => {
      const tool = Tool.make("A", {
        parameters: Schema.Struct({ value: Schema.Number }),
        success: Schema.String
      })
      type Tools = { readonly A: typeof tool }
      const compose = (
        tools: Tools,
        handle: Toolkit.WithHandler<Tools>["handle"],
        execute: Toolkit.DecodedHandle<Tools>
      ) => Toolkit.makeWithHandler(tools, handle, execute)

      expect<ReturnType<typeof compose>>().type.toBe<Toolkit.WithHandler<Tools>>()
    })
  })
})
