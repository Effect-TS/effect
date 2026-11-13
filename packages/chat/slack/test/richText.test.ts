import * as SlackChat from "@effect/chat-slack/SlackChat"
import { assert, describe, it } from "@effect/vitest"
import type * as ChatEvent from "effect/chat/ChatEvent"
import { checkMessage } from "effect/chat/ChatTest"
import * as Effect from "effect/Effect"
import * as fs from "node:fs"
import { botUserId, checkOptions, fixture, messageEnvelope, team } from "./utils.ts"

const context = { teamId: team, botUserId }

const read = Effect.fnUntraced(function*(message: Record<string, unknown>) {
  const events = SlackChat.normalize(messageEnvelope(message), context)
  assert.strictEqual(events.length, 1)
  const event = events[0] as ChatEvent.MessageCreated
  assert.strictEqual(event._tag, "MessageCreated")
  // Includes that each mention's span parses as its token.
  yield* checkMessage(event.message, checkOptions)
  return event.message
})

/** A message a recorded read returned, by ts, edited or not. */
const recorded = (name: string, ts: string, edited = false): Record<string, unknown> => {
  for (const call of fixture(name).calls) {
    for (const message of call.response?.messages ?? []) {
      if (message.ts === ts && (message.edited !== undefined) === edited) return message
    }
  }
  throw new Error(`no message ${ts} in ${name}`)
}

const synthetic: {
  readonly synthetic: string
  readonly cases: ReadonlyArray<{ readonly name: string; readonly markdown: string; readonly message: any }>
} = JSON.parse(fs.readFileSync(new URL("./fixtures/synthetic/own-messages.json", import.meta.url), "utf8"))

describe("the bot's own messages read back", () => {
  it.effect("give the Markdown they were posted with, from recordings", () =>
    Effect.gen(function*() {
      // The fixture posted raw markdown_text with `&lt;not a tag&gt;` typed
      // as entities. Through the adapter the same message is `<not a tag>`.
      const mentionsPost = fixture("markdown-mentions").calls[0].request.markdown_text as string
      const cases: ReadonlyArray<readonly [name: string, ts: string, markdown: string, edited?: boolean]> = [
        ["thread-root-before-after", "1794509000.352789", "Fixture: thread root (no mentions). Some *markdown* here."],
        ["markdown-mentions", "1794509003.143939", mentionsPost.replace("&lt;not a tag&gt;", "<not a tag>")],
        ["thread-broadcast", "1794509004.811879", `Fixture: broadcast reply to <@${botUserId}>`],
        ["file-share", "1794509028.831169", `Fixture: file for <@${botUserId}>`],
        // Two appends.
        ["stream", "1794509111.134189", `Streaming **part one**. Part two with <@${botUserId}>.`],
        ["unfurl-edit", "1794509128.969019", "now with a link: https://github.com/Effect-TS/effect", true],
        ["unfurl-edit", "1794509129.029199", "Fixture control: https://github.com/Effect-TS/effect"]
      ]
      for (const [name, ts, markdown, edited] of cases) {
        const message = recorded(name, ts, edited)
        const read_ = yield* read(message)
        assert.strictEqual(read_.text, markdown, name)
        // Slack's own field stays on raw.
        assert.strictEqual((read_.raw as any).text, message.text, name)
      }
      // Slack stored the markdown-mentions text with its fence on one line.
      assert.notStrictEqual(recorded("markdown-mentions", "1794509003.143939").text, mentionsPost)
    }))

  it.effect("mentions are the elements outside code, at the offsets the renderer wrote", () =>
    Effect.gen(function*() {
      const message = yield* read(recorded("markdown-mentions", "1794509003.143939"))
      // The inline code and the fence hold the same tokens, as literals.
      assert.deepStrictEqual(message.mentions.map((mention) => [mention.kind, mention.id, mention.isSelf]), [
        ["user", botUserId, true],
        ["channel", "C0CH1LGJ4F3", false]
      ])
    }))

  it.effect("a me_message drops the label Slack wrote into the token", () =>
    Effect.gen(function*() {
      const stored = recorded("me-message", "1794509006.465359")
      assert.strictEqual(stored.text, `Fixture: me message waves at <@${botUserId}|janitor2>`)
      const message = yield* read(stored)
      assert.strictEqual(message.text, `Fixture: me message waves at <@${botUserId}>`)
    }))

  it.effect("an agent DM thread root", () =>
    Effect.gen(function*() {
      const stored = recorded("assistant-thread-root", "1794454526.171439")
      assert.isDefined(stored.agent_session)
      const message = yield* read(stored)
      assert.strictEqual(message.text, stored.text)
      assert.isTrue(message.author.isSelf)
    }))

  it.effect("give the Markdown they were posted with, from synthetic messages", () =>
    Effect.gen(function*() {
      assert.match(synthetic.synthetic, /^Hand-written, not read back from Slack/)
      for (const { markdown, message, name } of synthetic.cases) {
        assert.strictEqual((yield* read(message)).text, markdown, name)
      }
    }))

  it.effect("someone else's message keeps Slack's text", () =>
    Effect.gen(function*() {
      for (const { message, name } of synthetic.cases) {
        const { app_id: _app, bot_id: _bot, ...rest } = message
        const other = { ...rest, user: "U080YLYB277" }
        const read_ = yield* read(other)
        assert.strictEqual(read_.text, message.text, name)
      }
    }))
})
