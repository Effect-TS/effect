import * as Chat from "@effect/ai/Chat"
import * as Prompt from "@effect/ai/Prompt"
import * as Persistence from "@effect/experimental/Persistence"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as TestUtils from "./utilities.js"

const PersistenceLayer = Layer.provideMerge(
  Chat.layerPersisted({ storeId: "chat" }),
  Persistence.layerMemory
)

describe("Chat", () => {
  it.layer(PersistenceLayer)("Persisted", (it) => {
    it.scoped("should persist chat history to the backing persistence store", () =>
      Effect.gen(function*() {
        const backing = yield* Persistence.BackingPersistence
        const persistence = yield* Chat.Persistence

        const chat = yield* persistence.getOrCreate("chat-123")
        const store = yield* backing.make("chat")

        yield* chat.generateText({ prompt: "test user message" }).pipe(
          TestUtils.withLanguageModel({
            generateText: [{
              type: "text",
              text: "test assistant message"
            }]
          })
        )

        const chatHistory = yield* chat.history
        const storeHistory = yield* store.get("chat-123").pipe(
          Effect.flatten,
          Effect.flatMap(Schema.decodeUnknown(Prompt.FromJson))
        )
        const expectedHistory = Prompt.make([
          { role: "user", content: [{ type: "text", text: "test user message" }] },
          { role: "assistant", content: [{ type: "text", text: "test assistant message" }] }
        ])

        assert.deepStrictEqual(chatHistory, expectedHistory)
        assert.deepStrictEqual(chatHistory, storeHistory)
      }))

    it.scoped("should raise an error when retrieving a chat that does not exist", () =>
      Effect.gen(function*() {
        const persistence = yield* Chat.Persistence

        const result = yield* Effect.flip(persistence.get("chat-321"))

        assert.instanceOf(result, Chat.ChatNotFoundError)
        assert.strictEqual(result.chatId, "chat-321")
      }).pipe(TestUtils.withLanguageModel({
        generateText: [{
          type: "text",
          text: "test assistant message"
        }]
      })))
  })
})
