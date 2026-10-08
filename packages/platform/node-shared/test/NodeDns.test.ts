import * as NodeDns from "@effect/platform-node-shared/NodeDns"
import { assert, describe, it } from "@effect/vitest"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"

describe("NodeDns", () => {
  it.effect("accepts timeouts and tries that the resolver cannot represent", () =>
    Effect.gen(function*() {
      yield* NodeDns.make({ timeout: Duration.infinity, tries: Infinity })
      yield* NodeDns.make({ timeout: Duration.micros(500n), tries: 1.5 })
      yield* NodeDns.make({ timeout: Duration.zero, tries: 0 })
      yield* NodeDns.make({ timeout: Duration.negativeInfinity, tries: Number.NaN })
    }))

  it("maps error codes to reasons, ignoring Bun's prefix", () => {
    assert.strictEqual(NodeDns.dnsErrorFromCause({ code: "ENOTFOUND" }, "lookup", "a.test").reason, "NotFound")
    assert.strictEqual(NodeDns.dnsErrorFromCause({ code: "DNS_ETIMEOUT" }, "lookup", "a.test").reason, "Timeout")
    assert.strictEqual(NodeDns.dnsErrorFromCause(new Error("boom"), "lookup", "a.test").reason, "Unknown")
  })

  it("converts names returned by resolvers", () => {
    assert.strictEqual(NodeDns.domainNameFromResolverUnsafe(""), ".")
    assert.strictEqual(NodeDns.domainNameFromResolverUnsafe("Example.test"), "example.test.")
    assert.strictEqual(NodeDns.nameTextFromResolver("v2\\.0\\032Caf\\195\\169.test"), "v2\\.0 Café.test.")
    assert.strictEqual(NodeDns.nameTextFromResolver("v2\\.0\\040Caf\\303\\251.test", 8), "v2\\.0 Café.test.")
  })

  it("converts strings and durations returned by resolvers", () => {
    assert.strictEqual(NodeDns.utf8FromLatin1("grÃ¼Ã\u009f"), "grüß")
    assert.strictEqual(NodeDns.utf8FromLatin1("plain"), "plain")
    assert.isTrue(Duration.equals(NodeDns.secondsFromInt32(-1), Duration.seconds(2 ** 32 - 1)))
  })
})
