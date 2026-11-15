/**
 * Dialog invokes, called directly with a recording handler: where a submit
 * says it came from, what an error reply shows, and what counts against the
 * modal cap.
 */
import { modalMetadataLength } from "@effect/chat-teams/internal/adapter"
import * as Envelope from "@effect/chat-teams/internal/envelope"
import * as Interactions from "@effect/chat-teams/internal/interactions"
import * as TeamsChat from "@effect/chat-teams/TeamsChat"
import { assert, describe, it } from "@effect/vitest"
import type { ChatError } from "effect/chat/ChatError"
import * as ChatInteraction from "effect/chat/ChatInteraction"
import type * as ChatUi from "effect/chat/ChatUi"
import { Digest, Mac, SecureRandom } from "effect/crypto"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import type * as Schema from "effect/Schema"

const crypto = Layer.mergeAll(Digest.layerWebCrypto, Mac.layerWebCrypto).pipe(
  Layer.provideMerge(SecureRandom.layerWebCrypto)
)

const key = Redacted.make({ kty: "oct", kid: "k1", k: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc" } as const)
const appId = "00000000-0000-0000-0000-0000000000a1"
const tenantId = "00000000-0000-0000-0000-0000000000b2"
const channel = "19:abc@thread.tacv2"
const from = { id: "29:user", aadObjectId: "user" }

const modal: ChatUi.Modal = {
  _tag: "Modal",
  id: "deploy",
  title: "Deploy",
  elements: [
    { _tag: "TextInput", id: "constructor", label: "Name", initial: "first" },
    { _tag: "TextInput", id: "note", label: "Note", initial: "draft" }
  ]
}

const setup = Effect.fnUntraced(function*(open: ChatUi.Modal) {
  const envelope = yield* Envelope.make({ appId, tenantId, keys: [key] })
  const submits: Array<ChatInteraction.ModalSubmitted> = []
  const refusals: Array<ChatError> = []
  const handler = ChatInteraction.Handler.of({
    click: () => Effect.succeed(ChatInteraction.OpenModal.make({ modal: open })),
    submit: (event) => {
      submits.push(event)
      return Effect.succeed(ChatInteraction.errors({ note: "Too short" }))
    },
    command: () => Effect.succeed(ChatInteraction.ack),
    refused: (_, error) => Effect.sync(() => void refusals.push(error))
  })
  const options: Interactions.Options = {
    capabilities: new Set(["buttons", "modals", "modalErrors"]),
    envelope,
    modalButtons: new Set(["open"]),
    answer: () => Effect.die("unused"),
    deadline: Duration.seconds(1)
  }
  const invoke = (activity: Record<string, Schema.Json>) =>
    Interactions.invoke(activity, options).pipe(Effect.provideService(ChatInteraction.Handler, handler))
  // A click on a card posted as a channel post: the root of its own reply chain.
  const clicked = `${channel};messageid=123`
  const button = yield* envelope.signButton(channel, { id: "open" })
  const opened = yield* invoke({
    type: "invoke",
    name: "task/fetch",
    from,
    conversation: { id: clicked },
    replyToId: "123",
    value: { data: { effect: button } }
  })
  const dialogToken = (body: unknown): string | undefined =>
    (body as any)?.task?.value?.card?.content?.actions?.[0]?.data?.effect
  const submit = (conversationId: string, values: Record<string, string>) =>
    invoke({
      type: "invoke",
      name: "task/submit",
      from,
      conversation: { id: conversationId },
      value: { data: { effect: dialogToken(opened.body) ?? null, ...values } }
    })
  return { clicked, opened, submit, submits, refusals }
})

describe("dialogs", () => {
  it.effect("a submit keeps the thread and message of the click, and from no other reply chain", () =>
    Effect.gen(function*() {
      const { clicked, submit, submits } = yield* setup(modal)
      const moved = yield* submit(`${channel};messageid=456`, { constructor: "a", note: "b" })
      assert.strictEqual(moved.status, 200)
      assert.strictEqual(submits.length, 0)

      yield* submit(clicked, { constructor: "a", note: "b" })
      assert.strictEqual(submits.length, 1)
      assert.deepStrictEqual(submits[0].thread, TeamsChat.thread(channel))
      assert.strictEqual(submits[0].messageId, "123")
    }).pipe(Effect.provide(crypto)))

  it.effect("an error reply keeps what the user entered, and reads no inherited key", () =>
    Effect.gen(function*() {
      const { clicked, submit } = yield* setup(modal)
      const reply = yield* submit(clicked, { constructor: "edited", note: "b" })
      const body = (reply.body as any).task.value.card.content.body as ReadonlyArray<any>
      const inputs = body.filter((element) => element.type === "Input.Text")
      assert.deepStrictEqual(inputs.map((input) => input.value), ["edited", "b"])
      const texts = body.filter((element) => element.type === "TextBlock").map((element) => element.text)
      assert.deepStrictEqual(texts, ["Too short"])
    }).pipe(Effect.provide(crypto)))

  it.effect("counts the metadata's signed envelope against modalMetadataLength", () =>
    Effect.gen(function*() {
      // The raw id and metadata fit the cap; with the envelope they do not.
      const metadata = "m".repeat(modalMetadataLength - modal.id.length)
      const { opened, refusals } = yield* setup({ ...modal, metadata })
      assert.notStrictEqual((opened.body as any)?.task?.type, "continue")
      assert.strictEqual(refusals[0]?.reason._tag, "TooLarge")
    }).pipe(Effect.provide(crypto)))
})
