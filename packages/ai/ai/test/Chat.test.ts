import * as Chat from "@effect/ai/Chat"
import * as IdGenerator from "@effect/ai/IdGenerator"
import * as Prompt from "@effect/ai/Prompt"
import * as Persistence from "@effect/experimental/Persistence"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import * as Schema from "effect/Schema"
import * as TestClock from "effect/TestClock"
import * as TestUtils from "./utilities.js"

const withConstantIdGenerator = (id: string) =>
  Effect.provideService(IdGenerator.IdGenerator, {
    generateId: () => Effect.succeed(id)
  })

const PersistenceLayer = Layer.provideMerge(
  Chat.layerPersisted({ storeId: "chat" }),
  Persistence.layerMemory
)

describe("Chat", () => {
  it.scoped("should persist chat history to the backing persistence store", () =>
    Effect.gen(function*() {
      const storeId = "chat"
      const chatId = "1"

      const backing = yield* Persistence.BackingPersistence
      const persistence = yield* Chat.Persistence

      const store = yield* backing.make(storeId)
      const chat = yield* persistence.getOrCreate(chatId)

      yield* chat.generateText({ prompt: "test user message" }).pipe(
        TestUtils.withLanguageModel({
          generateText: [{
            type: "text",
            text: "test assistant message"
          }]
        })
      )

      const chatHistory = yield* chat.history
      const storeHistory = yield* store.get(chatId).pipe(
        Effect.flatten,
        Effect.flatMap(Schema.decodeUnknown(Prompt.FromJson))
      )
      const options = { [Chat.Persistence.key]: { messageId: "msg_abc123" } }
      const expectedHistory = Prompt.make([
        { role: "user", content: [{ type: "text", text: "test user message" }], options },
        { role: "assistant", content: [{ type: "text", text: "test assistant message" }], options }
      ])

      assert.deepStrictEqual(chatHistory, expectedHistory)
      assert.deepStrictEqual(chatHistory, storeHistory)
    }).pipe(withConstantIdGenerator("msg_abc123"), Effect.provide(PersistenceLayer)))

  it.scoped("should respect the specified time to live", () =>
    Effect.gen(function*() {
      const storeId = "chat"
      const chatId = "1"

      const backing = yield* Persistence.BackingPersistence
      const persistence = yield* Chat.Persistence

      const store = yield* backing.make(storeId)
      const chat = yield* persistence.getOrCreate(chatId, {
        timeToLive: "30 days"
      })

      yield* chat.generateText({ prompt: "test user message" }).pipe(
        TestUtils.withLanguageModel({
          generateText: [{
            type: "text",
            text: "test assistant message"
          }]
        })
      )

      const chatHistory = yield* store.get(chatId).pipe(
        Effect.flatten,
        Effect.flatMap(Schema.decodeUnknown(Prompt.FromJson))
      )
      const options = { [Chat.Persistence.key]: { messageId: "msg_abc123" } }
      const expectedHistory = Prompt.make([
        { role: "user", content: [{ type: "text", text: "test user message" }], options },
        { role: "assistant", content: [{ type: "text", text: "test assistant message" }], options }
      ])

      assert.deepStrictEqual(chatHistory, expectedHistory)

      // Simulate chat expiration
      yield* TestClock.adjust("30 days")

      const afterExpiration = yield* store.get(chatId)

      assert.deepStrictEqual(afterExpiration, Option.none())
    }).pipe(withConstantIdGenerator("msg_abc123"), Effect.provide(PersistenceLayer)))

  it.scoped("should prefer the message identifier of the most recent assistant message", () =>
    Effect.gen(function*() {
      const storeId = "chat"
      const chatId = "2"

      const backing = yield* Persistence.BackingPersistence
      const persistence = yield* Chat.Persistence

      const store = yield* backing.make(storeId)
      const chat = yield* persistence.getOrCreate(chatId)

      const options = { [Chat.Persistence.key]: { messageId: "msg_123abc" } }
      const history = Prompt.make([
        { role: "user", content: "first user message", options },
        { role: "assistant", content: "first assistant message", options }
      ])
      yield* Ref.set(chat.history, history)
      yield* chat.save

      yield* chat.generateText({ prompt: "second user message" }).pipe(
        TestUtils.withLanguageModel({
          generateText: [{
            type: "text",
            text: "second assistant message"
          }]
        })
      )

      const storeHistory = yield* store.get(chatId).pipe(
        Effect.flatten,
        Effect.flatMap(Schema.decodeUnknown(Prompt.FromJson))
      )
      const expectedHistory = Prompt.merge(history, [
        { role: "user", content: "second user message", options },
        { role: "assistant", content: "second assistant message", options }
      ])

      assert.deepStrictEqual(storeHistory, expectedHistory)
    }).pipe(withConstantIdGenerator("msg_abc123"), Effect.provide(PersistenceLayer)))

  it.scoped("should raise an error when retrieving a chat that does not exist", () =>
    Effect.gen(function*() {
      const persistence = yield* Chat.Persistence

      const result = yield* Effect.flip(persistence.get("chat-321"))

      assert.instanceOf(result, Chat.ChatNotFoundError)
      assert.strictEqual(result.chatId, "chat-321")
    }).pipe(Effect.provide(PersistenceLayer)))
})
