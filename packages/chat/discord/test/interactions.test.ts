/**
 * Interactions: the normaliser, the callbacks `DiscordChat.interaction`
 * answers with, `commandRequests` and a command's `followUp`. The slash
 * command payloads here start from the ones recorded in EFF-3802, which
 * `commands.test.ts` runs as they are.
 */
import * as DiscordChat from "@effect/chat-discord/DiscordChat"
import { assert, describe, it } from "@effect/vitest"
import * as DiscordConfig from "dfx/DiscordConfig"
import { DiscordRESTLive } from "dfx/DiscordREST"
import { MemoryRateLimitStoreLive } from "dfx/RateLimit"
import * as Chat from "effect/chat/Chat"
import type { ChatError } from "effect/chat/ChatError"
import * as ChatInteraction from "effect/chat/ChatInteraction"
import { checkInteraction } from "effect/chat/ChatTest"
import * as Clock from "effect/Clock"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as TestClock from "effect/testing/TestClock"
import {
  answer,
  botUserId,
  discordLayer,
  type Fake,
  guild,
  makeFake,
  recordedCommands,
  scratch,
  step,
  tim
} from "./utils.ts"

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

/** A recorded interaction moved to scratch, with its own id and token. */
const fromRecorded = (recorded: any, data: Record<string, unknown>) => ({
  ...recorded,
  id: "1570700000000000100",
  token: "token",
  channel_id: scratch,
  channel: { ...recorded.channel, id: scratch },
  data
})

const slash = (name: string, options?: ReadonlyArray<unknown>, data: Record<string, unknown> = {}) =>
  fromRecorded(recordedCommands.commands.private, {
    id: "1570700000000000900",
    name,
    type: 1,
    ...(options === undefined ? {} : { options }),
    ...data
  })

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
      // In a direct the user is on `user`, not `member`.
      const direct = some({ ...omit(click({ custom_id: "go", component_type: 2 }), "member"), user: { id: tim } })
      assert.strictEqual(direct.userId, tim)
      for (const interaction of [withValue, direct]) {
        yield* checkInteraction(interaction, { platform: "discord" })
      }
    }))

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
      assert.strictEqual((submitted as ChatInteraction.ModalSubmitted).messageId, message.id)
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

  it("anything not from an element the adapter built, or a command it can't express, is None", () => {
    for (
      const raw of [
        // A user command, and a slash command with an integer option.
        slash("profile", undefined, { type: 2 }),
        slash("roll", [{ type: 4, name: "sides", value: 6 }]),
        // Autocomplete for a command.
        { ...slash("deploy", [{ type: 3, name: "version", value: "v", focused: true }]), type: 4 },
        // A user select, and a click with no message.
        click({ custom_id: "users", component_type: 5, values: [tim] }),
        omit(click({ custom_id: "go", component_type: 2 }), "message")
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
    readonly command?: (command: ChatInteraction.CommandInvoked) => ChatInteraction.CommandReply
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
      command: (event) =>
        Effect.as(
          Effect.sync(() => received.push(event)),
          reply.command === undefined ? ChatInteraction.ack : reply.command(event)
        ),
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

  it.effect("a modal title over 45 reaches refused as TooLarge, and the click is still answered", () =>
    Effect.gen(function*() {
      const fake = answering()
      const { handler, refused } = recording({
        click: ChatInteraction.modal("form", { title: "t".repeat(46), fields: {} }).open()
      })
      yield* deliver(fake, click({ custom_id: "go", component_type: 2 }), handler)
      assert.deepStrictEqual(refused.map((error) => [error.op, error.reason._tag]), [["openModal", "TooLarge"]])
      assert.deepStrictEqual(payloads(fake), [{ type: 6 }])
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
      yield* deliver(fake, slash("profile", undefined, { type: 2 }), handler)
      assert.deepStrictEqual([received.length, fake.calls.length], [0, 0])
    }))

  it.effect("withPostOptions does not reach a command's answer", () =>
    Effect.gen(function*() {
      const fake = answering()
      const { handler } = recording({
        command: () => ChatInteraction.respond({ markdown: "Hi", visibility: "public" })
      })
      yield* DiscordChat.withPostOptions(deliver(fake, slash("summarize"), handler), {
        suppressEmbeds: false,
        notify: { everyone: true }
      })
      assert.deepStrictEqual(payloads(fake), [{
        type: 4,
        data: { content: "Hi", allowed_mentions: { parse: [], replied_user: false, roles: [], users: [] }, flags: 4 }
      }])
    }))

  it.effect("sends nothing for a command nobody handles", () =>
    Effect.gen(function*() {
      const fake = answering()
      const { handler, received, refused } = recording({})
      yield* deliver(fake, slash("theirs"), handler)
      assert.strictEqual(received.length, 1)
      assert.deepStrictEqual(refused, [])
      assert.deepStrictEqual(payloads(fake), [])
    }))
})

describe("commandRequests", () => {
  it("gives a CHAT_INPUT command per definition, with one STRING option for an argument", () => {
    const group = ChatInteraction.group(
      ChatInteraction.command("summarize", { description: "Summarize this thread" }),
      ChatInteraction.button("go", { label: "Go" }),
      ChatInteraction.command("deploy", {
        description: "Deploy a version",
        argument: { name: "version", description: "The version", required: true }
      }),
      ChatInteraction.command("note", {
        description: "Add a note",
        argument: { name: "text", description: "The note" }
      })
    )
    assert.deepStrictEqual(DiscordChat.commandRequests(group), [
      { type: 1, name: "summarize", description: "Summarize this thread" },
      {
        type: 1,
        name: "deploy",
        description: "Deploy a version",
        options: [{ type: 3, name: "version", description: "The version", required: true }]
      },
      {
        type: 1,
        name: "note",
        description: "Add a note",
        options: [{ type: 3, name: "text", description: "The note", required: false }]
      }
    ])
  })
})

describe("followUp", () => {
  const deferred = (visibility: ChatInteraction.Visibility) =>
    ChatInteraction.defer(some(slash("summarize")) as ChatInteraction.CommandInvoked, { visibility })

  it.effect("sends one HTTP request through dfx's layers on a 429 just before 15 minutes, and fails RateLimited", () =>
    Effect.gen(function*() {
      const issued = Number((BigInt("1570700000000000900") >> 22n) + 1420070400000n)
      const attempts: Array<{ readonly url: string; readonly authorized: boolean; readonly at: number }> = []
      const http = HttpClient.make((request) =>
        Effect.map(Clock.currentTimeMillis, (at) => {
          attempts.push({ url: request.url, authorized: "authorization" in request.headers, at: at - issued })
          return HttpClientResponse.fromWeb(
            request,
            Response.json({ message: "You are being rate limited.", retry_after: 0.6, global: false }, {
              status: 429,
              headers: { "retry-after": "0.6" }
            })
          )
        })
      )
      // dfx's own REST layers, which wait out a 429 and send again, over an HTTP client that counts.
      const layer = DiscordChat.layer.pipe(
        Layer.provideMerge(Chat.layer),
        Layer.provide(DiscordRESTLive),
        Layer.provide([
          DiscordConfig.layer({ token: Redacted.make("bot-token"), rest: { baseUrl: "https://discord.test/api" } }),
          MemoryRateLimitStoreLive,
          Layer.succeed(HttpClient.HttpClient, http)
        ])
      )
      yield* TestClock.setTime(issued + Duration.toMillis(Duration.minutes(15)) - 300)
      const fiber = yield* Effect.forkChild(Effect.flip(
        Effect.flatMap(Chat.Chat, (chat) => chat.followUp(deferred("public"), { markdown: "Done" })).pipe(
          Effect.provide(layer)
        )
      ))
      yield* TestClock.adjust(Duration.seconds(10))
      const error = yield* Fiber.join(fiber)
      assert.deepStrictEqual([error.op, error.reason._tag], ["followUp", "RateLimited"])
      assert.deepStrictEqual(attempts, [{
        url: `https://discord.test/api/webhooks/${botUserId}/token/messages/@original`,
        authorized: false,
        at: Duration.toMillis(Duration.minutes(15)) - 300
      }])
    }))
})
