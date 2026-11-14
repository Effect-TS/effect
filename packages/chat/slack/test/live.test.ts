/**
 * The conformance suite against a real Slack workspace. Opt-in: it runs only
 * when these are set, so CI skips it.
 *
 * - `SLACK_LIVE_BOT_TOKEN`, `SLACK_LIVE_TEAM_ID` and `SLACK_LIVE_CHANNEL`: the
 *   bot and a channel it may write to.
 * - `SLACK_LIVE_USER_TOKEN`: a user token with `chat:write` and
 *   `channels:history`, for the rules that need another identity's
 *   message. Without it those rules fail at `userPosts`.
 * - `SLACK_LIVE_RECIPIENT`: a user id in the channel, the recipient of the
 *   mention rule's streams when `SLACK_LIVE_USER_TOKEN` is not set.
 */
import * as SlackChat from "@effect/chat-slack/SlackChat"
import * as SlackWebApi from "@effect/chat-slack/SlackWebApi"
import { assert, describe, it } from "@effect/vitest"
import * as Chat from "effect/chat/Chat"
import type { ChatError } from "effect/chat/ChatError"
import type * as ChatEvent from "effect/chat/ChatEvent"
import { conformance } from "effect/chat/ChatTest"
import type * as ChatThread from "effect/chat/ChatThread"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Semaphore from "effect/Semaphore"
import { adapter } from "./utils.ts"

const botToken = process.env.SLACK_LIVE_BOT_TOKEN
const userToken = process.env.SLACK_LIVE_USER_TOKEN
const teamId = process.env.SLACK_LIVE_TEAM_ID
const channel = process.env.SLACK_LIVE_CHANNEL
const recipientId = process.env.SLACK_LIVE_RECIPIENT

/** Runs a write again after Slack's retry-after, for the rules that make many. */
const retrying = <A>(effect: Effect.Effect<A, ChatError>): Effect.Effect<A, ChatError> =>
  effect.pipe(Effect.catchIf(
    (error) => error.reason._tag === "RateLimited",
    (error) =>
      Effect.andThen(
        Effect.sleep(error.reason._tag === "RateLimited" ? error.reason.retryAfter ?? Duration.seconds(30) : 0),
        retrying(effect)
      )
  ))

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

/**
 * The Slack mention rule, live. It posts and edits mention-looking strings,
 * in prose and in code, with the entity forms and `<!channel>`, reads each
 * message back and asserts the stored `text` holds no intact token. With
 * `notify` allowed it asserts the token is in `text` and the element is in
 * the blocks.
 *
 * It is a proxy: Slack decides a mention from the stored `text`, which was
 * checked against one client's Activity feed (EFF-3730, EFF-3736). It also
 * makes a file post and a file-only post, and asserts each holds its file
 * after the attach. It streams token shapes split at every position, across
 * two appends and across the start and an append. It reads each stream back
 * while it is open and asserts it holds no token that isn't allowed, and,
 * split across appends, every allowed one. Once stopped, no U+200B is left.
 * The stream needs a recipient, the identity of `SLACK_LIVE_USER_TOKEN` or
 * `SLACK_LIVE_RECIPIENT`. The same assertions run in CI on the request
 * bodies, in `text.test.ts` and `SlackChat.test.ts`.
 */
describe.skipIf(botToken === undefined || teamId === undefined || channel === undefined)("live mention rule", () => {
  const layer = SlackChat.layer({ botToken: Redacted.make(botToken!), teamId: teamId! }).pipe(
    Layer.provideMerge(Chat.layer),
    Layer.provide(FetchHttpClient.layer)
  )
  const token = /<(?:@[UW][A-Z0-9]+|#[CG][A-Z0-9]+|!subteam\^[A-Z0-9]+|!(?:here|channel|everyone))(?:\|[^<>]*)?>/g

  it.live("no token is stored unless allowed, by post and by edit", () =>
    Effect.gen(function*() {
      const api = yield* SlackWebApi.make({ botToken: Redacted.make(botToken!) })
      const self = field(yield* api.call("auth.test", {}), "user_id") as string
      const slack = yield* adapter
      const thread = SlackChat.thread({ team: teamId!, channel: channel! })
      const stored = (ts: string) =>
        api.call("conversations.replies", { channel, ts, latest: ts, oldest: ts, inclusive: true, limit: 1 }).pipe(
          Effect.map((answer) => (field(answer, "messages") as Array<any>).find((message) => message.ts === ts))
        )
      const elements = (blocks: unknown): Array<any> =>
        Array.isArray(blocks) ? blocks.flatMap((block) => [block, ...elements(field(block, "elements"))]) : []
      const inputs = [
        `prose <@${self}> and <!channel> and <!here>`,
        `inline \`<@${self}>\` and a fence\n\`\`\`\n<@${self}> <!channel>\n\`\`\``,
        `entities &lt;@${self}> &#60;@${self}> &#x3C;@${self}> &#060;@${self}> &LT;!channel>`,
        `no semicolon &lt@${self}> &#60@${self}> &#x3c@${self}>`,
        `an unclosed fence\n\`\`\`\n<@${self}>`,
        `nested \`\`a \` <@${self}> \`\` backticks`
      ]
      const posted: Array<string> = []
      const noToken = Effect.fnUntraced(function*(ts: string, label: string) {
        const message = yield* stored(ts)
        assert.deepStrictEqual(message.text.match(token), null, label)
      })
      for (const markdown of inputs) {
        const post = yield* slack.post(thread, { markdown })
        posted.push(post.id)
        yield* noToken(post.id, `post ${markdown}`)
      }
      const edited = yield* slack.post(thread, { markdown: "to be edited" })
      posted.push(edited.id)
      for (const markdown of inputs) {
        yield* slack.edit(thread, edited.id, { markdown })
        yield* noToken(edited.id, `edit ${markdown}`)
      }

      // Allowed: the token is in text and the element in the blocks, by post
      // and by a long edit whose text is cut.
      const allowed = SlackChat.withPostOptions({ notify: { users: [self] } })
      const check = Effect.fnUntraced(function*(ts: string, label: string) {
        const message = yield* stored(ts)
        assert.include(message.text, `<@${self}>`, label)
        assert.isTrue(
          elements(message.blocks).some((element) => element.type === "user" && element.user_id === self),
          label
        )
      })
      const allowedPost = yield* slack.post(thread, { markdown: `allowed <@${self}>` }).pipe(allowed)
      posted.push(allowedPost.id)
      yield* check(allowedPost.id, "post")
      yield* slack.edit(thread, allowedPost.id, { markdown: "x".repeat(6_000) + ` <@${self}>` }).pipe(allowed)
      yield* check(allowedPost.id, "long edit")

      // A file post and a file-only post: the files are attached, and no
      // token is stored, in the Markdown or in a file name.
      const fileIds: Array<string> = []
      const withFile = Effect.fnUntraced(function*(markdown: string, name: string, label: string) {
        const post = yield* slack.post(thread, {
          markdown,
          files: [{ name, contentType: "text/plain", content: new TextEncoder().encode(label) }]
        })
        posted.push(post.id)
        const message = yield* stored(post.id)
        const files: Array<any> = message.files ?? []
        fileIds.push(...files.map((file) => file.id))
        assert.strictEqual(files.length, 1, label)
        assert.deepStrictEqual(message.text.match(token), null, label)
        return message
      })
      yield* withFile(inputs[1], "file.txt", "file post")
      const fileOnly = yield* withFile("", `<@${self}>.txt`, "file-only post")
      assert.strictEqual(fileOnly.text, `&lt;@${self}&gt;.txt`)

      for (const id of posted) yield* slack.delete(thread, id).pipe(Effect.ignore)
      // `delete` keeps a message's files.
      for (const file of fileIds) yield* api.call("files.delete", { file }, { write: true }).pipe(Effect.ignore)
    }).pipe(Effect.provide(layer), Effect.provide(FetchHttpClient.layer)), 600_000)

  it.live(
    "a stream split at every position stores only allowed tokens and leaves no U+200B",
    () =>
      Effect.gen(function*() {
        const api = yield* SlackWebApi.make({ botToken: Redacted.make(botToken!) })
        const self = field(yield* api.call("auth.test", {}), "user_id") as string
        const recipient = userToken === undefined
          ? recipientId
          : field(
            yield* (yield* SlackWebApi.make({ botToken: Redacted.make(userToken) })).call("auth.test", {}),
            "user_id"
          )
        if (recipient === undefined) {
          return yield* Effect.die(new Error("set SLACK_LIVE_USER_TOKEN or SLACK_LIVE_RECIPIENT"))
        }
        const slack = yield* adapter
        const native = slack.nativeStream!
        const root = yield* Effect.acquireRelease(
          slack.post(SlackChat.thread({ team: teamId!, channel: channel! }), { markdown: "streams" }),
          (root) =>
            retrying(slack.delete(SlackChat.thread({ team: teamId!, channel: channel! }), root.id)).pipe(Effect.ignore)
        )
        const thread = SlackChat.thread({ team: teamId!, channel: channel!, threadTs: root.id })
        const stored = (ts: string) =>
          api.call("conversations.replies", { channel, ts, latest: ts, oldest: ts, inclusive: true, limit: 2 }).pipe(
            Effect.map((answer) => (field(answer, "messages") as Array<any>).find((message) => message.ts === ts))
          )
        const none: ReadonlyArray<string> = []
        const inputs: ReadonlyArray<readonly [string, ReadonlyArray<string>]> = [
          [`<@${self}>`, none],
          [`<@${self}>`, [self]],
          [`<@${self}|hello world>`, [self]],
          [`&lt;@${self}>`, none],
          [`<&commat;${self}>`, none],
          [`&#x3C;!here>`, none],
          [`&#0000000000000060;@${self}>`, none],
          [`&#x00000000003c;&#00000000064;${self}>`, none],
          [`\`<!channel>\``, none],
          // Without the semicolon nothing decodes.
          [`&lt@${self}> &#60@${self}>`, none]
        ]
        const tokens = (text: string) => text.match(token) ?? []
        const streamed = Effect.fnUntraced(function*(
          markdown: string,
          users: ReadonlyArray<string>,
          at: number,
          across: "appends" | "start"
        ) {
          const label = `${JSON.stringify(markdown)} at ${at} across ${across} allowing ${users}`
          const allowed = (found: string) => users.some((id) => found.startsWith(`<@${id}`))
          const first = markdown.slice(0, at)
          const { id } = yield* Effect.acquireRelease(
            retrying(native.start(thread, { markdown: across === "start" ? "s " + first : "s ", recipient })),
            ({ id }) => retrying(slack.delete(thread, id)).pipe(Effect.ignore)
          )
          if (across === "start") {
            yield* retrying(native.append(thread, id, markdown.slice(at), { flush: true }))
          } else {
            const { held } = yield* retrying(native.append(thread, id, first, undefined))
            yield* retrying(
              native.append(thread, id, first.slice(first.length - held) + markdown.slice(at), { flush: true })
            )
          }
          // What the stream stored, which is what Slack decided mentions from.
          const open = (yield* stored(id)).text as string
          assert.deepStrictEqual(tokens(open).filter((found) => !allowed(found)), [], label)
          // Held text keeps an allowed token whole. The start holds nothing, so it may break one.
          if (across === "appends") assert.strictEqual(tokens(open).length, users.length, label)
          yield* retrying(native.stop(thread, id, { end: "done" }))
          const message = yield* stored(id)
          assert.deepStrictEqual(tokens(message.text).filter((found) => !allowed(found)), [], label)
          assert.notInclude(JSON.stringify([message.text, message.blocks]), "\u200B", label)
        }, (effect, _markdown, users) =>
          SlackChat.withPostOptions({ notify: { users } })(effect), Effect.scoped)
        for (const [markdown, users] of inputs) {
          for (let at = 0; at <= markdown.length; at++) {
            yield* streamed(markdown, users, at, "appends")
            yield* streamed(markdown, users, at, "start")
          }
        }
      }).pipe(Effect.scoped, Effect.provide(layer), Effect.provide(FetchHttpClient.layer)),
    7_200_000
  )
})
