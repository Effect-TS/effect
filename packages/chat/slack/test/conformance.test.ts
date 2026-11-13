/**
 * The conformance rules for buttons, selects and modals, against the adapter
 * over a stubbed Web API that keeps what was posted. Clicks and submits are
 * built from the posted blocks and the opened views and go through
 * `SlackChat.interaction`, so the answers are tested too.
 */
import * as SlackChat from "@effect/chat-slack/SlackChat"
import { describe, it } from "@effect/vitest"
import { conformance } from "effect/chat/ChatTest"
import * as Effect from "effect/Effect"
import { makeSlack } from "./slack.ts"
import { channel, slackLayer, team } from "./utils.ts"

const thread = SlackChat.thread({ team, channel })

const portable = (name: string) =>
  name.startsWith("actions/") ||
  name.startsWith("modal/") ||
  name.startsWith("edit/") && name.endsWith("Actions") ||
  name.startsWith("descriptor/measure") && name.endsWith("Actions") ||
  name === "unsupported/buttons" ||
  name === "unsupported/selects" ||
  name === "unsupported/modals"

const options = {
  platform: "slack",
  thread,
  userPosts: () => Effect.die("unused"),
  parseMention: SlackChat.parseMention
}

describe("conformance over the stubbed Web API", () => {
  const names = Object.keys(conformance({
    ...options,
    interactions: { click: () => Effect.void, submit: () => Effect.void }
  })).filter(portable)

  for (const name of names) {
    it.effect(name, () => {
      const slack = makeSlack()
      const rules = conformance({ ...options, interactions: slack.interactions })
      return Effect.andThen(slack.bind, rules[name]).pipe(Effect.provide(slackLayer(slack.fake)))
    })
  }
})
