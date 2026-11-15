import { handleRequest, handleVerification, makeVerifier } from "@effect/chat-whatsapp/internal/webhook"
import * as WhatsAppChat from "@effect/chat-whatsapp/WhatsAppChat"
import type { WhatsAppUpdate } from "@effect/chat-whatsapp/WhatsAppUpdate"
import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import { assert, describe, it } from "@effect/vitest"
import * as Chat from "effect/chat/Chat"
import type { File } from "effect/chat/ChatAdapter"
import type { ChatError } from "effect/chat/ChatError"
import type * as ChatEvent from "effect/chat/ChatEvent"
import { NotAccepted } from "effect/chat/ChatHandler"
import * as ChatInteraction from "effect/chat/ChatInteraction"
import type { Action } from "effect/chat/ChatUi"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as HttpServerRequest from "effect/http/HttpServerRequest"
import * as Redacted from "effect/Redacted"
import {
  bsuid,
  graphError,
  inbound,
  makeGraph,
  phone,
  phoneNumberId,
  statuses,
  thread,
  whatsappLayer
} from "./utils.ts"

const post = (
  content: {
    readonly markdown: string
    readonly actions?: ReadonlyArray<Action>
    readonly files?: ReadonlyArray<File>
  },
  to = thread
) => Effect.flatMap(Chat.Chat, (chat) => chat.post(to, content))

const run = <A, E>(graph: ReturnType<typeof makeGraph>, effect: Effect.Effect<A, E, Chat.Chat>) =>
  effect.pipe(Effect.provide(whatsappLayer(graph)))

const failure = <A>(graph: ReturnType<typeof makeGraph>, effect: Effect.Effect<A, ChatError, Chat.Chat>) =>
  run(graph, Effect.flip(effect)).pipe(Effect.map((error) => error.reason))

const file = (name: string, contentType: string, size = 8): File => ({
  name,
  contentType,
  content: new Uint8Array(size)
})

const button = (id: string, label: string, value?: string): Action => ({
  _tag: "Button",
  id,
  label,
  ...(value === undefined ? {} : { value })
})

describe("post", () => {
  it.effect("sends rendered text to a BSUID as recipient and a phone number as to, without a preview", () =>
    Effect.gen(function*() {
      const graph = makeGraph()
      yield* run(graph, post({ markdown: "**hi** [docs](https://e.com)" }))
      yield* run(graph, post({ markdown: "hi" }, WhatsAppChat.thread({ phoneNumberId, user: phone })))
      const [first, second] = graph.sent()
      assert.deepStrictEqual(first, {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        recipient: bsuid,
        type: "text",
        text: { body: "*hi* docs (https://e.com)", preview_url: false }
      })
      assert.strictEqual(second.to, phone)
    }))

  it.effect("lays out reply buttons, a link button, a list and appended links", () =>
    Effect.gen(function*() {
      const graph = makeGraph()
      yield* run(graph, post({ markdown: "", actions: [button("a", "Yes"), button("b", "No", "v")] }))
      yield* run(graph, post({ markdown: "x", actions: [{ _tag: "LinkButton", label: "Docs", url: "https://e.com" }] }))
      yield* run(
        graph,
        post({
          markdown: "x",
          actions: [
            button("a", "Yes"),
            { _tag: "Select", id: "env", placeholder: "Environment", options: [{ label: "Prod", value: "p" }] },
            { _tag: "LinkButton", label: "Docs", url: "https://e.com" }
          ]
        })
      )
      const [reply, cta, list] = graph.sent().map((body) => body.interactive)
      assert.deepStrictEqual(reply, {
        type: "button",
        body: { text: "Yes, No" },
        action: {
          buttons: [
            { type: "reply", reply: { id: "ba", title: "Yes" } },
            { type: "reply", reply: { id: "bb\u241Fv", title: "No" } }
          ]
        }
      })
      assert.deepStrictEqual(cta.action, {
        name: "cta_url",
        parameters: { display_text: "Docs", url: "https://e.com" }
      })
      assert.deepStrictEqual(list, {
        type: "list",
        body: { text: "x\n\nDocs: https://e.com" },
        action: {
          button: "Environment",
          sections: [
            { title: "Actions", rows: [{ id: "ba", title: "Yes" }] },
            { title: "Environment", rows: [{ id: "senv\u241Fp", title: "Prod" }] }
          ]
        }
      })
    }))

  it.effect("measures a short body layout, its link lines and its generated body", () =>
    Effect.gen(function*() {
      const graph = makeGraph()
      const descriptor = yield* run(graph, Effect.flatMap(Chat.Chat, (chat) => chat.descriptor("whatsapp")))
      assert.strictEqual(descriptor.measure("ab", [button("a", "Yes")]), 2 + 3072 + 3)
      const link: Action = { _tag: "LinkButton", label: "Docs", url: "u" }
      assert.strictEqual(descriptor.measure("", [button("a", "Yes"), link]), 3072 + "Yes, Docs".length + 2 + 7)
    }))

  it.effect("refuses before any call", () =>
    Effect.gen(function*() {
      const graph = makeGraph()
      const rows = Array.from({ length: 6 }, (_, i) => button("b" + i, "b" + i))
      const select: Action = {
        _tag: "Select",
        id: "s",
        options: Array.from({ length: 5 }, (_, i) => ({ label: "o" + i, value: "o" + i }))
      }
      const refusals: ReadonlyArray<readonly [Effect.Effect<unknown, ChatError, Chat.Chat>, string, string]> = [
        [post({ markdown: "x", actions: [...rows, select] }), "TooLarge", "list_rows"],
        [post({ markdown: "x", actions: [button("a", "x".repeat(25))] }), "TooLarge", "label_too_long"],
        [
          post({ markdown: "x", actions: [button("a", "Same"), button("b", "Same")] }),
          "InvalidRequest",
          "duplicate_label"
        ],
        [post({ markdown: "x", actions: [button("a\u241F", "A")] }), "InvalidRequest", "invalid_action_id"],
        [
          post({ markdown: "x" }, { platform: "whatsapp", id: phoneNumberId + "/u/not-a-user" }),
          "InvalidRequest",
          "invalid_thread"
        ],
        [
          post({ markdown: "x" }, { platform: "whatsapp", id: phoneNumberId + "/g/120363" }),
          "InvalidRequest",
          "group_unsupported"
        ],
        [
          post({ markdown: "x", files: [file("a.txt", "text/plain"), file("b.txt", "text/plain")] }),
          "TooLarge",
          "file_refused"
        ],
        [post({ markdown: "x", files: [file("a.webp", "image/webp")] }), "TooLarge", "file_refused"],
        [post({ markdown: "x", files: [file("a.png", "image/png", 5 * 1024 * 1024 + 1)] }), "TooLarge", "file_refused"],
        [post({ markdown: "x", files: [file("a.ogg", "audio/ogg")] }), "TooLarge", "file_refused"],
        [post({ markdown: "x".repeat(1025), files: [file("a.txt", "text/plain")] }), "TooLarge", "file_refused"],
        [
          post({ markdown: "x", actions: rows.slice(0, 4), files: [file("a.txt", "text/plain")] }),
          "TooLarge",
          "file_refused"
        ]
      ]
      for (const [effect, tag, detail] of refusals) {
        const reason = yield* failure(graph, effect)
        assert.deepStrictEqual([reason._tag, reason.detail], [tag, detail])
      }
      assert.deepStrictEqual(graph.calls, [])
    }))

  it.effect("uploads a file as the header of reply buttons, and Markdown as text/plain", () =>
    Effect.gen(function*() {
      const graph = makeGraph()
      yield* run(
        graph,
        post({ markdown: "notes", actions: [button("a", "Ok")], files: [file("a.md", "text/markdown")] })
      )
      const [upload, send] = graph.calls
      assert.strictEqual(upload.body.type, "text/plain")
      assert.strictEqual(upload.body.file.name, "a.md")
      assert.deepStrictEqual(send.body.interactive.header, {
        type: "document",
        document: { id: "media-1", filename: "a.md" }
      })
    }))

  it.effect("maps 131047 to Forbidden outside the window", () =>
    Effect.gen(function*() {
      const graph = makeGraph()
      graph.next.set(phoneNumberId + "/messages", graphError(131047))
      const reason = yield* failure(graph, post({ markdown: "x" }))
      assert.deepStrictEqual([reason._tag, reason.detail], ["Forbidden", WhatsAppChat.outsideWindow])
    }))
})

const secret = "app-secret"

const sign = async (body: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)))
  return "sha256=" + Array.from(mac, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

const deliver = Effect.fnUntraced(function*(
  envelope: unknown,
  options?: {
    readonly signature?: string
    readonly refuse?: (event: ChatEvent.ChatEvent) => boolean
    readonly onClick?: ChatInteraction.ClickReply
  }
) {
  const body = JSON.stringify(envelope)
  const signature = options?.signature ?? (yield* Effect.promise(() => sign(body)))
  const verify = yield* makeVerifier(Redacted.make(secret)).pipe(Effect.provide(NodeCrypto.layerMac))
  const seen: Array<string> = []
  const refused: Array<ChatError> = []
  const response = yield* handleRequest(
    HttpServerRequest.fromWeb(
      new Request("http://localhost/whatsapp", { method: "POST", body, headers: { "x-hub-signature-256": signature } })
    ),
    {
      verify,
      normalize: (envelope) => WhatsAppChat.normalize(envelope, { phoneNumberId }),
      handle: (event) =>
        options?.refuse?.(event) === true
          ? Effect.fail(new NotAccepted({}))
          : Effect.sync(() => void seen.push(event._tag)),
      onUpdate: (update: WhatsAppUpdate) => Effect.sync(() => void seen.push(update._tag)),
      deadline: Duration.seconds(4),
      maxBodyBytes: 1024 * 1024
    }
  ).pipe(Effect.provideService(
    ChatInteraction.Handler,
    ChatInteraction.Handler.of({
      click: (event) => Effect.sync(() => (seen.push(event._tag), options?.onClick ?? ChatInteraction.ack)),
      submit: () => Effect.succeed(ChatInteraction.close),
      command: () => Effect.succeed(ChatInteraction.ack),
      refused: (_, error) => Effect.sync(() => void refused.push(error))
    })
  ))
  return { status: response.status, seen, refused }
})

describe("webhook", () => {
  const text = inbound({ type: "text", text: { body: "hi" } })

  it.effect("checks the signature and answers Meta's subscription check", () =>
    Effect.gen(function*() {
      assert.strictEqual((yield* deliver(text, { signature: "sha256=00" })).status, 401)
      assert.strictEqual((yield* deliver(text)).status, 200)
      const check = (token: string) =>
        handleVerification(
          HttpServerRequest.fromWeb(
            new Request(`http://localhost/whatsapp?hub.mode=subscribe&hub.verify_token=${token}&hub.challenge=42`)
          ),
          Redacted.make("verify")
        ).status
      assert.deepStrictEqual([check("verify"), check("other")], [200, 403])
    }))

  it.effect("runs updates in order, drops a removed reaction and stops at NotAccepted with a 503", () =>
    Effect.gen(function*() {
      const batch = inbound({ type: "text", text: { body: "hi" } })
      const value = batch.entry[0].changes[0].value as any
      value.messages.push(
        { ...value.messages[0], id: "wamid.r1", type: "reaction", reaction: { message_id: "wamid.out1", emoji: "" } },
        { ...value.messages[0], id: "wamid.r2", type: "reaction", reaction: { message_id: "wamid.out1", emoji: "👍" } }
      )
      value.statuses = [{
        id: "wamid.out1",
        status: "read",
        timestamp: "1794600001",
        recipient_id: phone,
        recipient_user_id: bsuid
      }]
      const ok = yield* deliver(batch)
      assert.deepStrictEqual([ok.status, ok.seen], [200, ["MessageCreated", "ReactionAdded", "Status", "Alias"]])
      const refused = yield* deliver(batch, { refuse: (event) => event._tag === "MessageCreated" })
      assert.deepStrictEqual([refused.status, refused.seen], [503, []])
    }))

  it.effect("hands a click to the handler and refuses a modal as Unsupported", () =>
    Effect.gen(function*() {
      const click = inbound({
        type: "interactive",
        context: { from: "15550783881", id: "wamid.out1" },
        interactive: { type: "list_reply", list_reply: { id: "senv\u241Fp\u241Fq", title: "Prod" } }
      })
      const modal = ChatInteraction.modal("m", { title: "M", fields: {} }).open()
      const result = yield* deliver(click, { onClick: modal })
      assert.deepStrictEqual([result.status, result.seen], [200, ["SelectChanged"]])
      assert.strictEqual(result.refused[0]?.reason._tag, "Unsupported")
      const [event] = WhatsAppChat.normalize(click, { phoneNumberId })
      assert.deepStrictEqual(event._tag === "SelectChanged" && [event.id, event.value, event.messageId], [
        "env",
        "p\u241Fq",
        "wamid.out1"
      ])
    }))
})

describe("keys", () => {
  it("keys a delivery by its webhook message, and an update by its parts", () => {
    const click = inbound({
      type: "interactive",
      context: { id: "wamid.out1" },
      interactive: { type: "button_reply", button_reply: { id: "ba", title: "A" } }
    })
    const [event] = WhatsAppChat.normalize(click, { phoneNumberId })
    const id = (click.entry[0].changes[0].value.messages[0] as any).id
    assert.strictEqual(event._tag === "ButtonClicked" && WhatsAppChat.deliveryKey(event), `${phoneNumberId}/${id}`)
    const updates = WhatsAppChat.normalize(
      statuses({ id: "wamid.a/b", status: "delivered", recipient_id: phone, recipient_user_id: bsuid }),
      { phoneNumberId }
    )
    assert.deepStrictEqual(
      updates.map((update) =>
        update._tag === "Status" || update._tag === "Alias" ? WhatsAppChat.updateKey(update) : ""
      ),
      [
        `${phoneNumberId}/status/wamid.a%2Fb/delivered`,
        `${phoneNumberId}/alias/wamid.a%2Fb/delivered/${phone}/${bsuid}`
      ]
    )
  })
})
