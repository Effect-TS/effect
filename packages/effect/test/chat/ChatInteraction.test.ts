import { assert, describe, it } from "@effect/vitest"
import { Deferred, Duration, Effect, Exit, Fiber, Layer, Option, Schema } from "effect"
import { Chat, ChatError, ChatInteraction, ChatTest, ChatThread } from "effect/chat"
import { TestClock } from "effect/testing"

const Deploy = Schema.Struct({ version: Schema.String })
const thread = ChatThread.make("test", "c1")
const origin = { thread, messageId: "m1", userId: "u1", raw: null }

const clicked = (id: string, value?: string) =>
  ChatInteraction.ButtonClicked.make({ id, ...origin, ...(value === undefined ? {} : { value }) })

const invoked = (id: string, text = "") =>
  ChatInteraction.CommandInvoked.make({ id, text, thread, userId: "u1", raw: { id: "i1" } })

describe("ChatInteraction", () => {
  describe("encodeValue / decodeValue", () => {
    it("sends a string-only schema as it is", () => {
      assert.strictEqual(ChatInteraction.encodeValue(Schema.String, "v1.4.2"), "v1.4.2")
      assert.strictEqual(ChatInteraction.encodeValue(Schema.Literals(["a", "b"]), "a"), "a")
      assert.deepStrictEqual(ChatInteraction.decodeValue(Schema.String, "\"quoted\""), Option.some("\"quoted\""))
    })

    it("sends anything else as JSON, decided by the schema and not the value", () => {
      const StringOrNumber = Schema.Union([Schema.String, Schema.Number])
      assert.strictEqual(ChatInteraction.encodeValue(StringOrNumber, "123"), "\"123\"")
      assert.strictEqual(ChatInteraction.encodeValue(StringOrNumber, 123), "123")
      assert.deepStrictEqual(ChatInteraction.decodeValue(StringOrNumber, "\"123\""), Option.some("123"))
      assert.deepStrictEqual(ChatInteraction.decodeValue(StringOrNumber, "123"), Option.some(123))
      assert.strictEqual(ChatInteraction.encodeValue(Deploy, { version: "v1" }), "{\"version\":\"v1\"}")
    })

    it("round-trips through a schema with a transformation", () => {
      const encoded = ChatInteraction.encodeValue(Schema.NumberFromString, 42)
      assert.strictEqual(encoded, "42")
      assert.deepStrictEqual(ChatInteraction.decodeValue(Schema.NumberFromString, encoded), Option.some(42))
    })

    it("gives none for a string that no longer decodes", () => {
      assert.isTrue(Option.isNone(ChatInteraction.decodeValue(Deploy, "not json")))
      assert.isTrue(Option.isNone(ChatInteraction.decodeValue(Deploy, "{\"version\":1}")))
      assert.isTrue(Option.isNone(ChatInteraction.decodeValue(Schema.Literals(["a"]), "b")))
    })
  })

  describe("definitions", () => {
    it("button.of encodes the value and takes overrides", () => {
      const Approve = ChatInteraction.button("approve", { label: "Approve", style: "primary", value: Deploy })
      assert.deepStrictEqual(Approve.of({ version: "v1" }, { label: "Ship v1" }), {
        _tag: "Button",
        id: "approve",
        label: "Ship v1",
        style: "primary",
        value: "{\"version\":\"v1\"}"
      })
      const Plain = ChatInteraction.button("plain", { label: "Plain" })
      assert.deepStrictEqual(Plain.of(), { _tag: "Button", id: "plain", label: "Plain" })
    })

    it("select.of encodes each option and the selected one", () => {
      const Pick = ChatInteraction.select("pick", { placeholder: "Pick", value: Schema.Number })
      assert.deepStrictEqual(Pick.of({ options: [{ label: "One", value: 1 }], selected: 1 }), {
        _tag: "Select",
        id: "pick",
        placeholder: "Pick",
        options: [{ label: "One", value: "1" }],
        selected: "1"
      })
    })

    it("modal.open builds the elements in field order, with encoded metadata and options", () => {
      const Reason = ChatInteraction.modal("reason", {
        title: "Why",
        metadata: Deploy,
        fields: {
          intro: ChatInteraction.text("Tell us."),
          reason: ChatInteraction.textInput({ label: "Reason", multiline: true, maxLength: 200 }),
          env: ChatInteraction.selectInput({ label: "Env", value: Schema.Number, optional: true })
        }
      })
      const opened = Reason.open({
        metadata: { version: "v1" },
        options: { env: [{ label: "Prod", value: 1 }] },
        initial: { env: 1 }
      })
      assert.isTrue(Schema.is(ChatInteraction.OpenModal)(opened))
      assert.deepStrictEqual(opened.modal, {
        _tag: "Modal",
        id: "reason",
        title: "Why",
        metadata: "{\"version\":\"v1\"}",
        elements: [
          { _tag: "Text", text: "Tell us." },
          { _tag: "TextInput", id: "reason", label: "Reason", multiline: true, maxLength: 200 },
          {
            _tag: "SelectInput",
            id: "env",
            label: "Env",
            options: [{ label: "Prod", value: "1" }],
            initial: "1",
            optional: true
          }
        ]
      })
    })

    it("errors builds an Errors reply", () => {
      assert.deepStrictEqual(ChatInteraction.errors({ reason: "Say more." }), {
        _tag: "Errors",
        errors: { reason: "Say more." }
      })
    })

    it("respond and defer answer privately by default, and a deferral survives JSON", () => {
      assert.deepStrictEqual(ChatInteraction.respond({ markdown: "Hi" }), {
        _tag: "Respond",
        markdown: "Hi",
        visibility: "ephemeral"
      })
      const deferred = ChatInteraction.defer(invoked("summarize"), { visibility: "public" })
      const codec = Schema.toCodecJson(ChatInteraction.Defer)
      const wire = JSON.parse(JSON.stringify(Schema.encodeSync(codec)(deferred)))
      assert.deepStrictEqual(Schema.decodeUnknownSync(codec)(wire), {
        _tag: "Defer",
        command: { _tag: "CommandInvoked", id: "summarize", text: "", thread, userId: "u1", raw: { id: "i1" } },
        visibility: "public"
      })
    })
  })

  describe("layer and groups", () => {
    const Approve = ChatInteraction.button("approve", { label: "Approve", value: Deploy })
    const Reason = ChatInteraction.modal("reason", {
      title: "Why",
      metadata: Deploy,
      fields: {
        reason: ChatInteraction.textInput({ label: "Reason" }),
        severity: ChatInteraction.choice({ label: "Severity", options: [{ label: "Low", value: "low" }] }),
        note: ChatInteraction.textInput({ label: "Note", optional: true })
      }
    })
    const Ship = ChatInteraction.command("ship", {
      description: "Ship a version",
      argument: { name: "version", description: "The version" }
    })
    const seen: Array<unknown> = []
    const unhandled: Array<string> = []
    const Interactions = ChatInteraction.group(Approve).add(Reason, Ship).toLayer({
      ship: (command) => Effect.succeed(ChatInteraction.respond({ markdown: "Shipping " + command.text })),
      approve: (click) =>
        Effect.sync(() => seen.push(click.value)).pipe(Effect.as(Reason.open({ metadata: click.value }))),
      reason: (submit) =>
        Effect.sync(() => {
          seen.push({ metadata: submit.metadata, values: submit.values })
          return submit.values.reason.length < 3 ? ChatInteraction.errors({ reason: "Longer." }) : ChatInteraction.close
        })
    }).pipe(Layer.provideMerge(ChatInteraction.layer({
      unhandled: (event, why) => Effect.sync(() => void unhandled.push(event.id + ":" + why.reason))
    })))

    it.effect("routes a click and a submit to the typed handlers", () =>
      Effect.gen(function*() {
        seen.length = 0
        const handler = yield* ChatInteraction.Handler
        const reply = yield* handler.click(clicked("approve", ChatInteraction.encodeValue(Deploy, { version: "v1" })))
        assert.strictEqual(reply._tag, "OpenModal")
        const submitted = ChatInteraction.ModalSubmitted.make({
          id: "reason",
          metadata: (reply as ChatInteraction.OpenModal).modal.metadata!,
          values: { reason: "ok", severity: "low" },
          ...origin
        })
        assert.deepStrictEqual(yield* handler.submit(submitted), ChatInteraction.errors({ reason: "Longer." }))
        assert.deepStrictEqual(seen, [
          { version: "v1" },
          { metadata: { version: "v1" }, values: { reason: "ok", severity: "low", note: undefined } }
        ])
      }).pipe(Effect.provide(Interactions)))

    it.effect("routes a command to its handler, and answers an unknown one Ack", () =>
      Effect.gen(function*() {
        unhandled.length = 0
        const handler = yield* ChatInteraction.Handler
        assert.deepStrictEqual(yield* handler.command(invoked("ship", "v1")), {
          _tag: "Respond",
          markdown: "Shipping v1",
          visibility: "ephemeral"
        })
        assert.deepStrictEqual(yield* handler.command(invoked("nope")), ChatInteraction.ack)
        // A command and a button share one id space: a command named like a button is not routed to it.
        assert.deepStrictEqual(yield* handler.command(invoked("approve")), ChatInteraction.ack)
        assert.deepStrictEqual(unhandled, ["nope:UnknownId", "approve:UnknownId"])
        assert.deepStrictEqual(Ship.argument, { name: "version", description: "The version", required: false })
      }).pipe(Effect.provide(Interactions)))

    it.effect("answers an unknown id or a value that no longer decodes without a handler", () =>
      Effect.gen(function*() {
        seen.length = 0
        unhandled.length = 0
        const handler = yield* ChatInteraction.Handler
        assert.deepStrictEqual(yield* handler.click(clicked("nope")), ChatInteraction.ack)
        assert.deepStrictEqual(yield* handler.click(clicked("approve", "{")), ChatInteraction.ack)
        assert.deepStrictEqual(yield* handler.click(clicked("reason")), ChatInteraction.ack)
        const badChoice = ChatInteraction.ModalSubmitted.make({
          id: "reason",
          metadata: "{\"version\":\"v1\"}",
          values: { reason: "long enough", severity: "high" },
          ...origin
        })
        assert.deepStrictEqual(yield* handler.submit(badChoice), ChatInteraction.close)
        assert.deepStrictEqual(seen, [])
        assert.deepStrictEqual(unhandled, [
          "nope:UnknownId",
          "approve:InvalidValue",
          "reason:UnknownId",
          "reason:InvalidValue"
        ])
      }).pipe(Effect.provide(Interactions)))

    it.effect("dies on an id registered twice", () =>
      Effect.gen(function*() {
        const twice = ChatInteraction.group(Approve).toLayer({ approve: () => Effect.succeed(ChatInteraction.ack) })
        const exit = yield* Effect.exit(Layer.build(twice.pipe(Layer.provideMerge(Interactions))))
        assert.isTrue(exit._tag === "Failure")
      }).pipe(Effect.scoped))
  })

  describe("handle", () => {
    const deadline = Duration.seconds(3)
    const handlerWith = (options: {
      readonly click?: Effect.Effect<ChatInteraction.ClickReply>
      readonly submit?: Effect.Effect<ChatInteraction.SubmitReply>
      readonly command?: Effect.Effect<ChatInteraction.CommandReply>
      readonly refused?: (error: ChatError.ChatError) => Effect.Effect<void>
    }) =>
      ChatInteraction.Handler.of({
        click: () => options.click ?? Effect.succeed(ChatInteraction.ack),
        submit: () => options.submit ?? Effect.succeed(ChatInteraction.close),
        command: () => options.command ?? Effect.succeed(ChatInteraction.ack),
        refused: (_, error) => options.refused?.(error) ?? Effect.void
      })

    it.effect("gives the reply inside the deadline", () =>
      Effect.gen(function*() {
        const reply = yield* ChatInteraction.handle(clicked("a"), deadline).pipe(
          Effect.provideService(ChatInteraction.Handler, handlerWith({}))
        )
        assert.deepStrictEqual(reply, ChatInteraction.ack)
      }))

    it.effect("gives Late for a late click, and refuses its modal with interaction_expired", () =>
      Effect.gen(function*() {
        const refused = yield* Deferred.make<ChatError.ChatError>()
        const opened = ChatInteraction.modal("m", { title: "M", fields: {} }).open()
        const handler = handlerWith({
          click: Effect.as(Effect.sleep("5 seconds"), opened),
          refused: (error) => Deferred.succeed(refused, error).pipe(Effect.asVoid)
        })
        const fiber = yield* ChatInteraction.handle(clicked("a"), deadline).pipe(
          Effect.provideService(ChatInteraction.Handler, handler),
          Effect.forkChild
        )
        yield* TestClock.adjust("3 seconds")
        const reply = yield* Fiber.join(fiber)
        assert.isTrue(Schema.is(ChatInteraction.Late)(reply))
        // The click's handler is still running, and its modal can no longer open.
        yield* TestClock.adjust("2 seconds")
        const error = yield* Deferred.await(refused)
        assert.strictEqual(error.op, "openModal")
        assert.strictEqual(error.platform, "test")
        assert.strictEqual(error.reason._tag, "NotFound")
        assert.strictEqual(error.reason.detail, ChatError.interactionExpired)
      }))

    it.effect("interrupts a late submit and a late command", () =>
      Effect.gen(function*() {
        let interrupted = 0
        const slow = <A>(reply: A) =>
          Effect.as(Effect.sleep("5 seconds"), reply).pipe(
            Effect.onInterrupt(() => Effect.sync(() => void interrupted++))
          )
        const handler = handlerWith({
          submit: slow(ChatInteraction.close),
          command: slow(ChatInteraction.respond({ markdown: "late" }))
        })
        const submitted = ChatInteraction.ModalSubmitted.make({ id: "m", values: {}, ...origin })
        for (const event of [submitted, invoked("slow")]) {
          const fiber = yield* ChatInteraction.handle(event, deadline).pipe(
            Effect.provideService(ChatInteraction.Handler, handler),
            Effect.forkChild
          )
          yield* TestClock.adjust("3 seconds")
          assert.isTrue(Schema.is(ChatInteraction.Late)(yield* Fiber.join(fiber)))
        }
        assert.strictEqual(interrupted, 2)
      }))
    it.effect("gives Late at the deadline without waiting for a late submit's cleanup", () =>
      Effect.gen(function*() {
        const cleaned = yield* Deferred.make<void>()
        const handler = handlerWith({
          submit: Effect.never.pipe(
            Effect.onInterrupt(() => Effect.andThen(Effect.sleep("5 seconds"), Deferred.succeed(cleaned, undefined)))
          )
        })
        const submitted = ChatInteraction.ModalSubmitted.make({ id: "m", values: {}, ...origin })
        const fiber = yield* ChatInteraction.handle(submitted, deadline).pipe(
          Effect.provideService(ChatInteraction.Handler, handler),
          Effect.forkChild
        )
        yield* TestClock.adjust("3 seconds")
        const exit = fiber.pollUnsafe()
        assert.isDefined(exit)
        assert.isTrue(Exit.isSuccess(exit!) && Schema.is(ChatInteraction.Late)(exit.value))
        // The interrupt was requested, and the cleanup still runs to its end.
        assert.isFalse(yield* Deferred.isDone(cleaned))
        yield* TestClock.adjust("5 seconds")
        yield* Deferred.await(cleaned)
      }))
  })

  describe("ChatTest.interact", () => {
    it.effect("uses the layer's interactionDeadline", () =>
      Effect.gen(function*() {
        const test = yield* ChatTest.ChatTest
        const handler = ChatInteraction.Handler.of({
          click: () => Effect.as(Effect.sleep("2 seconds"), ChatInteraction.ack),
          submit: () => Effect.succeed(ChatInteraction.close),
          command: () => Effect.succeed(ChatInteraction.ack),
          refused: () => Effect.void
        })
        const fiber = yield* test.interact(clicked("a")).pipe(
          Effect.provideService(ChatInteraction.Handler, handler),
          Effect.forkChild
        )
        yield* TestClock.adjust("1 second")
        assert.isTrue(Schema.is(ChatInteraction.Late)(yield* Fiber.join(fiber)))
      }).pipe(Effect.provide(ChatTest.layer({ interactionDeadline: Duration.seconds(1) }))))

    const answering = (reply: (command: ChatInteraction.CommandInvoked) => ChatInteraction.CommandReply) => {
      const refused: Array<ChatError.ChatError> = []
      const handler = ChatInteraction.Handler.of({
        click: () => Effect.succeed(ChatInteraction.ack),
        submit: () => Effect.succeed(ChatInteraction.close),
        command: (command) => Effect.succeed(reply(command)),
        refused: (_, error) => Effect.sync(() => void refused.push(error))
      })
      return { handler, refused }
    }

    it.effect("follows up a deferral once, inside followUpAge", () =>
      Effect.gen(function*() {
        const test = yield* ChatTest.ChatTest
        const chat = yield* Chat.Chat
        const channel = yield* test.makeThread()
        const { handler } = answering((command) => ChatInteraction.defer(command))
        const interact = (command: ChatInteraction.CommandInvoked) =>
          Effect.provideService(test.interact(command), ChatInteraction.Handler, handler)
        const first = yield* interact(yield* test.command(channel, "summarize"))
        yield* chat.followUp(first as ChatInteraction.Defer, { markdown: "Done" })
        const twice = yield* Effect.flip(chat.followUp(first as ChatInteraction.Defer, { markdown: "Again" }))
        assert.strictEqual(twice.reason.detail, ChatError.interactionExpired)
        const second = yield* interact(yield* test.command(channel, "summarize"))
        yield* TestClock.adjust("15 minutes")
        const expired = yield* Effect.flip(chat.followUp(second as ChatInteraction.Defer, { markdown: "Late" }))
        assert.strictEqual(expired.reason._tag, "NotFound")
        assert.strictEqual(expired.reason.detail, ChatError.interactionExpired)
        const answers = (yield* test.calls).filter((call) => call.op === "followUp")
        assert.deepStrictEqual(answers.map((call) => [call.markdown, call.outcome]), [
          ["Done", "ok"],
          ["Again", "NotFound"],
          ["Late", "NotFound"]
        ])
        assert.deepStrictEqual(yield* test.messages(channel), [])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("refuses a private answer without ephemeral, and sends nothing", () =>
      Effect.gen(function*() {
        const test = yield* ChatTest.ChatTest
        const channel = yield* test.makeThread()
        const { handler, refused } = answering((command) =>
          command.text === "defer" ? ChatInteraction.defer(command) : ChatInteraction.respond({ markdown: "Secret" })
        )
        for (const text of ["respond", "defer"]) {
          yield* Effect.provideService(
            test.interact(yield* test.command(channel, "secret", { text })),
            ChatInteraction.Handler,
            handler
          )
        }
        assert.deepStrictEqual(
          refused.map((error) => error.reason._tag === "Unsupported" && error.reason.capability),
          ["ephemeral", "ephemeral"]
        )
        assert.deepStrictEqual((yield* test.calls).map((call) => [call.op, call.outcome]), [["respond", "Unsupported"]])
      }).pipe(Effect.provide(ChatTest.layer({
        capabilities: ChatError.Capability.literals.filter((capability) => capability !== "ephemeral")
      }))))
  })
})
