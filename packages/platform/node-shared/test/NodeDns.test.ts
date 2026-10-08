import * as NodeDns from "@effect/platform-node-shared/NodeDns"
import { assert, describe, it } from "@effect/vitest"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Dns from "effect/net/Dns"
import * as NetAddress from "effect/net/NetAddress"
import * as Result from "effect/Result"

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
    const failed = NodeDns.dnsErrorFromCause({ code: "EAI_FAIL" }, "lookup", "a.test")
    assert.strictEqual(failed.reason, "Refused")
    assert.isFalse(failed.isTemporary)
    assert.strictEqual(NodeDns.dnsErrorFromCause({ code: "ENONAME" }, "lookup", "a.test").reason, "BadName")
    assert.strictEqual(NodeDns.dnsErrorFromCause(new Error("boom"), "lookup", "a.test").reason, "Unknown")
  })

  it("converts names returned by resolvers", () => {
    assert.strictEqual(NodeDns.domainNameFromResolverUnsafe(""), ".")
    assert.strictEqual(NodeDns.domainNameFromResolverUnsafe("Example.test"), "example.test.")
    assert.strictEqual(NodeDns.nameTextFromResolver("v2\\.0\\032Caf\\195\\169.test"), "v2\\.0 Café.test.")
    assert.strictEqual(NodeDns.nameTextFromResolver("v2\\.0\\040Caf\\303\\251.test", 8), "v2\\.0 Café.test.")
    assert.strictEqual(NodeDns.nameTextFromResolver("Printer\\032\\(Office\\)\\;x.local"), "Printer (Office);x.local.")
    assert.strictEqual(NodeDns.nameTextFromResolver("a\\\"b\\$c\\@d.local"), "a\"b$c@d.local.")
    assert.strictEqual(NodeDns.nameTextFromResolver("raw café.local"), "raw café.local.")
  })

  it("fails when every record of an answer is skipped", () => {
    const mx = (exchange: string) => ({ exchange, priority: 10 })
    const convert = (entries: ReadonlyArray<{ readonly exchange: string; readonly priority: number }>) =>
      NodeDns.recordsFromResolver("example.test", "MX", entries, (entry) => ({
        exchange: NodeDns.domainNameFromResolverUnsafe(entry.exchange),
        priority: entry.priority
      }))
    const some = Result.getOrThrow(convert([mx("bad\\032host.example.test"), mx("mail.example.test")]))
    assert.deepStrictEqual(some.map(Dns.formatRecord), ["MX 10 mail.example.test."])
    assert.deepStrictEqual(Result.getOrThrow(convert([])), [])
    const error = Result.getOrThrow(Result.flip(convert([mx("bad\\032host.example.test")])))
    assert.strictEqual(error.reason, "InvalidResponse")
    assert.strictEqual(error.recordType, "MX")
    assert.strictEqual(error.hostname, "example.test")
  })

  it("converts the entries of address lookups", () => {
    const addresses = NodeDns.addressesFromLookup([
      { address: "fe80::1%eth0" },
      { address: "not an address" },
      { address: "192.0.2.1" }
    ])
    assert.deepStrictEqual(addresses.map(NetAddress.formatIp), ["fe80::1", "192.0.2.1"])
  })

  it("converts strings and durations returned by resolvers", () => {
    assert.strictEqual(NodeDns.utf8FromLatin1("grÃ¼Ã\u009f"), "grüß")
    assert.strictEqual(NodeDns.utf8FromLatin1("plain"), "plain")
    assert.isTrue(Duration.equals(NodeDns.secondsFromInt32(-1), Duration.seconds(2 ** 32 - 1)))
  })
})
