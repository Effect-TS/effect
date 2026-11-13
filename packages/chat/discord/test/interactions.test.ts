import * as DiscordChat from "@effect/chat-discord/DiscordChat"
import { assert, describe, it } from "@effect/vitest"
import type { ChatError } from "effect/chat/ChatError"
import * as ChatInteraction from "effect/chat/ChatInteraction"
import { checkInteraction } from "effect/chat/ChatTest"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Option from "effect/Option"
import * as TestClock from "effect/testing/TestClock"
import { answer, botUserId, discordLayer, type Fake, guild, makeFake, scratch, step, tim } from "./utils.ts"

const message = { id: "1570700000000000001", channel_id: scratch }

const click = (data: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  id: "1570700000000000100",
  application_id: botUserId,
  type: 3,
  token: "token",
  version: 1,
  guild_id: guild,
  channel_id: scratch,
  member: { user: { id: tim } },
  message,
  data,
  ...extra
})

const submit = (customId: string, components: ReadonlyArray<unknown>) =>
  click({ custom_id: customId, components }, { type: 5 })

const omit = (raw: Record<string, unknown>, key: string) => {
  const { [key]: _, ...rest } = raw
  return rest
}

const some = (raw: unknown) => {
  const interaction = DiscordChat.normalizeInteraction(raw)
  assert.isTrue(Option.isSome(interaction))
  return Option.getOrThrow(interaction)
}

describe("normalizeInteraction", () => {
  it.effect("a button splits its custom_id into id and value at the first join", () =>
    Effect.gen(function*() {
      const withValue = some(click({ custom_id: "go\u241Fa\u241Fb", component_type: 2 }))
      assert.deepStrictEqual(
        withValue,
        ChatInteraction.ButtonClicked.make({
          id: "go",
          value: "a\u241Fb",
          thread: DiscordChat.thread(scratch),
          messageId: message.id,
          userId: tim,
          raw: withValue.raw
        })
      )
      const without = some(click({ custom_id: "go", component_type: 2 }))
      assert.isFalse("value" in without)
      // In a direct the user is on `user`, not `member`.
      const direct = some({ ...omit(click({ custom_id: "go", component_type: 2 }), "member"), user: { id: tim } })
      assert.strictEqual(direct.userId, tim)
      for (const interaction of [withValue, without, direct]) {
        yield* checkInteraction(interaction, { platform: "discord" })
      }
    }))

  it("a string select gives its one value", () => {
    const changed = some(click({ custom_id: "pick", component_type: 3, values: ["b"] }))
    assert.deepStrictEqual([changed._tag, changed.id, (changed as ChatInteraction.SelectChanged).value], [
      "SelectChanged",
      "pick",
      "b"
    ])
  })

  it.effect("a submit reads each Label's input, leaves an empty one out and splits the metadata", () =>
    Effect.gen(function*() {
      const submitted = some(submit("form\u241F{\"v\":1}", [
        { type: 10 },
        { type: 18, component: { type: 4, custom_id: "name", value: "Tim" } },
        { type: 18, component: { type: 4, custom_id: "note", value: "" } },
        { type: 18, component: { type: 3, custom_id: "size", values: ["l"] } },
        { type: 18, component: { type: 3, custom_id: "none", values: [] } },
        // The older shape: an action row around the input.
        { type: 1, components: [{ type: 4, custom_id: "old", value: "row" }] }
      ]))
      assert.strictEqual(submitted._tag, "ModalSubmitted")
      const { id, metadata, values } = submitted as ChatInteraction.ModalSubmitted
      assert.deepStrictEqual({ id, metadata, values }, {
        id: "form",
        metadata: "{\"v\":1}",
        values: { name: "Tim", size: "l", old: "row" }
      })
      assert.strictEqual(submitted.messageId, message.id)
      yield* checkInteraction(submitted, { platform: "discord" })
      assert.isFalse("metadata" in some(submit("form", [])))
    }))

  it.effect("a submit keeps an input whose id is __proto__ as its own field", () =>
    Effect.gen(function*() {
      const submitted = some(submit("form", [
        { type: 18, component: { type: 4, custom_id: "__proto__", value: "answered" } },
        { type: 18, component: { type: 4, custom_id: "name", value: "Tim" } }
      ])) as ChatInteraction.ModalSubmitted
      assert.isTrue(Object.hasOwn(submitted.values, "__proto__"))
      assert.strictEqual(submitted.values["__proto__"], "answered")
      assert.deepStrictEqual(Object.keys(submitted.values), ["__proto__", "name"])
      yield* checkInteraction(submitted, { platform: "discord" })
    }))

  it("anything not from an element the adapter built is None", () => {
    for (
      const raw of [
        click({ id: "1", name: "ping", type: 1 }, { type: 2 }),
        { type: 1, id: "1", token: "t" },
        click({ custom_id: "users", component_type: 5, values: [tim] }),
        omit(click({ custom_id: "go", component_type: 2 }), "message"),
        "not an object"
      ]
    ) {
      assert.isTrue(Option.isNone(DiscordChat.normalizeInteraction(raw)))
    }
  })
})

describe("interaction", () => {
  const recording = (reply: {
    readonly click?: ChatInteraction.ClickReply
    readonly submit?: ChatInteraction.SubmitReply
    readonly delay?: Duration.Duration
  }) => {
    const received: Array<ChatInteraction.Interaction> = []
    const refused: Array<ChatError> = []
    const handler = ChatInteraction.Handler.of({
      click: (event) =>
        Effect.as(
          Effect.andThen(Effect.sleep(reply.delay ?? Duration.zero), Effect.sync(() => received.push(event))),
          reply.click ?? ChatInteraction.ack
        ),
      submit: (event) => Effect.as(Effect.sync(() => received.push(event)), reply.submit ?? ChatInteraction.close),
      refused: (_, error) => Effect.sync(() => void refused.push(error))
    })
    return { received, refused, handler }
  }

  const deliver = (
    fake: Fake,
    raw: unknown,
    handler: ChatInteraction.Handler["Service"],
    options?: { readonly deadline?: Duration.Duration }
  ) =>
    Effect.gen(function*() {
      const discord = yield* DiscordChat.DiscordChat
      yield* discord.interaction(raw, options).pipe(Effect.provideService(ChatInteraction.Handler, handler))
    }).pipe(Effect.provide(discordLayer(fake)))

  const answering = () => makeFake({ createInteractionResponse: () => Effect.succeed(null) })
  const payloads = (fake: Fake) => fake.called("createInteractionResponse").map(([, , options]) => options.payload)

  it.effect("acks a click and a close with type 6, to the interaction's id and token", () =>
    Effect.gen(function*() {
      const fake = answering()
      const { handler, received } = recording({})
      yield* deliver(fake, click({ custom_id: "go", component_type: 2 }), handler)
      yield* deliver(fake, submit("form", []), handler)
      assert.strictEqual(received.length, 2)
      assert.deepStrictEqual(fake.called("createInteractionResponse").map(([id, token]) => [id, token]), [
        ["1570700000000000100", "token"],
        ["1570700000000000100", "token"]
      ])
      assert.deepStrictEqual(payloads(fake), [{ type: 6 }, { type: 6 }])
    }))

  it.effect("opens a modal with type 9: Labels around the inputs and a text display for a text", () =>
    Effect.gen(function*() {
      const fake = answering()
      const modal = ChatInteraction.modal("form", {
        title: "Release",
        submitLabel: "Go",
        fields: {
          intro: ChatInteraction.text("Pick *one*."),
          name: ChatInteraction.textInput({ label: "Name", placeholder: "Tim", maxLength: 20 }),
          note: ChatInteraction.textInput({ label: "Note", multiline: true, optional: true }),
          size: ChatInteraction.choice({
            label: "Size",
            options: [{ label: "S", value: "s" }, { label: "L", value: "l" }]
          })
        }
      })
      const { handler, refused } = recording({ click: modal.open() })
      yield* deliver(fake, click({ custom_id: "go", component_type: 2 }), handler)
      assert.deepStrictEqual(refused, [])
      assert.deepStrictEqual(payloads(fake), [{
        type: 9,
        data: {
          custom_id: "form",
          title: "Release",
          components: [
            { type: 10, content: "Pick \\*one\\*\\." },
            {
              type: 18,
              label: "Name",
              component: { type: 4, custom_id: "name", style: 1, required: true, placeholder: "Tim", max_length: 20 }
            },
            { type: 18, label: "Note", component: { type: 4, custom_id: "note", style: 2, required: false } },
            {
              type: 18,
              label: "Size",
              component: {
                type: 3,
                custom_id: "size",
                required: true,
                min_values: 1,
                max_values: 1,
                options: [{ label: "S", value: "s" }, { label: "L", value: "l" }]
              }
            }
          ]
        }
      }])
    }))

  it.effect("answers errors with a private message listing each one, escaped", () =>
    Effect.gen(function*() {
      const fake = answering()
      const { handler } = recording({ submit: ChatInteraction.errors({ name: "Too short.", size: "Pick <one>" }) })
      yield* deliver(fake, submit("form", []), handler)
      assert.deepStrictEqual(payloads(fake), [{
        type: 4,
        data: { content: "- Too short\\.\n- Pick \\<one\\>", allowed_mentions: { parse: [] }, flags: 64 }
      }])
    }))

  it.effect("a modal title or label over 45 reaches refused as TooLarge, and the click is still answered", () =>
    Effect.gen(function*() {
      for (
        const modal of [
          ChatInteraction.modal("form", { title: "t".repeat(46), fields: {} }),
          ChatInteraction.modal("form", {
            title: "t",
            fields: { a: ChatInteraction.textInput({ label: "l".repeat(46) }) }
          })
        ]
      ) {
        const fake = answering()
        const { handler, refused } = recording({ click: modal.open() })
        yield* deliver(fake, click({ custom_id: "go", component_type: 2 }), handler)
        assert.deepStrictEqual(refused.map((error) => [error.op, error.reason._tag]), [["openModal", "TooLarge"]])
        assert.deepStrictEqual(payloads(fake), [{ type: 6 }])
      }
      // 45 fits.
      const fake = answering()
      const { handler, refused } = recording({
        click: ChatInteraction.modal("form", { title: "t".repeat(45), fields: {} }).open()
      })
      yield* deliver(fake, click({ custom_id: "go", component_type: 2 }), handler)
      assert.deepStrictEqual(refused, [])
    }))

  it.effect("a modal callback that comes back Unknown interaction is refused as interaction_expired", () =>
    Effect.gen(function*() {
      const fake = makeFake({
        createInteractionResponse: () => answer(step("components", "callback-unknown-interaction-modal-45"))
      })
      const { handler, refused } = recording({
        click: ChatInteraction.modal("form", { title: "t", fields: {} }).open()
      })
      yield* deliver(fake, click({ custom_id: "go", component_type: 2 }), handler)
      assert.deepStrictEqual(refused.map((error) => [error.op, error.reason._tag, error.reason.detail]), [
        ["openModal", "NotFound", "interaction_expired"]
      ])
      // A late ack is logged, not refused.
      const ack = recording({})
      yield* deliver(fake, click({ custom_id: "go", component_type: 2 }), ack.handler)
      assert.deepStrictEqual(ack.refused, [])
    }))

  it.effect("sends nothing when the handler misses its deadline, 2 seconds by default", () =>
    Effect.gen(function*() {
      const fake = answering()
      const { handler } = recording({ delay: Duration.seconds(3) })
      const fiber = yield* Effect.forkChild(deliver(fake, click({ custom_id: "go", component_type: 2 }), handler))
      yield* TestClock.adjust("2 seconds")
      yield* Fiber.join(fiber)
      assert.deepStrictEqual(payloads(fake), [])
      const longer = yield* Effect.forkChild(
        deliver(fake, click({ custom_id: "go", component_type: 2 }), handler, { deadline: Duration.seconds(5) })
      )
      yield* TestClock.adjust("3 seconds")
      yield* Fiber.join(longer)
      assert.deepStrictEqual(payloads(fake), [{ type: 6 }])
    }))

  it.effect("ignores an interaction it did not build, calling nothing", () =>
    Effect.gen(function*() {
      const fake = makeFake({})
      const { handler, received } = recording({})
      yield* deliver(fake, click({ id: "1", name: "ping", type: 1 }, { type: 2 }), handler)
      assert.deepStrictEqual([received.length, fake.calls.length], [0, 0])
    }))
})
