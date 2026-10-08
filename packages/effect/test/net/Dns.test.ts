import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, Equal, Hash, Result, Schema } from "effect"
import * as Dns from "effect/net/Dns"
import * as Host from "effect/net/Host"
import * as NetAddress from "effect/net/NetAddress"

const ip = NetAddress.ipFromStringUnsafe
const name = Host.domainNameFromStringUnsafe

const srv = (target: string, priority: number, weight: number) =>
  Dns.makeRecordUnsafe("SRV", { target: name(target), port: 5432, priority, weight })

describe("Dns", () => {
  describe("records", () => {
    it("rejects invalid fields", () => {
      assert.isTrue(
        Result.isFailure(Dns.makeRecord("SRV", { target: name("a.b"), port: 70000, priority: 0, weight: 0 }))
      )
      assert.isTrue(Result.isFailure(Dns.makeRecord("MX", { exchange: name("a.b"), priority: 1.5 })))
      assert.isTrue(Result.isFailure(Dns.makeRecord("CNAME", { target: "not a name" as Host.DomainName })))
      assert.isTrue(
        Result.isFailure(Dns.makeRecord("A", { address: ip("2001:db8::1") as NetAddress.Ipv4Address }))
      )
    })

    it("formats records in presentation format", () => {
      assert.strictEqual(Dns.formatRecord(srv("db.internal", 10, 5)), "SRV 10 5 5432 db.internal")
      assert.strictEqual(
        Dns.formatRecord(Dns.makeRecordUnsafe("TXT", { chunks: ["a \"b\"", "ü"] })),
        "TXT \"a \\\"b\\\"\" \"\\195\\188\""
      )
      assert.strictEqual(
        Dns.formatRecord(Dns.makeRecordUnsafe("PTR", { host: "Office Printer._ipp._tcp.local." })),
        "PTR Office\\032Printer._ipp._tcp.local."
      )
    })

    it("implements equality and hashing", () => {
      const a = srv("db.internal", 10, 5)
      assert.isTrue(Equal.equals(a, srv("db.internal", 10, 5)))
      assert.strictEqual(Hash.hash(a), Hash.hash(srv("db.internal", 10, 5)))
      assert.isFalse(Equal.equals(a, srv("db.internal", 10, 6)))
    })

    it("builds reverse lookup names", () => {
      assert.strictEqual(Dns.reverseName(ip("192.0.2.1")), "1.2.0.192.in-addr.arpa")
      assert.strictEqual(
        Dns.reverseName(ip("2001:db8::567:89ab")),
        "b.a.9.8.7.6.5.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa"
      )
    })

    it("encodes and decodes JSON", () => {
      const codec = Schema.toCodecJson(Schema.DnsRecord)
      const soa = Dns.makeRecordUnsafe("SOA", {
        primary: name("ns.example.com"),
        admin: "hostmaster.example.com",
        serial: 1,
        refresh: Duration.hours(1),
        retry: Duration.minutes(10),
        expire: Duration.days(7),
        minimum: Duration.minutes(5)
      })
      const json = {
        _tag: "SOA",
        primary: "ns.example.com",
        admin: "hostmaster.example.com",
        serial: 1,
        refresh: 3600,
        retry: 600,
        expire: 604800,
        minimum: 300
      }
      assert.deepStrictEqual(Schema.encodeSync(codec)(soa), json)
      assert.isTrue(Equal.equals(Schema.decodeUnknownSync(codec)(json), soa))
      assert.throws(() => Schema.decodeUnknownSync(codec)({ _tag: "CNAME", target: "Example.com" }))
    })
  })

  describe("service", () => {
    it.effect("filters and deduplicates results, and fails on empty results", () =>
      Effect.gen(function*() {
        const dns = Dns.make({
          lookup: () => Effect.succeed([ip("10.0.0.1"), ip("::1"), ip("10.0.0.1")]),
          resolve: () => Effect.succeed([])
        })
        const all = yield* dns.lookup(name("a.b"))
        assert.deepStrictEqual(all.map(NetAddress.formatIp), ["10.0.0.1", "::1"])
        const v6 = yield* dns.lookup(name("a.b"), { family: "IPv6" })
        assert.deepStrictEqual(v6.map(NetAddress.formatIp), ["::1"])
        const error = yield* Effect.flip(dns.resolve(name("a.b"), "MX"))
        assert.strictEqual(error.reason, "NotFound")
      }))

    it.effect("derives reverse lookups from PTR queries", () =>
      Effect.gen(function*() {
        const dns = Dns.make({
          lookup: () => Effect.succeed([]),
          resolve: (hostname, type) =>
            hostname === "1.2.0.192.in-addr.arpa"
              ? Effect.succeed([
                Dns.makeRecordUnsafe("PTR", { host: "web.example.com." }),
                Dns.makeRecordUnsafe("PTR", { host: "not a host.example.com." })
              ])
              : Effect.fail(
                new Dns.DnsError({ reason: "ServerFailure", method: "resolve", hostname, recordType: type })
              )
        })
        assert.deepStrictEqual<ReadonlyArray<string>>(yield* dns.reverse(ip("192.0.2.1")), ["web.example.com."])
        const error = yield* Effect.flip(dns.reverse(ip("192.0.2.2")))
        assert.strictEqual(error.reason, "ServerFailure")
        assert.strictEqual(error.method, "reverse")
        assert.strictEqual(error.hostname, "192.0.2.2")
      }))

    it.effect("answers from a static zone", () =>
      Effect.gen(function*() {
        const dns = yield* Dns.Dns
        const addresses = yield* dns.lookup(name("DB.internal."))
        assert.deepStrictEqual(addresses.map(NetAddress.formatIp), ["10.0.0.5"])
        const records = yield* dns.resolve(name("example.com"), "MX")
        assert.deepStrictEqual(records.map(Dns.formatRecord), ["MX 10 mail.example.com"])
        assert.deepStrictEqual<ReadonlyArray<string>>(yield* dns.reverse(ip("10.0.0.5")), ["db.internal"])
        const missing = yield* Effect.flip(dns.lookup(name("missing.internal")))
        assert.strictEqual(missing.reason, "NotFound")
      }).pipe(Effect.provide(Dns.layerStatic({
        hosts: { "db.internal": [ip("10.0.0.5")] },
        records: {
          "example.com": [Dns.makeRecordUnsafe("MX", { exchange: name("mail.example.com"), priority: 10 })]
        }
      }))))
  })
})
