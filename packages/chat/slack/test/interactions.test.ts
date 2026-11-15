/**
 * Interactivity: the normaliser on recorded and built payloads, the answers
 * `SlackChat.interaction` gives, `layerInteractivity` over HTTP, and a
 * command's `followUp`. The command payloads here are built. The recorded
 * ones are in `commands.test.ts`.
 */
import * as SlackChat from "@effect/chat-slack/SlackChat"
import { assert, describe, it } from "@effect/vitest"
import * as Chat from "effect/chat/Chat"
import type { ChatError } from "effect/chat/ChatError"
import * as ChatInteraction from "effect/chat/ChatInteraction"
import * as ChatUi from "effect/chat/ChatUi"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/http/HttpRouter"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import { appId, authTest, channel, commandFields, fixture, makeFake, responseUrl, slackLayer, team } from "./utils.ts"

const recorded = fixture("interactivity").cases
const join = "\u241F"
const user = { id: "U080YLYB277", username: "tim", team_id: team }

const click = (action: Record<string, unknown>, message: Record<string, unknown> = {}) => ({
  type: "block_actions",
  api_app_id: appId,
  token: "verification",
  trigger_id: "trigger-1",
  user,
  team: { id: team },
  container: { type: "message", message_ts: "1794600001.000100", channel_id: channel },
  channel: { id: channel },
  message: { ts: "1794600001.000100", ...message },
  actions: [{ block_id: "chat1", ...action }]
})

const submit = (privateMetadata: string, values: Record<string, unknown>) => ({
  type: "view_submission",
  api_app_id: appId,
  user,
  team: { id: team },
  trigger_id: "trigger-2",
  view: { id: "V1", callback_id: "form", private_metadata: privateMetadata, state: { values } },
  response_urls: []
})

const input = (value: string | null) => ({ field: { type: "plain_text_input", value } })

describe("normalizeInteraction", () => {
  const normalize = (payload: unknown) => SlackChat.normalizeInteraction(payload, { teamId: team })

  it("ignores what the adapter did not build, recorded from Slack", () => {
    assert.isTrue(Option.isNone(normalize(recorded.block_actions)))
    assert.isTrue(Option.isNone(normalize(recorded.view_submission)))
    assert.isTrue(Option.isNone(normalize(click({ type: "button", action_id: join + "0", url: "https://x.test" }))))
    assert.isTrue(Option.isNone(normalize(click({ type: "button", action_id: "go", block_id: "theirs" }))))
    assert.isTrue(Option.isNone(normalize(submit("theirs", {}))))
  })

  it("gives a click its thread, message, value and raw payload without the token", () => {
    const event = Option.getOrThrow(
      normalize(click({ type: "button", action_id: "go", value: "v1" }, { thread_ts: "1794600000.000100" }))
    )
    assert.strictEqual(event._tag, "ButtonClicked")
    if (event._tag !== "ButtonClicked") return
    assert.deepStrictEqual(
      [event.id, event.value, event.messageId, event.userId, event.thread.id],
      ["go", "v1", "1794600001.000100", user.id, `${team}/${channel}/1794600000.000100`]
    )
    assert.isFalse("token" in (event.raw as object))
    // A click on a thread's root is in the channel, not in its own thread.
    const root = Option.getOrThrow(
      normalize(click({ type: "button", action_id: "go" }, { thread_ts: "1794600001.000100" }))
    )
    assert.strictEqual(root.thread.id, `${team}/${channel}`)
    assert.isFalse("value" in root)
    const select = Option.getOrThrow(
      normalize(click({ type: "static_select", action_id: "pick", selected_option: { value: "b" } }))
    )
    assert.deepStrictEqual([select._tag, (select as ChatInteraction.SelectChanged).value], ["SelectChanged", "b"])
  })

  it("gives a submit the click's origin and the consumer's metadata, which may hold the join", () => {
    const metadata = `a${join}b`
    const packed = ["chat1", channel, "1794600000.000100", "1794600001.000100", metadata].join(join)
    // As JSON.parse gives it, with `__proto__` an own key.
    const values = JSON.parse(
      JSON.stringify({
        proto: input("own"),
        empty: input(null),
        pick: { pick: { type: "static_select", selected_option: { value: "b" } } },
        none: { none: { type: "static_select", selected_option: null } }
      }).replace(`"proto"`, `"__proto__"`)
    )
    const event = Option.getOrThrow(normalize(submit(packed, values)))
    assert.strictEqual(event._tag, "ModalSubmitted")
    if (event._tag !== "ModalSubmitted") return
    assert.deepStrictEqual(
      [event.id, event.metadata, event.messageId, event.thread.id],
      ["form", metadata, "1794600001.000100", `${team}/${channel}/1794600000.000100`]
    )
    assert.isTrue(Object.hasOwn(event.values, "__proto__"))
    assert.strictEqual(event.values["__proto__"], "own")
    assert.deepStrictEqual(Object.keys(event.values).sort(), ["__proto__", "pick"])
    const bare = Option.getOrThrow(normalize(submit(["chat1", channel, "", "1794600001.000100"].join(join), {})))
    assert.isFalse("metadata" in bare)
    assert.strictEqual(bare.thread.id, `${team}/${channel}`)
  })

  it("gives a command with no text an empty text, and ignores one with no name or channel", () => {
    const { text: _, ...noText } = commandFields("/deploy", "")
    assert.strictEqual((Option.getOrThrow(normalize(noText)) as ChatInteraction.CommandInvoked).text, "")
    assert.isTrue(Option.isNone(normalize(commandFields("/", ""))))
    assert.isTrue(Option.isNone(normalize(commandFields("/deploy", "", { channel_id: "" }))))
  })
})

const recording = () => {
  const refused: Array<ChatError> = []
  let onClick: () => Effect.Effect<ChatInteraction.ClickReply> = () => Effect.succeed(ChatInteraction.ack)
  let onSubmit: () => Effect.Effect<ChatInteraction.SubmitReply> = () => Effect.succeed(ChatInteraction.close)
  let onCommand: (command: ChatInteraction.CommandInvoked) => Effect.Effect<ChatInteraction.CommandReply> = () =>
    Effect.succeed(ChatInteraction.ack)
  return {
    refused,
    set click(f: typeof onClick) {
      onClick = f
    },
    set submit(f: typeof onSubmit) {
      onSubmit = f
    },
    set command(f: typeof onCommand) {
      onCommand = f
    },
    layer: Layer.succeed(ChatInteraction.Handler, {
      click: () => onClick(),
      submit: () => onSubmit(),
      command: (command) => onCommand(command),
      refused: (_, error) => Effect.sync(() => void refused.push(error))
    })
  }
}

const modal = (metadata?: string) =>
  ChatUi.Modal.make({
    id: "form",
    title: "Form",
    ...(metadata === undefined ? {} : { metadata }),
    elements: [ChatUi.TextInput.make({ id: "field", label: "Field" })]
  })

const packedFor = (metadata: string) => ["chat1", channel, "", "1794600001.000100", metadata].join(join)

describe("SlackChat.interaction", () => {
  const interact = (fake: ReturnType<typeof makeFake>, handler: ReturnType<typeof recording>, payload: unknown) =>
    Effect.gen(function*() {
      const slack = yield* SlackChat.SlackChat
      return yield* slack.interaction(payload, { deadline: Duration.millis(50) })
    }).pipe(Effect.provide(handler.layer), Effect.provide(slackLayer(fake)))

  it.live("gives Late for a late submit and nothing for a late click", () =>
    Effect.gen(function*() {
      const fake = makeFake({ "auth.test": authTest })
      const handler = recording()
      handler.submit = () => Effect.as(Effect.never, ChatInteraction.close)
      handler.click = () => Effect.as(Effect.never, ChatInteraction.ack)
      const late = yield* interact(fake, handler, submit(packedFor(""), {}))
      assert.deepStrictEqual(late, ChatInteraction.Late.make({}))
      assert.isUndefined(yield* interact(fake, handler, click({ type: "button", action_id: "go" })))
    }))

  it.live("refuses a modal Slack refuses, or that is too large, to Handler.refused, still acking", () =>
    Effect.gen(function*() {
      const fake = makeFake({ "auth.test": authTest, "views.open": { ok: false, error: "expired_trigger_id" } })
      const handler = recording()
      handler.click = () => Effect.succeed(ChatInteraction.OpenModal.make({ modal: modal() }))
      assert.isUndefined(yield* interact(fake, handler, click({ type: "button", action_id: "go" })))
      handler.click = () => Effect.succeed(ChatInteraction.OpenModal.make({ modal: modal("x".repeat(2_800)) }))
      assert.isUndefined(yield* interact(fake, handler, click({ type: "button", action_id: "go" })))
      assert.deepStrictEqual(
        handler.refused.map((error) => [error.op, error.reason._tag, error.reason.detail]),
        [["openModal", "NotFound", "interaction_expired"], ["openModal", "TooLarge", "modal_metadata_too_long"]]
      )
      assert.strictEqual(fake.called("views.open").length, 1)
    }))

  it.live("refuses a command answer that is too large to Handler.refused, answering nothing", () =>
    Effect.gen(function*() {
      const fake = makeFake({ "auth.test": authTest })
      const handler = recording()
      handler.command = () => Effect.succeed(ChatInteraction.respond({ markdown: "x".repeat(12_001) }))
      assert.isUndefined(yield* interact(fake, handler, commandFields("/deploy", "v1")))
      assert.deepStrictEqual(handler.refused.map((error) => [error.op, error.reason._tag]), [["respond", "TooLarge"]])
    }))
})

describe("followUp", () => {
  const deferred = (raw: Record<string, unknown>, visibility: ChatInteraction.Visibility) =>
    ChatInteraction.defer(
      ChatInteraction.CommandInvoked.make({
        id: "summarize",
        text: "",
        thread: SlackChat.thread({ team, channel }),
        userId: "U080YLYB277",
        raw: raw as any
      }),
      { visibility }
    )

  it.effect("posts once to the response_url with the deferral's response_type", () =>
    Effect.gen(function*() {
      const fake = makeFake({ "auth.test": authTest, "response_url": { status: 200, body: "ok" } })
      const { token: _, ...raw } = commandFields("/summarize", "")
      yield* Effect.flatMap(Chat.Chat, (chat) => chat.followUp(deferred(raw, "public"), { markdown: "Done" })).pipe(
        Effect.provide(slackLayer(fake))
      )
      const calls = fake.called("response_url")
      assert.deepStrictEqual(
        calls.map(({ params }) => [params.url, params.response_type, params.text]),
        [[responseUrl, "in_channel", "Done"]]
      )
    }))

  it.effect("refuses a response_url off Slack before any call", () =>
    Effect.gen(function*() {
      const fake = makeFake({ "auth.test": authTest })
      const failure = (raw: Record<string, unknown>) =>
        Effect.flip(Effect.flatMap(Chat.Chat, (chat) => chat.followUp(deferred(raw, "ephemeral"), { markdown: "x" })))
          .pipe(
            Effect.provide(slackLayer(fake))
          )
      const offSlack = yield* failure({ response_url: "https://hooks.slack.com.evil.test/commands/1" })
      const plain = yield* failure({ response_url: responseUrl.replace("https:", "http:") })
      assert.deepStrictEqual(
        [offSlack, plain].map((error) => [error.op, error.reason._tag, error.reason.detail]),
        [
          ["followUp", "InvalidRequest", "invalid_response_url"],
          ["followUp", "InvalidRequest", "invalid_response_url"]
        ]
      )
      assert.strictEqual(fake.called("response_url").length, 0)
    }))
})

describe("layerInteractivity", () => {
  const secret = "8f742231b10e8888abcd99yyyzzz85a5"

  const sign = async (timestamp: string, body: string) => {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
      "sign"
    ])
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(`v0:${timestamp}:${body}`)))
    return "v0=" + Array.from(mac, (byte) => byte.toString(16).padStart(2, "0")).join("")
  }

  const post = async (
    payload: unknown,
    options?: { readonly signature?: string; readonly form?: Array<[string, string]> }
  ) => {
    const body = new URLSearchParams(options?.form ?? { payload: JSON.stringify(payload) }).toString()
    const timestamp = String(Math.floor(Date.now() / 1000))
    return new Request("http://localhost/slack/interactivity", {
      method: "POST",
      body,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-slack-request-timestamp": timestamp,
        "x-slack-signature": options?.signature ?? await sign(timestamp, body)
      }
    })
  }

  const serve = (handler: ReturnType<typeof recording>) => {
    const app = SlackChat.layerInteractivity({
      path: "/slack/interactivity",
      signingSecret: Redacted.make(secret),
      appId,
      deadline: Duration.millis(50)
    }).pipe(
      Layer.provide(SlackChat.layer({ botToken: Redacted.make("xoxb-test"), teamId: team })),
      Layer.provide(Chat.layer),
      Layer.provide(handler.layer),
      Layer.provide(makeFake({ "auth.test": authTest }).layer)
    )
    const { dispose, handler: web } = HttpRouter.toWebHandler(app, { disableLogger: true })
    const send = (payload: unknown, options?: Parameters<typeof post>[1]) =>
      Effect.promise(() => post(payload, options).then(web))
    return { dispose: Effect.promise(() => dispose()), send }
  }

  it.live("takes a command's form, keeping a repeated field's first value, and answers a late one 503", () =>
    Effect.gen(function*() {
      const handler = recording()
      const { dispose, send } = serve(handler)
      const seen: Array<string> = []
      handler.command = (event) =>
        Effect.sync(() => seen.push(event.text)).pipe(
          Effect.as(ChatInteraction.respond({ markdown: "Hi", visibility: "public" }))
        )
      const form = (text: string) =>
        [...Object.entries(commandFields("/deploy", text)), ["text", "second"]] as Array<[string, string]>
      const answered = yield* send(undefined, { form: form("first") })
      assert.strictEqual(answered.status, 200)
      assert.propertyVal(yield* Effect.promise(() => answered.json()), "response_type", "in_channel")
      assert.deepStrictEqual(seen, ["first"])

      handler.command = () => Effect.as(Effect.never, ChatInteraction.ack)
      assert.strictEqual((yield* send(undefined, { form: form("late") })).status, 503)
      yield* dispose
    }))

  it.live("answers errors as JSON, an ack empty, and a bad signature 401", () =>
    Effect.gen(function*() {
      const handler = recording()
      const { dispose, send } = serve(handler)
      handler.submit = () => Effect.succeed(ChatInteraction.errors({ field: "Too short" }))
      const errors = yield* send(submit(packedFor(""), {}))
      assert.strictEqual(errors.status, 200)
      assert.deepStrictEqual(yield* Effect.promise(() => errors.json()), {
        response_action: "errors",
        errors: { field: "Too short" }
      })

      const acked = yield* send(click({ type: "button", action_id: "go" }))
      assert.deepStrictEqual([acked.status, yield* Effect.promise(() => acked.text())], [200, ""])
      assert.strictEqual((yield* send(submit(packedFor(""), {}), { signature: "v0=00" })).status, 401)
      yield* dispose
    }))
})
