import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Option, Schema } from "effect"
import {
  Chat,
  ChatAdapter,
  ChatError,
  ChatHandler,
  ChatInteraction,
  ChatMessage,
  ChatTest,
  ChatThread,
  ChatUi
} from "effect/chat"

const kinds = { "@": "user", "@&": "role", "#": "channel", "!": "broadcast" } as const

const parseMention: ChatTest.ParseMention = (slice) => {
  const match = /^<(@&|@|#|!)([^<>\s]+)>$/.exec(slice)
  return match === null ? Option.none() : Option.some({ kind: kinds[match[1] as keyof typeof kinds], id: match[2] })
}

/** The conformance click hook, over the fake's own entry. */
const interactionsFor = (test: ChatTest.ChatTest["Service"]): ChatTest.Interactions => {
  let open: {
    readonly click: ChatInteraction.ButtonClicked | ChatInteraction.SelectChanged
    readonly opened: ChatInteraction.OpenModal
  } | undefined
  return {
    click: Effect.fnUntraced(function*(messageId, id, options) {
      const click = yield* test.click(messageId, id, options)
      const handler = yield* ChatInteraction.Handler
      let refused = false
      const reply = yield* test.interact(click).pipe(
        Effect.provideService(ChatInteraction.Handler, {
          ...handler,
          refused: (event, error) =>
            Effect.andThen(Effect.sync(() => void (refused = true)), handler.refused(event, error))
        })
      )
      open = reply._tag === "OpenModal" && !refused ? { click, opened: reply } : undefined
    }),
    submit: Effect.fnUntraced(function*(values) {
      if (open === undefined) return
      const reply = yield* test.interact(yield* test.submit(open.click, open.opened, values))
      if (reply._tag !== "Errors") open = undefined
    })
  }
}

const rulesFor = (test: ChatTest.ChatTest["Service"], thread: ChatThread.ChatThread) =>
  ChatTest.conformance({
    platform: test.platform,
    thread,
    userPosts: (thread, text) => test.userPosts(thread, { text }),
    parseMention,
    refuseFiles: test.refuseFiles,
    failNext: test.failNext,
    interactions: interactionsFor(test)
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
  refuseFiles: () => Effect.void,
  failNext: () => Effect.void,
  interactions: { click: () => Effect.void, submit: () => Effect.void }
}))

const capabilities = ChatError.Capability.literals

const runRule = (rule: string, options?: Parameters<typeof ChatTest.layer>[0]) =>
  Effect.flatMap(suite, (rules) => rules[rule]).pipe(Effect.provide(ChatTest.layer(options)))

describe("ChatTest", () => {
  it("omits post/refusedFile without its hook", () => {
    const rules = ChatTest.conformance({
      platform: "test",
      thread: ChatThread.make("test", "c0"),
      userPosts: () => Effect.die("unused"),
      parseMention
    })
    assert.isUndefined(rules["post/refusedFile"])
  })

  it.effect("refuseFiles counts only posts with files and leaves nothing posted", () =>
    Effect.gen(function*() {
      const test = yield* ChatTest.ChatTest
      const chat = yield* Chat.Chat
      const thread = yield* test.makeThread()
      const files = [{ name: "a.txt", contentType: "text/plain", content: new Uint8Array([1]) }]
      yield* test.refuseFiles({ times: 2 })
      yield* chat.post(thread, { markdown: "text only" })
      for (let i = 0; i < 2; i++) {
        const error = yield* Effect.flip(chat.post(thread, { markdown: "refused", files }))
        assert.strictEqual(error.reason.retry, "denied")
        assert.strictEqual(error.reason.detail, ChatError.fileRefused)
      }
      assert.deepStrictEqual((yield* test.messages(thread)).map((message) => message.text), ["text only"])
      yield* chat.post(thread, { markdown: "accepted", files })
      assert.strictEqual((yield* test.messages(thread)).length, 2)
    }).pipe(Effect.provide(ChatTest.layer())))

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

  it.effect("post/refusedFile rejects Unsupported for a listed capability", () =>
    Effect.gen(function*() {
      const test = yield* ChatTest.ChatTest
      const thread = yield* test.makeThread()
      const rules = ChatTest.conformance({
        platform: test.platform,
        thread,
        parseMention,
        userPosts: (thread, text) => test.userPosts(thread, { text }),
        refuseFiles: () =>
          test.failNext(
            "post",
            new ChatError.Unsupported({
              capability: "files",
              detail: ChatError.fileRefused
            })
          )
      })
      const error = yield* Effect.flip(rules["post/refusedFile"])
      assert.strictEqual(error.rule, "post/refusedFile")
      assert.strictEqual(error.actual, "Unsupported(files) for a listed capability")
    }).pipe(Effect.provide(ChatTest.layer())))

  it.effect("post/refusedFile cleans up a refused write that landed", () =>
    Effect.gen(function*() {
      const test = yield* ChatTest.ChatTest
      const thread = yield* test.makeThread()
      const rules = ChatTest.conformance({
        platform: test.platform,
        thread,
        parseMention,
        userPosts: (thread, text) => test.userPosts(thread, { text }),
        refuseFiles: () =>
          test.failNext(
            "post",
            new ChatError.Forbidden({
              detail: ChatError.fileRefused
            }),
            { landed: true }
          )
      })
      const error = yield* Effect.flip(rules["post/refusedFile"])
      assert.strictEqual(error.expected, "no new message")
      assert.deepStrictEqual(yield* test.messages(thread), [])
    }).pipe(Effect.provide(ChatTest.layer())))

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

  describe("buttons and modals", () => {
    const Approve = ChatInteraction.button("approve", { label: "Approve", value: Schema.Number })
    const Pick = ChatInteraction.select("pick", {})
    const Ask = ChatInteraction.modal("ask", {
      title: "Ask",
      metadata: Schema.String,
      fields: { answer: ChatInteraction.textInput({ label: "Answer", optional: true }) }
    })
    const replying = (reply: ChatInteraction.ClickReply, refused: Array<ChatError.ChatError>) =>
      ChatInteraction.Handler.of({
        click: () => Effect.succeed(reply),
        submit: () => Effect.succeed(ChatInteraction.close),
        refused: (_, error) => Effect.sync(() => void refused.push(error))
      })

    it("lists the hook rules only with the hook, and unsupported/buttons always", () => {
      const withoutHook = Object.keys(ChatTest.conformance({
        platform: "test",
        thread: ChatThread.make("test", "c0"),
        userPosts: () => Effect.die("unused"),
        parseMention
      }))
      for (
        const name of ["unsupported/buttons", "unsupported/selects", "actions/tooMany", "descriptor/measureFitsActions"]
      ) {
        assert.include(withoutHook, name)
      }
      for (const name of ["actions/valueRoundTrips", "modal/origin", "unsupported/modals"]) {
        assert.notInclude(withoutHook, name)
        assert.include(ruleNames, name)
      }
      assert.notInclude(ruleNames, "unsupported/modalErrors")
    })

    it.effect("fails Unsupported for an element whose capability is off", () =>
      Effect.gen(function*() {
        const thread = yield* Effect.flatMap(ChatTest.ChatTest, (test) => test.makeThread())
        const chat = yield* Chat.Chat
        const button = yield* Effect.flip(chat.post(thread, { markdown: "a", actions: [Approve.of(1)] }))
        assert.strictEqual(button.reason._tag === "Unsupported" && button.reason.capability, "buttons")
        const selectError = yield* Effect.flip(chat.post(thread, {
          markdown: "a",
          actions: [Pick.of({ options: [{ label: "A", value: "a" }] })]
        }))
        assert.strictEqual(selectError.reason._tag === "Unsupported" && selectError.reason.capability, "selects")
      }).pipe(Effect.provide(ChatTest.layer({
        capabilities: capabilities.filter((c) => c !== "buttons" && c !== "selects")
      }))))

    it.effect("checks actionsPerMessage and actionDataLength in code points", () =>
      Effect.gen(function*() {
        const test = yield* ChatTest.ChatTest
        const chat = yield* Chat.Chat
        const thread = yield* test.makeThread()
        const many = yield* Effect.flip(chat.post(thread, {
          markdown: "a",
          actions: [Approve.of(1), Approve.of(2), Approve.of(3)]
        }))
        assert.strictEqual(many.reason._tag, "TooLarge")
        // "approve" is 7 and "12" is 2: 9 code points fit, 10 do not.
        yield* chat.post(thread, { markdown: "a", actions: [Approve.of(12)] })
        const long = yield* Effect.flip(chat.post(thread, { markdown: "a", actions: [Approve.of(123)] }))
        assert.strictEqual(long.reason._tag, "TooLarge")
        assert.strictEqual((yield* test.messages(thread)).length, 1)
      }).pipe(Effect.provide(ChatTest.layer({ limits: { actionsPerMessage: 2, actionDataLength: 9 } }))))

    it.effect("click builds the event from what was posted or edited", () =>
      Effect.gen(function*() {
        const test = yield* ChatTest.ChatTest
        const chat = yield* Chat.Chat
        const thread = yield* test.makeThread()
        const posted = yield* chat.post(thread, {
          markdown: "a",
          actions: [
            Approve.of(7),
            Pick.of({ options: [{ label: "A", value: "a" }, { label: "B", value: "b" }] }),
            ChatUi.linkButton({ label: "Docs", url: "https://effect.website" })
          ]
        })
        const click = yield* test.click(posted.id, "approve", { userId: "u2" })
        assert.strictEqual(click._tag, "ButtonClicked")
        assert.strictEqual(click.value, "7")
        assert.strictEqual(click.userId, "u2")
        assert.strictEqual(click.messageId, posted.id)
        yield* ChatTest.checkInteraction(click, { platform: "test" })
        const first = yield* test.click(posted.id, "pick")
        assert.strictEqual(first._tag === "SelectChanged" && first.value, "a")
        const second = yield* test.click(posted.id, "pick", { option: "b" })
        assert.strictEqual(second._tag === "SelectChanged" && second.value, "b")
        assert.strictEqual((yield* Effect.flip(test.click(posted.id, "pick", { option: "c" })))._tag, "NoSuchElement")
        assert.strictEqual((yield* Effect.flip(test.click(posted.id, "missing")))._tag, "NoSuchElement")
        yield* chat.edit(thread, posted.id, { markdown: "b" })
        assert.strictEqual((yield* Effect.flip(test.click(posted.id, "approve")))._tag, "NoSuchElement")
        yield* chat.delete(thread, posted.id)
        assert.strictEqual((yield* Effect.flip(test.click(posted.id, "approve")))._tag, "NoSuchElement")
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("submit keeps the click's origin and leaves out empty values", () =>
      Effect.gen(function*() {
        const test = yield* ChatTest.ChatTest
        const chat = yield* Chat.Chat
        const thread = yield* test.makeThread()
        const posted = yield* chat.post(thread, { markdown: "a", actions: [Approve.of(1)] })
        const click = yield* test.click(posted.id, "approve")
        const submitted = yield* test.submit(click, Ask.open({ metadata: "m" }), { answer: "" })
        assert.strictEqual(submitted.id, "ask")
        assert.strictEqual(submitted.metadata, "m")
        assert.deepStrictEqual(submitted.values, {})
        assert.strictEqual(submitted.messageId, posted.id)
        yield* ChatTest.checkInteraction(submitted, { platform: "test" })
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("interact refuses a modal the fake would not open, and records openModal", () =>
      Effect.gen(function*() {
        const test = yield* ChatTest.ChatTest
        const chat = yield* Chat.Chat
        const thread = yield* test.makeThread()
        const posted = yield* chat.post(thread, { markdown: "a", actions: [Approve.of(1)] })
        const click = yield* test.click(posted.id, "approve")
        const refused: Array<ChatError.ChatError> = []
        const opened = Ask.open({ metadata: "x".repeat(10) })
        const reply = yield* test.interact(click).pipe(
          Effect.provideService(ChatInteraction.Handler, replying(opened, refused))
        )
        assert.deepStrictEqual(reply, opened)
        assert.deepStrictEqual(refused.map((error) => [error.op, error.reason._tag]), [["openModal", "TooLarge"]])
        const calls = (yield* test.calls).filter((call) => call.op === "openModal")
        assert.deepStrictEqual(calls.map((call) => [call.messageId, call.outcome]), [[posted.id, "TooLarge"]])
      }).pipe(Effect.provide(ChatTest.layer({ limits: { modalMetadataLength: 12 } }))))

    it.effect("interact refuses any modal without the modals capability", () =>
      Effect.gen(function*() {
        const test = yield* ChatTest.ChatTest
        const chat = yield* Chat.Chat
        const thread = yield* test.makeThread()
        const posted = yield* chat.post(thread, { markdown: "a", actions: [Approve.of(1)] })
        const refused: Array<ChatError.ChatError> = []
        yield* test.interact(yield* test.click(posted.id, "approve")).pipe(
          Effect.provideService(ChatInteraction.Handler, replying(Ask.open({ metadata: "m" }), refused))
        )
        const reason = refused[0]?.reason
        assert.strictEqual(reason?._tag === "Unsupported" && reason.capability, "modals")
      }).pipe(Effect.provide(ChatTest.layer({ capabilities: capabilities.filter((c) => c !== "modals") }))))

    it.effect("checkInteraction rejects a submit with no messageId and a foreign platform", () =>
      Effect.gen(function*() {
        const submitted = ChatInteraction.ModalSubmitted.make({
          id: "ask",
          values: {},
          thread: ChatThread.make("test", "c1"),
          messageId: "",
          userId: "u",
          raw: null
        })
        const empty = yield* Effect.flip(ChatTest.checkInteraction(submitted, { platform: "test" }))
        assert.strictEqual(empty.actual, "an empty messageId")
        const foreign = yield* Effect.flip(ChatTest.checkInteraction(submitted, { platform: "other" }))
        assert.strictEqual(foreign.rule, "checkInteraction")
      }))

    it.effect("fails unsupported/buttons for an adapter that ignores actions", () =>
      Effect.gen(function*() {
        const registry = yield* ChatAdapter.Registry
        const adapter = yield* registry.get("test")
        const listed = new Set(adapter.descriptor.capabilities)
        listed.delete("buttons")
        yield* registry.register({ ...adapter, descriptor: { ...adapter.descriptor, capabilities: listed } })
        const failure = yield* Effect.flip(Effect.flatMap(suite, (rules) => rules["unsupported/buttons"]))
        assert.strictEqual(failure.actual, "success")
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("fails edit/removesActions for an adapter that keeps the elements on edit", () =>
      Effect.gen(function*() {
        const registry = yield* ChatAdapter.Registry
        const adapter = yield* registry.get("test")
        yield* registry.register({
          ...adapter,
          edit: (thread, messageId, content) =>
            adapter.edit(thread, messageId, {
              markdown: content.markdown,
              actions: [ChatInteraction.button("conformance", { label: "kept" }).of()]
            })
        })
        const failure = yield* Effect.flip(Effect.flatMap(suite, (rules) => rules["edit/removesActions"]))
        assert.strictEqual(failure.expected, "NoSuchElement")
      }).pipe(Effect.provide(ChatTest.layer())))
  })

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

  it.effect("repliesToSelf is true for a reply to the bot's message, and is not a mention", () =>
    Effect.gen(function*() {
      const test = yield* ChatTest.ChatTest
      const chat = yield* Chat.Chat
      const thread = yield* test.makeThread()
      const message = (event: { readonly _tag: string; readonly message?: ChatMessage.ChatMessage }) => {
        assert(event._tag === "MessageCreated" && event.message !== undefined)
        return event.message
      }
      const own = yield* chat.post(thread, { markdown: "from the bot" })
      const plain = message(yield* test.userPosts(thread, { text: "no reply" }))
      const toBot = message(yield* test.userPosts(thread, { text: "to the bot", replyTo: { messageId: own.id } }))
      const toUser = message(yield* test.userPosts(thread, { text: "to a person", replyTo: { messageId: plain.id } }))
      const toGone = message(yield* test.userPosts(thread, { text: "to nothing", replyTo: { messageId: "gone" } }))
      assert.deepStrictEqual(toBot.replyTo, { messageId: own.id, authorId: test.selfId, isSelf: true })
      assert.deepStrictEqual(toUser.replyTo, { messageId: plain.id, authorId: "user", isSelf: false })
      assert.deepStrictEqual(toGone.replyTo, { messageId: "gone" })
      assert.deepStrictEqual(
        [plain, toBot, toUser, toGone].map(ChatMessage.repliesToSelf),
        [false, true, false, false]
      )
      // A reply is still not a mention.
      assert.isFalse(ChatMessage.mentionsSelf(toBot))
      for (const read of [toBot, toUser, toGone]) yield* ChatTest.checkMessage(read, { platform: "test", parseMention })
      // History reads the same.
      const history = yield* chat.fetchMessage(thread, toBot.id)
      assert.isTrue(ChatMessage.repliesToSelf(history))
      // An author without isSelf, or isSelf without an author, is not a message an adapter may read.
      for (const replyTo of [{ messageId: own.id, authorId: test.selfId }, { messageId: own.id, isSelf: true }]) {
        const exit = yield* Effect.exit(
          ChatTest.checkMessage({ ...toBot, replyTo }, { platform: "test", parseMention })
        )
        assert.isTrue(Exit.isFailure(exit))
      }
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

  it.effect("the native stream holds a trailing high surrogate and stores any other lone one as U+FFFD", () =>
    Effect.gen(function*() {
      const test = yield* ChatTest.ChatTest
      const native = (yield* (yield* ChatAdapter.Registry).get("test")).nativeStream!
      const thread = yield* test.makeThread()
      const posted = yield* native.start(thread, { markdown: "x\udc00" })
      assert.deepStrictEqual(yield* native.append(thread, posted.id, "a\ud83d", undefined), { state: "open", held: 1 })
      yield* native.append(thread, posted.id, "\ud83d\ude00\ud83d", { flush: true })
      const [message] = yield* test.messages(thread)
      assert.strictEqual(message.text, "x\ufffda😀\ufffd")
    }).pipe(Effect.provide(ChatTest.layer())))
})
