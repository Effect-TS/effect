/**
 * The conformance suite against a real Slack workspace. Opt-in: it runs only
 * when these are set, so CI skips it.
 *
 * - `SLACK_LIVE_BOT_TOKEN`, `SLACK_LIVE_TEAM_ID` and `SLACK_LIVE_CHANNEL`: the
 *   bot and a channel it may write to.
 * - `SLACK_LIVE_USER_TOKEN`: a user token with `chat:write` and
 *   `channels:history`, for the rules that need another identity's
 *   message. Without it those rules fail at `userPosts`.
 */
import * as SlackChat from "@effect/chat-slack/SlackChat"
import * as SlackWebApi from "@effect/chat-slack/SlackWebApi"
import { describe, it } from "@effect/vitest"
import * as Chat from "effect/chat/Chat"
import type * as ChatEvent from "effect/chat/ChatEvent"
import { conformance } from "effect/chat/ChatTest"
import type * as ChatThread from "effect/chat/ChatThread"
import * as Effect from "effect/Effect"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Semaphore from "effect/Semaphore"

const botToken = process.env.SLACK_LIVE_BOT_TOKEN
const userToken = process.env.SLACK_LIVE_USER_TOKEN
const teamId = process.env.SLACK_LIVE_TEAM_ID
const channel = process.env.SLACK_LIVE_CHANNEL

const field = (u: unknown, key: string): any =>
  typeof u === "object" && u !== null && !Array.isArray(u) ? (u as Record<string, unknown>)[key] : undefined

describe.skipIf(botToken === undefined || teamId === undefined || channel === undefined)("live conformance", () => {
  const layer = SlackChat.layer({ botToken: Redacted.make(botToken!), teamId: teamId! }).pipe(
    Layer.provideMerge(Chat.layer),
    Layer.provide(FetchHttpClient.layer)
  )

  /** Posts as the user, reads the message back and normalises it as an inbound `message` event. */
  const userPosts = (thread: ChatThread.ChatThread, text: string): Effect.Effect<ChatEvent.ChatEvent> =>
    Effect.gen(function*() {
      if (userToken === undefined) return yield* Effect.die(new Error("SLACK_LIVE_USER_TOKEN is not set"))
      const user = yield* SlackWebApi.make({ botToken: Redacted.make(userToken) })
      const bot = yield* SlackWebApi.make({ botToken: Redacted.make(botToken!) })
      const parts = SlackChat.parts(thread)
      if (parts._tag === "None") return yield* Effect.die(new Error("not a Slack thread"))
      const { threadTs } = parts.value
      const posted = yield* user.call("chat.postMessage", {
        channel: parts.value.channel,
        text,
        ...(threadTs === undefined ? {} : { thread_ts: threadTs })
      }, { write: true })
      const ts = field(posted, "ts")
      const read = yield* user.call("conversations.replies", {
        channel: parts.value.channel,
        ts,
        latest: ts,
        oldest: ts,
        inclusive: true,
        limit: 1
      })
      const messages = field(read, "messages")
      const message = Array.isArray(messages) ? messages.find((m: any) => m.ts === ts) : undefined
      const auth = yield* bot.call("auth.test", {})
      const events = SlackChat.normalize({
        type: "event_callback",
        team_id: parts.value.team,
        event: { ...message, type: "message", channel: parts.value.channel, event_ts: ts }
      }, { teamId: parts.value.team, botUserId: field(auth, "user_id") ?? "" })
      if (events.length !== 1) return yield* Effect.die(new Error(`userPosts normalised to ${events.length} events`))
      return events[0]
    }).pipe(Effect.provide(FetchHttpClient.layer), Effect.orDie)

  const rules = conformance({
    platform: "slack",
    thread: SlackChat.thread({ team: teamId ?? "", channel: channel ?? "" }),
    userPosts,
    parseMention: SlackChat.parseMention
  })

  // The rules share one channel and the project runs tests concurrently, so
  // one rule at a time.
  const one = Semaphore.makeUnsafe(1)
  for (const [name, rule] of Object.entries(rules)) {
    it.live(name, () => rule.pipe(Effect.provide(layer), Semaphore.withPermits(one, 1)), 600_000)
  }
})
