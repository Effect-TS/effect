import * as Envelope from "@effect/chat-teams/internal/envelope"
import { assert, describe, it } from "@effect/vitest"
import type * as ChatUi from "effect/chat/ChatUi"
import { Digest, Mac, SecureRandom } from "effect/crypto"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"

const layer = Layer.mergeAll(Digest.layerWebCrypto, Mac.layerWebCrypto).pipe(
  Layer.provideMerge(SecureRandom.layerWebCrypto)
)

const k1 = Redacted.make({ kty: "oct", kid: "k1", k: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc" } as const)
const k2 = Redacted.make({ kty: "oct", kid: "k2", k: "CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg" } as const)

const options = { appId: "app-1", tenantId: "tenant-1" }
const conversation = "19:abc@thread.tacv2"

describe("envelope", () => {
  it.effect("round trips a button, from any message of the conversation", () =>
    Effect.gen(function*() {
      const envelope = yield* Envelope.make({ ...options, keys: [k1] })
      const token = yield* envelope.signButton(conversation, { id: "approve", value: "42" })
      const verified = yield* envelope.verifyButton(token, { conversationId: `${conversation};messageid=123` })
      assert.deepStrictEqual(verified, Option.some({ id: "approve", value: "42" }))
    }).pipe(Effect.provide(layer)))

  it.effect("refuses another conversation, a tampered token and an unknown kid", () =>
    Effect.gen(function*() {
      const envelope = yield* Envelope.make({ ...options, keys: [k1] })
      const token = yield* envelope.signButton(conversation, { id: "approve" })
      assert.isTrue(Option.isNone(yield* envelope.verifyButton(token, { conversationId: "19:other@thread.tacv2" })))

      const [header, payload, signature] = token.split(".")
      const tampered = `${header}.${payload}.${signature.slice(0, -2)}${signature.endsWith("AA") ? "BA" : "AA"}`
      assert.isTrue(Option.isNone(yield* envelope.verifyButton(tampered, { conversationId: conversation })))

      const other = yield* Envelope.make({ ...options, keys: [k2] })
      const unknownKid = yield* other.signButton(conversation, { id: "approve" })
      assert.isTrue(Option.isNone(yield* envelope.verifyButton(unknownKid, { conversationId: conversation })))

      const rotated = yield* Envelope.make({ ...options, keys: [k2, k1] })
      assert.isTrue(Option.isSome(yield* rotated.verifyButton(token, { conversationId: conversation })))
    }).pipe(Effect.provide(layer)))

  it.effect("buttonTokenLength is the length of the signed token", () =>
    Effect.gen(function*() {
      const envelope = yield* Envelope.make({ ...options, keys: [k1] })
      for (const button of [{ id: "a" }, { id: "pick", value: "caf\u00e9 \"quoted\" \u{1F600}" }]) {
        const token = yield* envelope.signButton(conversation, button)
        assert.strictEqual(Envelope.buttonTokenLength({ ...options, kid: "k1" }, button), token.length)
        assert.isTrue(token.length <= Envelope.maxTokenLength)
      }
    }).pipe(Effect.provide(layer)))

  it.effect("round trips a dialog and checks its submit against the definition", () =>
    Effect.gen(function*() {
      const envelope = yield* Envelope.make({ ...options, keys: [k1] })
      const modal: ChatUi.Modal = {
        _tag: "Modal",
        id: "deploy",
        title: "Deploy",
        metadata: "m",
        elements: [
          { _tag: "SelectInput", id: "env", label: "Env", options: [{ label: "Prod", value: "prod" }] },
          { _tag: "TextInput", id: "note", label: "Note", optional: true }
        ]
      }
      const token = yield* envelope.signDialog(conversation, { userId: "u1", messageId: "m1", modal })
      assert.isTrue(Option.isNone(yield* envelope.verifyDialog(token, { conversationId: conversation, userId: "u2" })))
      const verified = yield* envelope.verifyDialog(token, { conversationId: conversation, userId: "u1" })
      assert.deepStrictEqual(verified, Option.some({ messageId: "m1", modal }))
      assert.deepStrictEqual(
        Envelope.validateSubmission(modal, { effect: token, env: "prod", note: "" }),
        Option.some({ env: "prod" })
      )
      assert.isTrue(Option.isNone(Envelope.validateSubmission(modal, { env: "staging" })))
    }).pipe(Effect.provide(layer)))
})
