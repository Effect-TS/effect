import * as Prompt from "@effect/ai/Prompt"
import * as Response from "@effect/ai/Response"
import { assert, describe, it } from "@effect/vitest"

describe("Prompt", () => {
  describe("fromResponseParts", () => {
    it("should handle interspersed text and response deltas", () => {
      const parts = [
        Response.makePart("text-start", { id: "1" }),
        Response.makePart("text-delta", { id: "1", delta: "Hello" }),
        Response.makePart("text-delta", { id: "1", delta: ", " }),
        Response.makePart("text-delta", { id: "1", delta: "World!" }),
        Response.makePart("text-end", { id: "1" }),
        Response.makePart("reasoning-start", { id: "2" }),
        Response.makePart("reasoning-delta", { id: "2", delta: "I " }),
        Response.makePart("reasoning-delta", { id: "2", delta: "am " }),
        Response.makePart("reasoning-delta", { id: "2", delta: "thinking" }),
        Response.makePart("reasoning-end", { id: "2" })
      ]
      const prompt = Prompt.fromResponseParts(parts)
      const expected = Prompt.make([
        {
          role: "assistant",
          content: [
            { type: "text", text: "Hello, World!" },
            { type: "reasoning", text: "I am thinking" }
          ]
        }
      ])
      assert.deepStrictEqual(prompt, expected)
    })
  })

  describe("merge", () => {
    it("should sequentially combine the content of two Prompts", () => {
      const leftMessages = [
        Prompt.makeMessage("user", {
          content: [Prompt.makePart("text", { text: "a" })]
        }),
        Prompt.makeMessage("assistant", {
          content: [Prompt.makePart("text", { text: "b" })]
        })
      ]
      const rightMessages = [
        Prompt.makeMessage("user", {
          content: [Prompt.makePart("text", { text: "c" })]
        }),
        Prompt.makeMessage("assistant", {
          content: [Prompt.makePart("text", { text: "d" })]
        })
      ]
      const left = Prompt.fromMessages(leftMessages)
      const right = Prompt.fromMessages(rightMessages)
      const merged = Prompt.merge(left, right)
      assert.deepStrictEqual(
        merged,
        Prompt.fromMessages([
          ...leftMessages,
          ...rightMessages
        ])
      )
    })

    it("should return an empty prompt if there are no messages", () => {
      const merged = Prompt.merge(Prompt.empty, [])
      assert.deepStrictEqual(merged, Prompt.empty)
    })

    it("should handle an empty prompt", () => {
      const prompt = Prompt.empty
      const merged = Prompt.merge(prompt, [
        { role: "user", content: "a" },
        { role: "assistant", content: "b" }
      ])
      assert.deepStrictEqual(
        merged,
        Prompt.make([
          Prompt.makeMessage("user", {
            content: [Prompt.makePart("text", { text: "a" })]
          }),
          Prompt.makeMessage("assistant", {
            content: [Prompt.makePart("text", { text: "b" })]
          })
        ])
      )
    })

    it("should handle empty prompt input", () => {
      const messages = [
        Prompt.makeMessage("user", {
          content: [Prompt.makePart("text", { text: "a" })]
        }),
        Prompt.makeMessage("assistant", {
          content: [Prompt.makePart("text", { text: "b" })]
        })
      ]
      const prompt = Prompt.fromMessages(messages)
      const merged = Prompt.merge(prompt, [])
      assert.deepStrictEqual(merged, prompt)
    })
  })

  describe("appendSystem", () => {
    it("should append text to existing system message", () => {
      const prompt = Prompt.make([
        { role: "system", content: "You are an expert in programming." },
        { role: "user", content: "Hello, world!" }
      ])

      const result = Prompt.appendSystem(prompt, " You are a helpful assistant.")

      assert.deepStrictEqual(
        result.content[0],
        Prompt.makeMessage("system", {
          content: "You are an expert in programming. You are a helpful assistant."
        })
      )
    })

    it("should create a new system message if none exists", () => {
      const prompt = Prompt.make([
        { role: "user", content: "Hello, world!" }
      ])

      const result = Prompt.appendSystem(prompt, "You are a helpful assistant.")

      assert.deepStrictEqual(
        result.content[0],
        Prompt.makeMessage("system", {
          content: "You are a helpful assistant."
        })
      )
    })

    it("should work with empty prompt", () => {
      const prompt = Prompt.empty

      const result = Prompt.appendSystem(prompt, "You are a helpful assistant.")

      assert.deepStrictEqual(
        result.content[0],
        Prompt.makeMessage("system", { content: "You are a helpful assistant." })
      )
    })
  })

  describe("prependSystem", () => {
    it("should prepend text to existing system message", () => {
      const prompt = Prompt.make([
        {
          role: "system",
          content: "You are an expert in programming."
        },
        {
          role: "user",
          content: "Hello, world!"
        }
      ])

      const result = Prompt.prependSystem(prompt, "You are a helpful assistant. ")

      assert.deepStrictEqual(
        result.content[0],
        Prompt.makeMessage("system", {
          content: "You are a helpful assistant. You are an expert in programming."
        })
      )
    })

    it("should create a new system message if none exists", () => {
      const prompt = Prompt.make([
        {
          role: "user",
          content: "Hello, world!"
        }
      ])

      const result = Prompt.prependSystem(prompt, "You are a helpful assistant.")

      assert.deepStrictEqual(
        result.content[0],
        Prompt.makeMessage("system", {
          content: "You are a helpful assistant."
        })
      )
    })

    it("should work with empty prompt", () => {
      const prompt = Prompt.empty

      const result = Prompt.prependSystem(prompt, "You are a helpful assistant.")

      assert.deepStrictEqual(
        result.content[0],
        Prompt.makeMessage("system", { content: "You are a helpful assistant." })
      )
    })
  })
})
