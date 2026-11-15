/**
 * The conformance suite against the default layer, over a stubbed Connector
 * that answers every write. Capabilities behind `unverified` are off, so
 * their rules check that the descriptor leaves them out and the ops refuse.
 */
import * as TeamsChat from "@effect/chat-teams/TeamsChat"
import { describe, it } from "@effect/vitest"
import * as Chat from "effect/chat/Chat"
import { conformance } from "effect/chat/ChatTest"
import * as Digest from "effect/crypto/Digest"
import * as Mac from "effect/crypto/Mac"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"

const appId = "00000000-0000-0000-0000-0000000000a1"
const tenantId = "00000000-0000-0000-0000-0000000000b2"
const conversationId = "19:conformance@thread.tacv2"
const thread = TeamsChat.thread(conversationId)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

const makeConnector = () => {
  let next = 1_700_000_000_000
  const posted = new Set<string>()
  return HttpClient.make((request, url) =>
    Effect.sync(() => {
      let response: Response
      if (url.host === "login.microsoftonline.com") {
        response = json({ access_token: "token", expires_in: 3600, token_type: "Bearer" })
      } else if (request.method === "POST") {
        const id = String(next++)
        posted.add(id)
        response = json({ id })
      } else if (request.method === "PUT" || request.method === "DELETE") {
        const id = decodeURIComponent(url.pathname.split("/").pop()!)
        const known = posted.has(id)
        if (request.method === "DELETE") posted.delete(id)
        response = known ? json({}) : json({ error: { code: "ActivityNotFound" } }, 404)
      } else if (url.pathname.includes("/members/")) {
        response = json({ id: "29:user", aadObjectId: "user", name: "User" })
      } else response = json({ members: [] })
      return HttpClientResponse.fromWeb(request, response)
    })
  )
}

const layer = () =>
  TeamsChat.layer({ appId, tenantId, credentials: Redacted.make("secret") }).pipe(
    Layer.provideMerge(Chat.layer),
    Layer.provide(Layer.succeed(HttpClient.HttpClient, makeConnector())),
    Layer.provide(Layer.mergeAll(Digest.layerWebCrypto, Mac.layerWebCrypto)),
    Layer.provide(SecureRandom.layerWebCrypto)
  )

let sequence = 0

const options = {
  platform: "teams",
  thread,
  parseMention: TeamsChat.parseMention,
  userPosts: (at: typeof thread, text: string) =>
    Effect.sync(() => {
      const parts = TeamsChat.parts(at)
      const id = String(1_800_000_000_000 + sequence++)
      const events = TeamsChat.normalize({
        type: "message",
        id,
        timestamp: new Date().toISOString(),
        serviceUrl: "https://smba.trafficmanager.net/teams",
        channelId: "msteams",
        from: { id: "29:user", aadObjectId: "user", name: "User" },
        recipient: { id: `28:${appId}`, name: "Bot" },
        conversation: {
          id: parts._tag === "Some" ? parts.value.conversationId : conversationId,
          conversationType: "channel",
          tenantId
        },
        channelData: { tenant: { id: tenantId } },
        textFormat: "plain",
        text
      }, { appId })
      return events[0]!
    })
}

describe("conformance over the stubbed Connector", () => {
  const names = Object.keys(conformance(options))
  for (const name of names) {
    it.effect(name, () => conformance(options)[name].pipe(Effect.provide(layer())))
  }
})
