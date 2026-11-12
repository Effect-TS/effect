import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Option } from "effect"
import { Chat, ChatAdapter, ChatError, ChatHandler, ChatTest, ChatThread } from "effect/chat"

const kinds = { "@": "user", "@&": "role", "#": "channel", "!": "broadcast" } as const

const parseMention: ChatTest.ParseMention = (slice) => {
  const match = /^<(@&|@|#|!)([^<>\s]+)>$/.exec(slice)
  return match === null ? Option.none() : Option.some({ kind: kinds[match[1] as keyof typeof kinds], id: match[2] })
}

const rulesFor = (test: ChatTest.ChatTest["Service"], thread: ChatThread.ChatThread) =>
  ChatTest.conformance({
    platform: test.platform,
    thread,
    userPosts: (thread, text) => test.userPosts(thread, { text }),
    parseMention,
    failNext: test.failNext
  })

const suite = Effect.gen(function*() {
  const test = yield* ChatTest.ChatTest
  return rulesFor(test, yield* test.makeThread())
})

const ruleNames = Object.keys(ChatTest.conformance({
  platform: "test",
  thread: ChatThread.make("test", "c0"),
  userPosts: () => Effect.die("unused"),
  parseMention,
  failNext: () => Effect.void
}))

const capabilities = ChatError.Capability.literals

const runRule = (rule: string, options?: Parameters<typeof ChatTest.layer>[0]) =>
  Effect.flatMap(suite, (rules) => rules[rule]).pipe(Effect.provide(ChatTest.layer(options)))

describe("ChatTest", () => {
  describe("conformance with every capability", () => {
    for (const rule of ruleNames) {
      it.live(rule, () => runRule(rule))
    }
  })

  for (const off of capabilities) {
    describe(`conformance without ${off}`, () => {
      for (const rule of ruleNames) {
        it.live(rule, () => runRule(rule, { capabilities: capabilities.filter((c) => c !== off) }))
      }
    })
  }

  it.effect("fails unsupported/{capability} for a descriptor that leaves out a working op", () =>
    Effect.gen(function*() {
      const registry = yield* ChatAdapter.Registry
      const adapter = yield* registry.get("test")
      const listed = new Set(adapter.descriptor.capabilities)
      listed.delete("edit")
      yield* registry.register({ ...adapter, descriptor: { ...adapter.descriptor, capabilities: listed } })
      const failure = yield* Effect.flip(Effect.flatMap(suite, (rules) => rules["unsupported/edit"]))
      assert.strictEqual(failure.rule, "unsupported/edit")
      assert.strictEqual(failure.actual, "success")
    }).pipe(Effect.provide(ChatTest.layer())))

  it.effect("fails a rule whose listed capability fails with Unsupported", () =>
    Effect.gen(function*() {
      const registry = yield* ChatAdapter.Registry
      const adapter = yield* registry.get("test")
      yield* registry.register({
        ...adapter,
        edit: () =>
          Effect.fail(
            new ChatError.ChatError({
              platform: "test",
              op: "edit",
              reason: new ChatError.Unsupported({ capability: "edit" })
            })
          )
      })
      const failure = yield* Effect.flip(Effect.flatMap(suite, (rules) => rules["edit/keepsId"]))
      assert.strictEqual(failure.actual, "Unsupported(edit) for a listed capability")
    }).pipe(Effect.provide(ChatTest.layer())))

  it.effect("fails unsupported/{capability} for a listed op that fails with Unsupported", () =>
    Effect.gen(function*() {
      const registry = yield* ChatAdapter.Registry
      const adapter = yield* registry.get("test")
      const unsupported = (capability: ChatError.Capability) =>
        Effect.fail(
          new ChatError.ChatError({
            platform: "test",
            op: capability,
            reason: new ChatError.Unsupported({ capability })
          })
        )
      const listed = new Set(adapter.descriptor.capabilities)
      listed.delete("opener")
      yield* registry.register({
        ...adapter,
        descriptor: { ...adapter.descriptor, capabilities: listed },
        getThread: () => unsupported("getThread"),
        // names a capability the descriptor does leave out, but not the one probed
        getUser: () => unsupported("opener")
      })
      const rules = yield* suite
      const getThread = yield* Effect.flip(rules["unsupported/getThread"])
      assert.strictEqual(getThread.actual, "Unsupported(getThread)")
      const getUser = yield* Effect.flip(rules["unsupported/getUser"])
      assert.strictEqual(getUser.actual, "Unsupported(opener)")
    }).pipe(Effect.provide(ChatTest.layer())))

  it.live("deletes every bot message the suite posts", () =>
    Effect.gen(function*() {
      const test = yield* ChatTest.ChatTest
      const thread = yield* test.makeThread()
      yield* Effect.forEach(Object.values(rulesFor(test, thread)), (rule) => rule, { discard: true })
      const left = (yield* test.messages(thread)).filter((message) => message.author.isSelf)
      assert.deepStrictEqual(left.map((message) => message.text), [])
    }).pipe(Effect.provide(ChatTest.layer())))

  it.effect("checkMessage rejects a mention whose slice is not its token", () =>
    Effect.gen(function*() {
      const test = yield* ChatTest.ChatTest
      const thread = yield* test.makeThread()
      const event = yield* test.userPosts(thread, { text: "hi", mentionsSelf: true })
      yield* ChatTest.checkEvent(event, { platform: "test", parseMention })
      assert.strictEqual(event._tag, "MessageCreated")
      if (event._tag !== "MessageCreated") return
      const shifted = {
        ...event.message,
        mentions: event.message.mentions.map((mention) => ({ ...mention, start: mention.start + 1 }))
      }
      const exit = yield* Effect.exit(ChatTest.checkMessage(shifted, { platform: "test", parseMention }))
      assert.isTrue(Exit.isFailure(exit))
    }).pipe(Effect.provide(ChatTest.layer())))

  it.effect("ChatHandler.layer drops the bot's own messages unless deliverSelf", () =>
    Effect.gen(function*() {
      const test = yield* ChatTest.ChatTest
      const thread = yield* test.makeThread()
      const own = yield* test.userPosts(thread, { text: "own" })
      const self = own._tag === "MessageCreated"
        ? { ...own, message: { ...own.message, author: { ...own.message.author, isSelf: true } } }
        : own
      const received: Array<string> = []
      const handler = ChatHandler.layer((event) => Effect.sync(() => void received.push(event._tag)))
      yield* test.deliver(self).pipe(Effect.provide(handler))
      yield* test.deliver(own).pipe(Effect.provide(handler))
      yield* test.deliver(self).pipe(Effect.provide(ChatHandler.layer(
        (event) => Effect.sync(() => void received.push("self " + event._tag)),
        { deliverSelf: true }
      )))
      assert.deepStrictEqual(received, ["MessageCreated", "self MessageCreated"])
    }).pipe(Effect.provide(ChatTest.layer())))

  it.effect("checks lengths with the configured measure", () =>
    Effect.gen(function*() {
      const test = yield* ChatTest.ChatTest
      const chat = yield* Chat.Chat
      const thread = yield* test.makeThread()
      yield* chat.post(thread, { markdown: "x".repeat(10) })
      const exit = yield* Effect.exit(chat.post(thread, { markdown: "<".repeat(3) }))
      assert.isTrue(Exit.isFailure(exit))
      const error = Exit.isFailure(exit) ? Option.getOrUndefined(Exit.findErrorOption(exit)) : undefined
      assert.strictEqual(error?.reason._tag, "TooLarge")
    }).pipe(Effect.provide(ChatTest.layer({
      limits: { messageLength: 10 },
      measure: (markdown) => markdown.length + 3 * (markdown.split("<").length - 1)
    }))))
})
