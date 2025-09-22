import * as Chat from "@effect/ai/Chat"
import * as LanguageModel from "@effect/ai/LanguageModel"
import * as Persistence from "@effect/experimental/Persistence"
import { describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"

const PersistenceLayer = Chat.layerPersisted({
  storeId: "chat"
}).pipe(
  Layer.provideMerge(Persistence.layerMemory),
  Layer.provideMerge(Layer.scope)
)

const TestLayer = Layer.mergeAll(
  PersistenceLayer,
  Layer.effect(
    LanguageModel.LanguageModel,
    LanguageModel.make({
      generateText: () =>
        Effect.succeed([{
          type: "text",
          text: "test assistant"
        }]),
      streamText: () => Stream.empty
    })
  )
)

describe("Chat", () => {
  describe("Persisted", () => {
    it.effect("test persistence", () =>
      Effect.gen(function*() {
        const persistence = yield* Persistence.BackingPersistence
        const persistedChat = yield* Chat.Persisted

        const chat = yield* persistedChat.getOrCreate("chat-123")
        yield* chat.generateText({ prompt: "test user" })
        const history = yield* chat.history
        console.dir(history, { depth: null, colors: true })

        const store = yield* persistence.make("chat")
        const persistedHistory = yield* store.get("chat-123")
        console.dir(persistedHistory, { depth: null, colors: true })
      }).pipe(
        Effect.provide(TestLayer)
      ))
  })
})
