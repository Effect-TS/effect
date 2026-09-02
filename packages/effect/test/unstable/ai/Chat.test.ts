import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, Layer, Predicate, Ref, Schema } from "effect"
import { TestClock } from "effect/testing"
import { Chat, IdGenerator, Prompt } from "effect/unstable/ai"
import { Persistence } from "effect/unstable/persistence"
import * as TestUtils from "./utils.ts"

const withConstantIdGenerator = (id: string) =>
  Effect.provideService(IdGenerator.IdGenerator, {
    generateId: () => Effect.succeed(id)
  })

const decodeMessages = Schema.decodeUnknownEffect(Schema.Array(Prompt.Message))

/** Reads a chat back out of whichever `ChatStore` is provided. */
const storedHistory = (chatId: string) =>
  Effect.gen(function*() {
    const store = yield* Chat.ChatStore
    const messages = yield* store.read({ storeId: "chat", chatId, from: 0, limit: undefined })
    return Predicate.isUndefined(messages)
      ? undefined
      : Prompt.fromMessages(yield* decodeMessages(messages))
  })

const stores = [
  ["memory", Chat.layerStoreMemory],
  ["backing", Layer.provide(Chat.layerStoreBacking, Persistence.layerBackingMemory)]
] as const

for (const [name, StoreLayer] of stores) {
  const PersistenceLayer = Layer.provideMerge(
    Chat.layerPersisted({ storeId: "chat" }),
    StoreLayer
  )

  describe(`Chat (${name} store)`, () => {
    it.effect("should persist chat history to the store", () =>
      Effect.gen(function*() {
        const chatId = "1"
        const persistence = yield* Chat.Persistence
        const chat = yield* persistence.getOrCreate(chatId)

        yield* chat.generateText({ prompt: "test user message" }).pipe(
          TestUtils.withLanguageModel({
            generateText: [{
              type: "text",
              text: "test assistant message"
            }]
          })
        )

        const chatHistory = yield* Ref.get(chat.history)
        const options = { [Chat.Persistence.key]: { messageId: "msg_abc123" } }
        const expectedHistory = Prompt.make([
          { role: "user", content: [{ type: "text", text: "test user message" }], options },
          { role: "assistant", content: [{ type: "text", text: "test assistant message" }], options }
        ])

        assert.deepStrictEqual(chatHistory, expectedHistory)
        assert.deepStrictEqual(yield* storedHistory(chatId), expectedHistory)
      }).pipe(withConstantIdGenerator("msg_abc123"), Effect.provide(PersistenceLayer)))

    it.effect("should respect the specified time to live", () =>
      Effect.gen(function*() {
        const chatId = "1"
        const persistence = yield* Chat.Persistence
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

        const options = { [Chat.Persistence.key]: { messageId: "msg_abc123" } }
        const expectedHistory = Prompt.make([
          { role: "user", content: [{ type: "text", text: "test user message" }], options },
          { role: "assistant", content: [{ type: "text", text: "test assistant message" }], options }
        ])

        assert.deepStrictEqual(yield* storedHistory(chatId), expectedHistory)

        // Simulate chat expiration
        yield* TestClock.adjust("30 days")

        assert.isUndefined(yield* storedHistory(chatId))
      }).pipe(withConstantIdGenerator("msg_abc123"), Effect.provide(PersistenceLayer)))

    it.effect("should prefer the message identifier of the most recent assistant message", () =>
      Effect.gen(function*() {
        const chatId = "2"
        const persistence = yield* Chat.Persistence
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

        const expectedHistory = Prompt.concat(history, [
          { role: "user", content: "second user message", options },
          { role: "assistant", content: "second assistant message", options }
        ])

        assert.deepStrictEqual(yield* storedHistory(chatId), expectedHistory)
      }).pipe(withConstantIdGenerator("msg_abc123"), Effect.provide(PersistenceLayer)))

    it.effect("should persist messages that were rewritten rather than appended", () =>
      Effect.gen(function*() {
        const chatId = "1"
        const persistence = yield* Chat.Persistence
        const chat = yield* persistence.getOrCreate(chatId)

        yield* chat.generateText({ prompt: "test user message" }).pipe(
          TestUtils.withLanguageModel({
            generateText: [{
              type: "text",
              text: "test assistant message"
            }]
          })
        )

        // Replace a message that has already been persisted, the shape a caller
        // summarizing or redacting history produces, and save without appending
        const options = { [Chat.Persistence.key]: { messageId: "msg_abc123" } }
        const rewritten = Prompt.make([
          { role: "user", content: [{ type: "text", text: "rewritten user message" }], options },
          { role: "assistant", content: [{ type: "text", text: "test assistant message" }], options }
        ])
        yield* Ref.set(chat.history, rewritten)
        yield* chat.save

        assert.deepStrictEqual(yield* storedHistory(chatId), rewritten)
      }).pipe(withConstantIdGenerator("msg_abc123"), Effect.provide(PersistenceLayer)))

    it.effect("should shorten a chat that was truncated", () =>
      Effect.gen(function*() {
        const chatId = "1"
        const persistence = yield* Chat.Persistence
        const chat = yield* persistence.getOrCreate(chatId)

        yield* chat.generateText({ prompt: "test user message" }).pipe(
          TestUtils.withLanguageModel({
            generateText: [{ type: "text", text: "test assistant message" }]
          })
        )

        const options = { [Chat.Persistence.key]: { messageId: "msg_abc123" } }
        const truncated = Prompt.make([
          { role: "user", content: [{ type: "text", text: "only message" }], options }
        ])
        yield* Ref.set(chat.history, truncated)
        yield* chat.save

        assert.deepStrictEqual(yield* storedHistory(chatId), truncated)
      }).pipe(withConstantIdGenerator("msg_abc123"), Effect.provide(PersistenceLayer)))

    it.effect("should reload a chat from the store", () =>
      Effect.gen(function*() {
        const chatId = "1"
        const persistence = yield* Chat.Persistence
        const chat = yield* persistence.getOrCreate(chatId)

        yield* chat.generateText({ prompt: "first user message" }).pipe(
          TestUtils.withLanguageModel({
            generateText: [{ type: "text", text: "first assistant message" }]
          })
        )

        const reloaded = yield* persistence.get(chatId)
        yield* reloaded.generateText({ prompt: "second user message" }).pipe(
          TestUtils.withLanguageModel({
            generateText: [{ type: "text", text: "second assistant message" }]
          })
        )

        const history = yield* Ref.get(reloaded.history)
        assert.strictEqual(history.content.length, 4)
        assert.deepStrictEqual(yield* storedHistory(chatId), history)
      }).pipe(withConstantIdGenerator("msg_abc123"), Effect.provide(PersistenceLayer)))

    it.effect("should raise an error when retrieving a chat that does not exist", () =>
      Effect.gen(function*() {
        const persistence = yield* Chat.Persistence

        const result = yield* Effect.flip(persistence.get("chat-321"))

        assert.instanceOf(result, Chat.ChatNotFoundError)
        assert.strictEqual(result.chatId, "chat-321")
      }).pipe(Effect.provide(PersistenceLayer)))
  })

  describe(`ChatStore (${name})`, () => {
    const write = (chatId: string, from: number, messages: ReadonlyArray<string>) =>
      Effect.gen(function*() {
        const store = yield* Chat.ChatStore
        yield* store.write({
          storeId: "chat",
          chatId,
          from,
          messages: messages.map((text) => ({ role: "user", content: [{ type: "text", text }] })),
          timeToLive: undefined
        })
      })

    const texts = (messages: ReadonlyArray<unknown> | undefined) =>
      messages?.map((message) => (message as { content: Array<{ text: string }> }).content[0].text)

    it.effect("appends, reads ranges, and reads backwards", () =>
      Effect.gen(function*() {
        const store = yield* Chat.ChatStore
        yield* write("a", 0, ["one", "two"])
        yield* write("a", 2, ["three"])

        const all = yield* store.read({ storeId: "chat", chatId: "a", from: 0, limit: undefined })
        assert.deepStrictEqual(texts(all), ["one", "two", "three"])

        const range = yield* store.read({ storeId: "chat", chatId: "a", from: 1, limit: 1 })
        assert.deepStrictEqual(texts(range), ["two"])

        const last = yield* store.readBackwards({ storeId: "chat", chatId: "a", limit: 2 })
        assert.deepStrictEqual(texts(last), ["two", "three"])
      }).pipe(Effect.provide(StoreLayer)))

    it.effect("replaces from an earlier index", () =>
      Effect.gen(function*() {
        const store = yield* Chat.ChatStore
        yield* write("a", 0, ["one", "two", "three"])
        yield* write("a", 1, ["rewritten"])

        const all = yield* store.read({ storeId: "chat", chatId: "a", from: 0, limit: undefined })
        assert.deepStrictEqual(texts(all), ["one", "rewritten"])
      }).pipe(Effect.provide(StoreLayer)))

    it.effect("refuses a write that would leave a hole", () =>
      Effect.gen(function*() {
        yield* write("a", 0, ["one"])

        const error = yield* Effect.flip(write("a", 5, ["five"]))

        assert.include(error.message, "from index 5")
      }).pipe(Effect.provide(StoreLayer)))

    it.effect("distinguishes an empty chat from a missing one", () =>
      Effect.gen(function*() {
        const store = yield* Chat.ChatStore
        yield* write("a", 0, [])

        assert.deepStrictEqual(
          yield* store.read({ storeId: "chat", chatId: "a", from: 0, limit: undefined }),
          []
        )
        assert.isUndefined(
          yield* store.read({ storeId: "chat", chatId: "missing", from: 0, limit: undefined })
        )
      }).pipe(Effect.provide(StoreLayer)))

    it.effect("lists chats most recently written first", () =>
      Effect.gen(function*() {
        const store = yield* Chat.ChatStore
        yield* write("a", 0, ["one"])
        yield* TestClock.adjust("1 second")
        yield* write("b", 0, ["one", "two"])

        const listed = yield* store.list({ storeId: "chat", after: undefined, limit: 10 })
        assert.deepStrictEqual(listed.map((summary) => summary.chatId), ["b", "a"])
        assert.deepStrictEqual(listed.map((summary) => summary.messages), [2, 1])

        const page = yield* store.list({ storeId: "chat", after: "b", limit: 10 })
        assert.deepStrictEqual(page.map((summary) => summary.chatId), ["a"])
      }).pipe(Effect.provide(StoreLayer)))

    it.effect("removes a chat and cleans up stale ones", () =>
      Effect.gen(function*() {
        const store = yield* Chat.ChatStore
        yield* write("a", 0, ["one"])
        yield* write("b", 0, ["one"])

        yield* store.remove({ storeId: "chat", chatId: "a" })
        assert.isUndefined(yield* store.read({ storeId: "chat", chatId: "a", from: 0, limit: undefined }))

        yield* TestClock.adjust("2 hours")
        yield* store.cleanup({ storeId: "chat", olderThan: Duration.hours(1) })

        assert.isUndefined(yield* store.read({ storeId: "chat", chatId: "b", from: 0, limit: undefined }))
        assert.deepStrictEqual(yield* store.list({ storeId: "chat", after: undefined, limit: 10 }), [])
      }).pipe(Effect.provide(StoreLayer)))
  })
}
