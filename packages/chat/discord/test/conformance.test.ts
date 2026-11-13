/**
 * The conformance rules for files, buttons and modals, against the adapter
 * over a stubbed `DiscordREST` that keeps what was posted. Clicks and
 * submits are built from the posted components and go through
 * `DiscordChat.interaction`, so the callback answers are tested too.
 */
import * as DiscordChat from "@effect/chat-discord/DiscordChat"
import { describe, it } from "@effect/vitest"
import { conformance } from "effect/chat/ChatTest"
import * as Effect from "effect/Effect"
import { makeDiscord } from "./discord.ts"
import { discordLayer, scratch } from "./utils.ts"

const portable = (name: string) =>
  name === "post/refusedFile" ||
  name.startsWith("actions/") ||
  name.startsWith("modal/") ||
  name.startsWith("edit/") && name.endsWith("Actions") ||
  name.startsWith("descriptor/measure") && name.endsWith("Actions") ||
  name === "unsupported/buttons" ||
  name === "unsupported/selects" ||
  name === "unsupported/modals"

describe("conformance over the stubbed DiscordREST", () => {
  const names = Object.keys(conformance({
    platform: "discord",
    thread: DiscordChat.thread(scratch),
    userPosts: () => Effect.die("unused"),
    parseMention: DiscordChat.parseMention,
    refuseFiles: () => Effect.void,
    interactions: { click: () => Effect.void, submit: () => Effect.void }
  })).filter(portable)

  for (const name of names) {
    it.effect(name, () => {
      const discord = makeDiscord()
      const rules = conformance({
        platform: "discord",
        thread: DiscordChat.thread(scratch),
        userPosts: () => Effect.die("unused"),
        parseMention: DiscordChat.parseMention,
        refuseFiles: discord.refuseFiles,
        interactions: discord.interactions
      })
      return Effect.andThen(discord.bind, rules[name]).pipe(Effect.provide(discordLayer(discord.fake)))
    })
  }
})
