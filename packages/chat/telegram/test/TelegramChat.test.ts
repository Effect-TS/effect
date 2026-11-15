/**
 * The adapter's own guarantees, over a fake Bot API: the token stays out of
 * errors, spans and logs (T1), the webhook secret (T2), private answers
 * (T5), clicks (T6), excluded contexts (T7) and acceptance (T8).
 */
import * as TelegramChat from "@effect/chat-telegram/TelegramChat"
import { assert, describe, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Chat from "effect/chat/Chat"
import type { ChatError } from "effect/chat/ChatError"
import type * as ChatEvent from "effect/chat/ChatEvent"
import { ChatHandler, NotAccepted } from "effect/chat/ChatHandler"
import * as ChatInteraction from "effect/chat/ChatInteraction"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as HttpRouter from "effect/http/HttpRouter"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import type * as Schema from "effect/Schema"
import * as Tracer from "effect/Tracer"
import {
  apiError,
  botId,
  callbackUpdate,
  chatId,
  commandUpdate,
  context,
  type FakeApi,
  makeApi,
  messageUpdate,
  telegramLayer,
  thread,
  token,
  unverified
} from "./utils.ts"

const secret = "s".repeat(32)

/** What reached the consumer, by kind. */
const makeRecorder = (options?: {
  readonly command?: (event: ChatInteraction.CommandInvoked) => ChatInteraction.CommandReply
  readonly refuse?: boolean
}) => {
  const events: Array<ChatEvent.ChatEvent> = []
  const clicks: Array<ChatInteraction.ButtonClicked | ChatInteraction.SelectChanged> = []
  const commands: Array<ChatInteraction.CommandInvoked> = []
  const refused: Array<ChatError> = []
  const unhandled: Array<Schema.Json> = []
  const handler = ChatHandler.of({
    handle: (event) =>
      options?.refuse === true ? Effect.fail(new NotAccepted({})) : Effect.sync(() => void events.push(event))
  })
  const interactions = ChatInteraction.Handler.of({
    click: (event) => Effect.sync(() => (clicks.push(event), ChatInteraction.ack)),
    submit: () => Effect.succeed(ChatInteraction.close),
    command: (event) => Effect.sync(() => (commands.push(event), options?.command?.(event) ?? ChatInteraction.ack)),
    refused: (_, error) => Effect.sync(() => void refused.push(error))
  })
  const onUnhandled = (update: Schema.Json) => Effect.sync(() => void unhandled.push(update))
  return { events, clicks, commands, refused, unhandled, handler, interactions, onUnhandled }
}

type Recorder = ReturnType<typeof makeRecorder>

/** Runs updates through `TelegramChat.receive`, as the transports do. */
const receive = (api: FakeApi, recorder: Recorder, ...updates: ReadonlyArray<unknown>) =>
  Effect.gen(function*() {
    const telegram = yield* TelegramChat.TelegramChat
    const outcomes: Array<TelegramChat.Outcome> = []
    for (const update of updates) {
      outcomes.push(yield* telegram.receive(update, { onUnhandled: recorder.onUnhandled }))
    }
    return outcomes
  }).pipe(
    Effect.provideService(ChatHandler, recorder.handler),
    Effect.provideService(ChatInteraction.Handler, recorder.interactions),
    Effect.provide(telegramLayer(api))
  )

/** An ephemeral command: message id 0, with its own private id. */
const ephemeralCommand = (name: string, ephemeralId: number) =>
  commandUpdate(name, "", { message_id: 0, ephemeral_message_id: ephemeralId })

describe("credentials", () => {
  it.effect("keeps the token out of errors, spans and logs", () =>
    Effect.gen(function*() {
      const api = makeApi()
      const spans: Array<Tracer.NativeSpan> = []
      const logs: Array<string> = []
      const tracer = Tracer.make({
        span(options) {
          const span = new Tracer.NativeSpan(options)
          spans.push(span)
          return span
        }
      })
      const logger = Logger.formatJson.pipe(Logger.map((line): void => void logs.push(line)))
      api.next.set("sendRichMessage", apiError(401, "Unauthorized"))
      const exit = yield* Effect.flatMap(Chat.Chat, (chat) => chat.post(thread, { markdown: "hi" })).pipe(
        Effect.tapCause((cause) => Effect.logError("post failed", cause)),
        Effect.exit,
        Effect.provide(telegramLayer(api)),
        Effect.provide(Logger.layer([logger])),
        Effect.provideService(Tracer.Tracer, tracer)
      )
      assert.isTrue(Exit.isFailure(exit))
      const seen = [
        Exit.isFailure(exit) ? Cause.pretty(exit.cause) : "",
        JSON.stringify(exit),
        ...logs,
        ...spans.map((span) => JSON.stringify([span.name, [...span.attributes], span.events]))
      ].join("\n")
      assert.isTrue(spans.some((span) => span.name === "TelegramBotApi.sendRichMessage"))
      assert.isTrue(seen.includes("/bot<redacted>/sendRichMessage"))
      assert.isFalse(seen.includes(token))
      assert.isFalse(seen.includes(token.split(":")[1]))
    }))

  it.effect("refuses a token without a bot id", () =>
    Effect.gen(function*() {
      const exit = yield* Layer.build(
        TelegramChat.layer({ token: Redacted.make("not-a-token") }).pipe(
          Layer.provide(Chat.layer),
          Layer.provide(makeApi().layer)
        )
      ).pipe(Effect.scoped, Effect.exit)
      assert.isTrue(Exit.isFailure(exit))
      assert.isFalse(JSON.stringify(exit).includes("not-a-token"))
    }))
})

const webhook = Effect.fnUntraced(function*(api: FakeApi, recorder: Recorder) {
  const app = TelegramChat.layerWebhook({
    path: "/telegram",
    secretToken: Redacted.make(secret),
    maxBodyBytes: 4096,
    onUnhandled: recorder.onUnhandled
  }).pipe(
    Layer.provide(telegramLayer(api)),
    Layer.provide(Layer.succeed(ChatHandler, recorder.handler))
  )
  const { dispose, handler } = HttpRouter.toWebHandler(app, { disableLogger: true })
  yield* Effect.addFinalizer(() => Effect.promise(() => dispose()))
  return (body: string, header?: string) =>
    Effect.promise(() =>
      handler(
        new Request("http://localhost/telegram", {
          method: "POST",
          body,
          headers: {
            "content-type": "application/json",
            ...(header === undefined ? {} : { [TelegramChat.secretHeader]: header })
          }
        })
      )
    ).pipe(Effect.map((response) => response.status))
})

describe("layerWebhook", () => {
  it.effect("needs the secret, then answers for the body and the outcome", () =>
    Effect.gen(function*() {
      const api = makeApi()
      const recorder = makeRecorder()
      const send = yield* webhook(api, recorder)
      const body = JSON.stringify(messageUpdate({ text: "hi" }))
      assert.strictEqual(yield* send(body), 401)
      assert.strictEqual(yield* send(body, "s".repeat(31)), 401)
      assert.strictEqual(yield* send(body, "t".repeat(32)), 401)
      assert.strictEqual(recorder.events.length, 0)
      assert.strictEqual(yield* send("x".repeat(5000), secret), 413)
      assert.strictEqual(yield* send("{", secret), 400)
      assert.strictEqual(yield* send(JSON.stringify({ message: {} }), secret), 400)
      assert.strictEqual(yield* send(body, secret), 200)
      assert.strictEqual(recorder.events.length, 1)
      assert.strictEqual(yield* send(JSON.stringify({ update_id: 1, poll: {} }), secret), 200)
      assert.strictEqual(recorder.unhandled.length, 1)
    }))

  it.effect("answers 503 when the handler does not accept", () =>
    Effect.gen(function*() {
      const send = yield* webhook(makeApi(), makeRecorder({ refuse: true }))
      assert.strictEqual(yield* send(JSON.stringify(messageUpdate({ text: "hi" })), secret), 503)
    }))

  it.effect("refuses a short secret", () =>
    Effect.gen(function*() {
      const app = TelegramChat.layerWebhook({ path: "/telegram", secretToken: Redacted.make("short") }).pipe(
        Layer.provide(telegramLayer(makeApi())),
        Layer.provide(Layer.succeed(ChatHandler, makeRecorder().handler)),
        Layer.provide(HttpRouter.layer)
      )
      const exit = yield* Layer.build(app).pipe(Effect.scoped, Effect.exit)
      assert.isTrue(Exit.isFailure(exit))
    }))
})

describe("private answers", () => {
  it.effect("refuses an ephemeral answer and never posts it", () =>
    Effect.gen(function*() {
      const api = makeApi()
      const recorder = makeRecorder({ command: () => ChatInteraction.respond({ markdown: "secret" }) })
      const outcomes = yield* receive(api, recorder, commandUpdate("deploy"), ephemeralCommand("deploy", 7))
      assert.deepStrictEqual(outcomes, ["accepted", "accepted"])
      assert.strictEqual(recorder.commands.length, 2)
      assert.deepStrictEqual(recorder.refused.map((error) => error.reason._tag), ["Unsupported", "Unsupported"])
      assert.strictEqual(api.sent("sendRichMessage").length, 0)
      assert.strictEqual(recorder.events.length + recorder.unhandled.length, 0)
    }))

  it.effect("answers an ephemeral command in public without quoting it", () =>
    Effect.gen(function*() {
      const api = makeApi()
      const recorder = makeRecorder({
        command: () => ChatInteraction.respond({ markdown: "done", visibility: "public" })
      })
      yield* receive(api, recorder, commandUpdate("deploy"), ephemeralCommand("deploy", 7))
      const [quoted, unquoted] = api.sent("sendRichMessage")
      assert.isDefined(quoted.reply_parameters)
      assert.isUndefined(unquoted.reply_parameters)
      assert.strictEqual(unquoted.chat_id, chatId)
    }))

  it.effect("keeps an ephemeral message that is not a command from every handler", () =>
    Effect.gen(function*() {
      const api = makeApi()
      const recorder = makeRecorder()
      yield* receive(api, recorder, messageUpdate({ text: "psst", message_id: 0, ephemeral_message_id: 9 }))
      assert.strictEqual(recorder.events.length + recorder.unhandled.length + recorder.commands.length, 0)
    }))
})

describe("clicks", () => {
  const keyboard = { inline_keyboard: [[{ text: "Yes", callback_data: "approve" }]] }
  const message = (extra?: Record<string, unknown>) => ({
    message_id: 5,
    date: 1_800_000_000,
    chat: { id: chatId, type: "supergroup" },
    text: "x",
    reply_markup: keyboard,
    ...extra
  })

  it.effect("dispatches only data from Telegram's copy of the keyboard, and answers every click", () =>
    Effect.gen(function*() {
      const api = makeApi()
      const recorder = makeRecorder()
      yield* receive(
        api,
        recorder,
        callbackUpdate(message(), "approve"),
        callbackUpdate(message(), "forged"),
        callbackUpdate(message({ reply_markup: undefined }), "approve"),
        callbackUpdate(message({ date: 0 }), "approve")
      )
      assert.deepStrictEqual(recorder.clicks.map((click) => [click.id, click.messageId]), [["approve", "5"]])
      assert.strictEqual(api.sent("answerCallbackQuery").length, 4)
    }))
})

describe("excluded contexts", () => {
  it.effect("sends business, channel direct-message and guest updates to onUnhandled", () =>
    Effect.gen(function*() {
      const api = makeApi()
      const recorder = makeRecorder()
      const business = { message_id: 3, date: 1, chat: { id: 1, type: "private" }, business_connection_id: "b" }
      yield* receive(
        api,
        recorder,
        { update_id: 1, business_message: { ...business, text: "hi" } },
        messageUpdate({ text: "hi", business_connection_id: "b" }),
        messageUpdate({ text: "hi", chat: { id: chatId, type: "supergroup", is_direct_messages: true } }),
        messageUpdate({ text: "hi", direct_messages_topic: { topic_id: 1 } }),
        commandUpdate("deploy", "", { business_connection_id: "b" }),
        callbackUpdate({ ...business, reply_markup: { inline_keyboard: [[{ text: "a", callback_data: "a" }]] } }, "a"),
        { update_id: 2, message_reaction: { chat: { id: chatId, type: "supergroup" }, message_id: 1 } }
      )
      assert.strictEqual(recorder.unhandled.length, 7)
      assert.strictEqual(recorder.events.length + recorder.commands.length + recorder.clicks.length, 0)
      assert.strictEqual(api.sent("answerCallbackQuery").length, 1)
    }))

  it("gives no event from the normaliser", () => {
    const update = messageUpdate({ text: "hi", business_connection_id: "b" })
    assert.deepStrictEqual(TelegramChat.normalize(update, context), [])
  })
})

describe("acceptance", () => {
  it("keys deliveries by bot, update and date, and keeps ephemeral commands apart", () => {
    const first = ephemeralCommand("deploy", 7)
    const second = ephemeralCommand("deploy", 8)
    const key = (raw: unknown) => Option.getOrThrow(TelegramChat.deliveryKey(raw, { botId }))
    assert.strictEqual(key(first), `${botId}.${first.update_id}.${first.message.date}`)
    assert.strictEqual(key(structuredClone(first)), key(first))
    assert.notStrictEqual(key(first), key(second))
    const test = TelegramChat.deliveryKey(first, { botId, environment: "test" })
    assert.isTrue(Option.getOrThrow(test).startsWith("test."))
  })

  it.effect("confirms a polled update only after it ran", () =>
    Effect.gen(function*() {
      const api = makeApi()
      const recorder = makeRecorder()
      const first = messageUpdate({ text: "one" })
      const second = messageUpdate({ text: "two" })
      api.updates.push([first, second])
      yield* Layer.build(
        TelegramChat.layerPolling({ onUnhandled: recorder.onUnhandled }).pipe(
          Layer.provideMerge(telegramLayer(api, { unverified })),
          Layer.provide(Layer.succeed(ChatHandler, recorder.handler))
        )
      )
      while (api.sent("getUpdates").length < 2) yield* Effect.yieldNow
      const [start, next] = api.sent("getUpdates")
      assert.isUndefined(start.offset)
      assert.deepStrictEqual(start.allowed_updates, ["message", "channel_post", "callback_query"])
      assert.strictEqual(next.offset, second.update_id + 1)
      assert.strictEqual(recorder.events.length, 2)
    }).pipe(Effect.scoped))

  it.effect("fails to start polling when Telegram answers 409", () =>
    Effect.gen(function*() {
      const api = makeApi()
      api.next.set("getUpdates", apiError(409, "Conflict: can't use getUpdates method while webhook is active"))
      const exit = yield* Layer.build(
        TelegramChat.layerPolling().pipe(
          Layer.provideMerge(telegramLayer(api)),
          Layer.provide(Layer.succeed(ChatHandler, makeRecorder().handler))
        )
      ).pipe(Effect.scoped, Effect.exit)
      assert.isTrue(Exit.isFailure(exit))
      assert.isTrue(Exit.isFailure(exit) && Cause.pretty(exit.cause).includes("conflict"))
    }))
})

describe("commandRequests", () => {
  it.effect("refuses ids Telegram can't register", () =>
    Effect.gen(function*() {
      const ok = ChatInteraction.group(ChatInteraction.command("deploy", { description: "Deploy" }))
      const bad = ChatInteraction.group(ChatInteraction.command("ship-it", { description: "Ship" }))
      assert.deepStrictEqual(yield* TelegramChat.commandRequests(ok), {
        commands: [{ command: "deploy", description: "Deploy" }]
      })
      assert.isTrue(Exit.isFailure(yield* Effect.exit(TelegramChat.commandRequests(bad))))
    }))
})
