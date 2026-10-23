import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import { AgUiSchema } from "effect/ai"

const decodeInput = Schema.decodeUnknownExit(AgUiSchema.RunAgentInput)

const input = (messages: ReadonlyArray<unknown>) => ({ threadId: "thread-1", runId: "run-1", messages })

describe("AgUiSchema", () => {
  describe("RunAgentInput", () => {
    // AG-UI requires consumers to strip union members from newer protocol
    // versions instead of rejecting the whole input
    it("drops unrecognised union members", () => {
      const exit = decodeInput(input([
        { id: "1", role: "narrator", content: "Once upon a time" },
        {
          id: "2",
          role: "user",
          content: [
            { type: "text", text: "Hi" },
            { type: "hologram", uri: "holo://1" },
            { type: "image", source: { type: "ipfs", value: "Qm123" } }
          ]
        }
      ]))

      assert.strictEqual(exit._tag, "Success")
      assert.deepStrictEqual(
        exit._tag === "Success" ? exit.value.messages : undefined,
        [{ id: "2", role: "user", content: [{ type: "text", text: "Hi" }] }]
      )
    })

    it("rejects a malformed recognised union member", () => {
      const exit = decodeInput(input([{ id: "1", role: "user", content: [{ type: "text" }] }]))

      assert.strictEqual(exit._tag, "Failure")
    })
  })
})
