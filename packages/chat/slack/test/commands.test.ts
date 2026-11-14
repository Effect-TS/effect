/**
 * Slash commands against what Slack sent and what it took, recorded on
 * janitor2 in test-janitor during EFF-3802: `fixtures/recorded/commands.json`.
 * Slack's signature on these requests was not verified, see the fixture's
 * provenance.
 */
import * as SlackChat from "@effect/chat-slack/SlackChat"
import { assert, describe, it } from "@effect/vitest"
import * as Chat from "effect/chat/Chat"
import * as ChatInteraction from "effect/chat/ChatInteraction"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { authTest, fixture, makeFake, slackLayer, team } from "./utils.ts"

const recorded = fixture("commands")
const channel = "C0CJMJ5UMUY"
const tim = "U080YLYB277"

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
    default:
      return ChatInteraction.respond({
        markdown: "**Private answer** with _Markdown_, a list:\n\n- one\n- two\n\nand buttons",
        actions
      })
  }
}

const handler = Layer.succeed(ChatInteraction.Handler, {
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

const normalize = (payload: unknown) => Option.getOrThrow(SlackChat.normalizeInteraction(payload, { teamId: team }))

const interact = (fake: ReturnType<typeof makeFake>, payload: unknown) =>
  Effect.flatMap(SlackChat.SlackChat, (slack) => slack.interaction(payload, { deadline: Duration.seconds(1) })).pipe(
    Effect.provide(handler),
    Effect.provide(slackLayer(fake))
  )

describe("recorded slash commands", () => {
  it("normalizes each command form Slack sent", () => {
    for (const [what, form] of Object.entries<Record<string, string>>(recorded.commands)) {
      const event = normalize(form)
      assert.strictEqual(event._tag, "CommandInvoked", what)
      if (event._tag !== "CommandInvoked") return
      assert.deepStrictEqual([event.id, event.text, event.userId, event.thread.id], [
        "chat-capture",
        form.text,
        tim,
        `${team}/${channel}`
      ])
      assert.isFalse("token" in (event.raw as object))
      assert.strictEqual((event.raw as any).response_url, form.response_url)
    }
  })

  it.live("answers each command with the body Slack rendered", () =>
    Effect.gen(function*() {
      const fake = makeFake({ "auth.test": authTest })
      for (const what of ["private", "public", "mention", "defer"]) {
        const answer = yield* interact(fake, recorded.commands[what])
        assert.deepStrictEqual(answer, recorded.answers[what] ?? undefined, what)
      }
      // A mention is escaped, so a command's answer mentions nobody on Slack.
      assert.include(recorded.answers.mention.text, "&lt;@U080YLYB277&gt;")
    }))

  it.live("opens a command's modal with the view Slack opened, which packs no message", () =>
    Effect.gen(function*() {
      const fake = makeFake({ "auth.test": authTest, "views.open": { ok: true, view: { id: "V0CHM1EJ691" } } })
      assert.isUndefined(yield* interact(fake, recorded.commands.modal))
      const [call] = fake.called("views.open")
      assert.strictEqual(call.params.trigger_id, recorded.commandModal.viewsOpen.trigger_id)
      assert.deepStrictEqual(JSON.parse(call.params.view), recorded.commandModal.viewsOpen.view)
    }))

  it.live("gives that modal's submit no messageId, and answers it the way Slack took", () =>
    Effect.gen(function*() {
      const submitted = normalize(recorded.commandModal.submitErrors)
      assert.strictEqual(submitted._tag, "ModalSubmitted")
      if (submitted._tag !== "ModalSubmitted") return
      assert.deepStrictEqual([submitted.id, submitted.thread.id, submitted.userId, submitted.values], [
        "cap-modal",
        `${team}/${channel}`,
        tim,
        { note: "err" }
      ])
      assert.isFalse("messageId" in submitted)
      const fake = makeFake({ "auth.test": authTest })
      assert.deepStrictEqual(
        yield* interact(fake, recorded.commandModal.submitErrors),
        recorded.commandModal.errorsAnswer
      )
      assert.isUndefined(yield* interact(fake, recorded.commandModal.submitClose))
      assert.isNull(recorded.commandModal.closeAnswer)
    }))

  it("takes a click on a private answer, which has no message, from its container", () => {
    for (const what of ["privateAnswer", "privateFollowUp"]) {
      const payload = recorded.clicks[what]
      assert.isFalse("message" in payload)
      const click = normalize(payload)
      assert.strictEqual(click._tag, "ButtonClicked", what)
      if (click._tag !== "ButtonClicked") return
      // The id names where the click came from. chat.update on it answered
      // message_not_found: a private answer is not a message Chat can reach.
      assert.deepStrictEqual([click.id, click.messageId, click.thread.id], [
        "cap-ack",
        payload.container.message_ts,
        `${team}/${channel}`
      ])
      assert.isTrue((click.raw as any).container.is_ephemeral)
    }
    const publicClick = normalize(recorded.clicks.publicAnswer)
    assert.strictEqual(
      (publicClick as ChatInteraction.ButtonClicked).messageId,
      recorded.clicks.publicAnswer.message.ts
    )
    assert.isFalse((publicClick.raw as any).container.is_ephemeral)
  })

  it.effect("fails Chat.edit NotFound on a private answer's messageId, as Slack answered chat.update", () =>
    Effect.gen(function*() {
      const click = normalize(recorded.clicks.privateAnswer) as ChatInteraction.ButtonClicked
      const fake = makeFake({ "auth.test": authTest, "chat.update": { ok: false, error: "message_not_found" } })
      const error = yield* Effect.flip(
        Effect.flatMap(Chat.Chat, (chat) => chat.edit(click.thread, click.messageId, { markdown: "Edited" })).pipe(
          Effect.provide(slackLayer(fake))
        )
      )
      assert.deepStrictEqual([error.op, error.reason._tag], ["edit", "NotFound"])
      const [{ params }] = fake.called("chat.update")
      assert.deepStrictEqual([params.channel, params.ts], [channel, recorded.clicks.privateAnswer.container.message_ts])
    }))

  it.effect("follows up with the body Slack rendered, and maps a spent and an expired response_url", () =>
    Effect.gen(function*() {
      const command = normalize(recorded.commands.defer) as ChatInteraction.CommandInvoked
      const deferred = ChatInteraction.defer(command)
      const followUp = (answer: { readonly status: number; readonly contentType: string; readonly body: string }) => {
        const fake = makeFake({
          "auth.test": authTest,
          "response_url": { status: answer.status, headers: { "content-type": answer.contentType }, body: answer.body }
        })
        const sent = Effect.flatMap(
          Chat.Chat,
          (chat) => chat.followUp(deferred, { markdown: "**Deferred answer** to defer, with buttons", actions })
        ).pipe(
          Effect.provide(slackLayer(fake))
        )
        return { fake, sent }
      }

      const ok = followUp(recorded.responseUrl.followUp.response)
      yield* ok.sent
      const [{ params: { url, ...body } }] = ok.fake.called("response_url")
      assert.strictEqual(url, new URL((command.raw as any).response_url).href)
      assert.deepStrictEqual(body, recorded.responseUrl.followUp.request)

      const answers = [recorded.responseUrl.spent.response, ...recorded.responseUrl.expired.responses]
      for (const answer of answers) {
        const error = yield* Effect.flip(followUp(answer).sent)
        assert.deepStrictEqual([error.op, error.reason._tag, error.reason.detail, (error.reason as any).cause], [
          "followUp",
          "NotFound",
          "interaction_expired",
          answer.body
        ])
      }
      assert.deepStrictEqual(answers.map((answer) => [answer.status, answer.body]), [
        [404, "used_url"],
        [404, "expired_url"],
        [404, "expired_url"],
        [404, "expired_url"]
      ])
    }))
})
