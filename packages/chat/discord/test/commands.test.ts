/**
 * Slash commands against what Discord sent and what it took, recorded in
 * #test of guild 840178841540362250 during EFF-3802:
 * `fixtures/recorded/commands.json`.
 */
import * as DiscordChat from "@effect/chat-discord/DiscordChat"
import { assert, describe, it } from "@effect/vitest"
import * as Chat from "effect/chat/Chat"
import * as ChatInteraction from "effect/chat/ChatInteraction"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as TestClock from "effect/testing/TestClock"
import * as fs from "node:fs"
import { botUserId, discordLayer, errorResponse, type Fake, makeFake, test, tim } from "./utils.ts"

const recorded = JSON.parse(fs.readFileSync(new URL("./fixtures/recorded/commands.json", import.meta.url), "utf8"))

// The definitions the capture ran, from eff-3802-capture.ts.
const AckButton = ChatInteraction.button("cap-ack", { label: "Ack" })
const ModalButton = ChatInteraction.button("cap-open", { label: "Open modal", style: "primary" })
const Modal = ChatInteraction.modal("cap-modal", {
  title: "Capture",
  submitLabel: "Send",
  fields: { note: ChatInteraction.textInput({ label: "Note (type err for a field error)" }) }
})
const actions = [AckButton.of(), ModalButton.of()]

/** The capture's handler, by the command's text. */
const reply = (command: ChatInteraction.CommandInvoked): ChatInteraction.CommandReply => {
  switch (command.text) {
    case "public":
      return ChatInteraction.respond({
        markdown: "**Public answer** with _Markdown_ and buttons",
        actions,
        visibility: "public"
      })
    case "mention":
      return ChatInteraction.respond({ markdown: "Private answer mentioning <@" + command.userId + ">" })
    case "modal":
      return Modal.open()
    case "defer":
      return ChatInteraction.defer(command)
    case "defer-public":
      return ChatInteraction.defer(command, { visibility: "public" })
    default:
      return ChatInteraction.respond({
        markdown: "**Private answer** with _Markdown_, a list:\n\n- one\n- two\n\nand buttons",
        actions
      })
  }
}

const handler = ChatInteraction.Handler.of({
  click: () => Effect.succeed(ChatInteraction.ack),
  submit: (submit) =>
    Effect.succeed(
      submit.values.note === "err"
        ? ChatInteraction.errors({ note: "That is the error you asked for" })
        : ChatInteraction.close
    ),
  command: (command) => Effect.succeed(reply(command)),
  refused: (_, error) => Effect.die(error)
})

const normalize = (payload: unknown) => Option.getOrThrow(DiscordChat.normalizeInteraction(payload))

const deliver = (fake: Fake, payload: unknown) =>
  Effect.flatMap(DiscordChat.DiscordChat, (discord) => discord.interaction(payload)).pipe(
    Effect.provideService(ChatInteraction.Handler, handler),
    Effect.provide(discordLayer(fake))
  )

const answering = () => makeFake({ createInteractionResponse: () => Effect.succeed(null) })

/** The callbacks sent, as [interaction id, token, body]. */
const callbacks = (fake: Fake) =>
  fake.called("createInteractionResponse").map(([id, token, options]) => [id, token, options.payload])

/** When Discord made an interaction, from its snowflake. */
const issuedAt = (id: string) => Number((BigInt(id) >> 22n) + 1420070400000n)

describe("recorded slash commands", () => {
  it("normalizes each command the gateway delivered", () => {
    for (const [what, payload] of Object.entries<any>(recorded.commands)) {
      const event = normalize(payload)
      assert.strictEqual(event._tag, "CommandInvoked", what)
      if (event._tag !== "CommandInvoked") return
      assert.deepStrictEqual([event.id, event.text, event.userId, event.thread.id], [
        "chat-capture",
        payload.data.options?.[0]?.value ?? "",
        tim,
        test
      ])
    }
  })

  it.effect("answers each command with the callback Discord took", () =>
    Effect.gen(function*() {
      for (const what of ["private", "public", "mention", "modal", "defer", "deferPublic"]) {
        const fake = answering()
        const payload = recorded.commands[what]
        yield* deliver(fake, payload)
        assert.deepStrictEqual(callbacks(fake), [[payload.id, "<redacted>", recorded.callbacks[what].payload]], what)
        assert.strictEqual(recorded.callbacks[what].status, 204)
      }
      // Allowed mentions are empty: the mention renders and notifies nobody.
      assert.deepStrictEqual(recorded.callbacks.mention.payload.data.allowed_mentions.parse, [])
    }))

  it.effect("takes a click on a private answer, whose message has the ephemeral flag, and acks it", () =>
    Effect.gen(function*() {
      const payload = recorded.clicks.privateAnswer
      const click = normalize(payload)
      assert.strictEqual(click._tag, "ButtonClicked")
      if (click._tag !== "ButtonClicked") return
      // The id names where the click came from, a message only the
      // interaction's token reaches.
      assert.deepStrictEqual([click.id, click.messageId, click.thread.id], ["cap-ack", payload.message.id, test])
      assert.strictEqual(payload.message.flags & 64, 64)
      const fake = answering()
      yield* deliver(fake, payload)
      assert.deepStrictEqual(callbacks(fake), [[
        payload.id,
        "<redacted>",
        recorded.clicks.privateAnswerCallback.payload
      ]])
    }))

  it.effect("gives a submit of a command's modal no messageId, and answers it the way Discord took", () =>
    Effect.gen(function*() {
      for (const [what, callback] of [["submitErrors", "errorsCallback"], ["submitClose", "closeCallback"]] as const) {
        const payload = recorded.commandModal[what]
        assert.isFalse("message" in payload)
        const submitted = normalize(payload)
        assert.strictEqual(submitted._tag, "ModalSubmitted", what)
        if (submitted._tag !== "ModalSubmitted") return
        assert.deepStrictEqual([submitted.id, submitted.thread.id, submitted.userId], ["cap-modal", test, tim])
        assert.isFalse("messageId" in submitted)
        const fake = answering()
        yield* deliver(fake, payload)
        assert.deepStrictEqual(callbacks(fake), [[payload.id, "<redacted>", recorded.commandModal[callback].payload]])
      }
      // Type 6 closed the modal.
      assert.deepStrictEqual(recorded.commandModal.closeCallback.payload, { type: 6 })
    }))

  it.effect("follows up with the edit Discord took, and maps its answer after 15 minutes", () =>
    Effect.gen(function*() {
      const payload = recorded.commands.defer
      const deferred = ChatInteraction.defer(normalize(payload) as ChatInteraction.CommandInvoked)
      const followUp = (fake: Fake) =>
        Effect.flatMap(
          Chat.Chat,
          (chat) => chat.followUp(deferred, { markdown: "**Deferred answer** to defer, with buttons", actions })
        ).pipe(
          Effect.provide(discordLayer(fake))
        )
      const issued = issuedAt(payload.id)
      yield* TestClock.setTime(issued + 4_000)
      const edited = makeFake({ updateOriginalWebhookMessage: () => Effect.succeed(recorded.followUp.response.body) })
      yield* followUp(edited)
      assert.deepStrictEqual(
        edited.called("updateOriginalWebhookMessage").map(([applicationId, token, options]) => [
          applicationId,
          token,
          options.payload
        ]),
        [[botUserId, "<redacted>", recorded.followUp.request]]
      )

      // What Discord answered at 15.5 minutes, here returned early so the
      // mapping is reached before the adapter's own refusal.
      const { body, status } = recorded.expired.edit
      assert.deepStrictEqual([status, body.code], [401, 50027])
      const spent = makeFake({ updateOriginalWebhookMessage: () => Effect.fail(errorResponse(status, body)) })
      const mapped = yield* Effect.flip(followUp(spent))
      yield* TestClock.setTime(issued + Duration.toMillis(Duration.minutes(15)) + 30_000)
      const refused = yield* Effect.flip(followUp(spent))
      assert.deepStrictEqual([mapped, refused].map((error) => [error.op, error.reason._tag, error.reason.detail]), [
        ["followUp", "NotFound", "interaction_expired"],
        ["followUp", "NotFound", "interaction_expired"]
      ])
      assert.strictEqual(spent.called("updateOriginalWebhookMessage").length, 1)
    }))
})
