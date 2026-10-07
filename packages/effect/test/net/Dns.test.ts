import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, Equal, Hash, Result, Schema } from "effect"
import * as Dns from "effect/net/Dns"
import * as Host from "effect/net/Host"
import * as NetAddress from "effect/net/NetAddress"

const ip = NetAddress.ipFromStringUnsafe
const name = Host.domainNameFromStringUnsafe
const endpoint = Host.hostPortFromStringUnsafe

const srv = (target: string, priority: number, weight: number) =>
  Dns.makeRecordUnsafe("SRV", { target: name(target), port: 5432, priority, weight })

const zone = Dns.layerStatic({
  hosts: {
    "db.internal": [ip("10.0.0.5"), ip("fd00::5")],
    "v4.internal": [ip("10.0.0.4")]
  },
  records: {
    "alias.internal": [Dns.makeRecordUnsafe("CNAME", { target: name("db.internal") })],
    "www.example.com": [
      Dns.makeRecordUnsafe("CNAME", { target: name("example.com") })
    ],
    "example.com": [
      Dns.makeRecordUnsafe("A", { address: ip("192.0.2.1") as NetAddress.Ipv4Address }),
      Dns.makeRecordUnsafe("TXT", { chunks: ["v=spf1 ", "-all"] })
    ],
    "_pg._tcp.db.internal": [srv("db1.internal", 10, 5), srv("db2.internal", 20, 0)],
    "1.2.0.192.in-addr.arpa": [Dns.makeRecordUnsafe("PTR", { host: name("example.com") })]
  }
})

describe("Dns", () => {
  describe("records", () => {
    it("constructs immutable record values", () => {
      const record = Dns.makeRecordUnsafe("CNAME", { target: name("example.com") })
      assert.isTrue(Dns.isDnsRecord(record))
      assert.isTrue(Object.isFrozen(record))
      assert.deepStrictEqual(record.toJSON(), { _tag: "CNAME", target: "example.com" })
      assert.strictEqual(String(record), "CNAME example.com")
      assert.isFalse(Dns.isDnsRecord({ _tag: "CNAME", target: "example.com" }))
      assert.isFalse(Equal.equals(record, { _tag: "CNAME", target: "example.com" }))
    })

    it("checks constraints the field types cannot express", () => {
      const invalid: ReadonlyArray<Result.Result<Dns.DnsRecord, NetAddress.NetAddressError>> = [
        Dns.makeRecord("SRV", { target: name("a.b"), port: 70000, priority: 0, weight: 0 }),
        Dns.makeRecord("SRV", { target: name("a.b"), port: 1, priority: -1, weight: 0 }),
        Dns.makeRecord("MX", { exchange: name("a.b"), priority: 1.5 }),
        Dns.makeRecord("NAPTR", {
          order: 65536,
          preference: 0,
          flags: "",
          service: "",
          regexp: "",
          replacement: name(".")
        }),
        Dns.makeRecord("CAA", { critical: false, tag: "not a tag", value: "" }),
        Dns.makeRecord("SOA", {
          primary: name("a.b"),
          admin: name("a.b"),
          serial: 2 ** 32,
          refresh: Duration.zero,
          retry: Duration.zero,
          expire: Duration.zero,
          minimum: Duration.zero
        }),
        Dns.makeRecord("SOA", {
          primary: name("a.b"),
          admin: name("a.b"),
          serial: 1,
          refresh: Duration.infinity,
          retry: Duration.zero,
          expire: Duration.zero,
          minimum: Duration.zero
        })
      ]
      for (const result of invalid) assert.isTrue(Result.isFailure(result))
      assert.strictEqual(
        Result.getOrThrow(Result.flip(invalid[1])).message,
        "invalid SRV record priority"
      )
    })

    it("formats records in presentation format", () => {
      assert.strictEqual(Dns.formatRecord(srv("db.internal", 10, 5)), "SRV 10 5 5432 db.internal")
      assert.strictEqual(
        Dns.formatRecord(Dns.makeRecordUnsafe("TXT", { chunks: ["a \"b\"", "c"] })),
        "TXT \"a \\\"b\\\"\" \"c\""
      )
      assert.strictEqual(
        Dns.formatRecord(Dns.makeRecordUnsafe("TXT", { chunks: ["line\nbreak", "ü\\"] })),
        "TXT \"line\\010break\" \"\\195\\188\\\\\""
      )
      assert.strictEqual(
        Dns.formatRecord(
          Dns.makeRecordUnsafe("CAA", { critical: true, tag: "issue", value: "letsencrypt.org" })
        ),
        "CAA 128 issue \"letsencrypt.org\""
      )
      assert.strictEqual(
        Dns.formatRecord(Dns.makeRecordUnsafe("SOA", {
          primary: name("ns.example.com"),
          admin: name("hostmaster.example.com"),
          serial: 2024010101,
          refresh: Duration.hours(1),
          retry: Duration.minutes(10),
          expire: Duration.days(7),
          minimum: Duration.minutes(5)
        })),
        "SOA ns.example.com hostmaster.example.com 2024010101 3600 600 604800 300"
      )
    })

    it("implements equality and hashing", () => {
      const a = srv("db.internal", 10, 5)
      const b = srv("db.internal", 10, 5)
      assert.isTrue(Equal.equals(a, b))
      assert.strictEqual(Hash.hash(a), Hash.hash(b))
      assert.isFalse(Equal.equals(a, srv("db.internal", 10, 6)))
      const txt = Dns.makeRecordUnsafe("TXT", { chunks: ["a", "b"] })
      assert.isTrue(Equal.equals(txt, Dns.makeRecordUnsafe("TXT", { chunks: ["a", "b"] })))
      assert.isFalse(Equal.equals(txt, Dns.makeRecordUnsafe("TXT", { chunks: ["ab"] })))
      assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), {
        _tag: "SRV",
        target: "db.internal",
        port: 5432,
        priority: 10,
        weight: 5
      })
    })

    it("builds reverse lookup names", () => {
      assert.strictEqual(Dns.reverseName(ip("192.0.2.1")), "1.2.0.192.in-addr.arpa")
      assert.strictEqual(
        Dns.reverseName(ip("2001:db8::567:89ab")),
        "b.a.9.8.7.6.5.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa"
      )
      assert.isTrue(Host.isDomainName(Dns.reverseName(ip("2001:db8::1"))))
    })

    it("round-trips records through JSON", () => {
      const codec = Schema.toCodecJson(Schema.Array(Schema.DnsRecord))
      const records = [
        Dns.makeRecordUnsafe("A", { address: ip("192.0.2.1") as NetAddress.Ipv4Address }),
        Dns.makeRecordUnsafe("AAAA", { address: ip("2001:db8::1") as NetAddress.Ipv6Address }),
        srv("db.internal", 10, 5),
        Dns.makeRecordUnsafe("TXT", { chunks: ["a", "b"] }),
        Dns.makeRecordUnsafe("SOA", {
          primary: name("ns.example.com"),
          admin: name("hostmaster.example.com"),
          serial: 1,
          refresh: Duration.hours(1),
          retry: Duration.minutes(10),
          expire: Duration.days(7),
          minimum: Duration.minutes(5)
        })
      ]
      const json = Schema.encodeSync(codec)(records) as ReadonlyArray<unknown>
      assert.deepStrictEqual(json[0], { _tag: "A", address: "192.0.2.1" })
      assert.deepStrictEqual(json[2], { _tag: "SRV", target: "db.internal", port: 5432, priority: 10, weight: 5 })
      assert.deepStrictEqual((json[4] as any).refresh, { _tag: "Millis", value: 3600000 })
      const decoded = Schema.decodeUnknownSync(codec)(JSON.parse(JSON.stringify(json)))
      assert.strictEqual(decoded.length, records.length)
      decoded.forEach((record, index) => assert.isTrue(Equal.equals(record, records[index])))
      assert.throws(() =>
        Schema.decodeUnknownSync(codec)([{ _tag: "SRV", target: "db", port: 99999, priority: 0, weight: 0 }])
      )
      assert.isTrue(Schema.is(Schema.DnsRecordType)("SRV"))
      assert.isFalse(Schema.is(Schema.DnsRecordType)("ANY"))
    })
  })

  describe("errors", () => {
    it("classifies temporary failures", () => {
      const error = new Dns.DnsError({ reason: "Timeout", method: "resolve", hostname: "a.b", recordType: "SRV" })
      assert.isTrue(error.isTemporary)
      assert.strictEqual(error.message, "Timeout: Dns.resolve (a.b SRV)")
      assert.isFalse(new Dns.DnsError({ reason: "NotFound", method: "lookup", hostname: "a.b" }).isTemporary)
    })
  })

  describe("service", () => {
    it.effect("filters, deduplicates, and rejects empty results", () =>
      Effect.gen(function*() {
        const dns = Dns.make({
          lookup: () => Effect.succeed([ip("10.0.0.1"), ip("::1"), ip("10.0.0.1")]),
          resolve: () => Effect.succeed([srv("a.b", 1, 1), srv("a.b", 1, 1)]),
          reverse: () => Effect.succeed([])
        })
        const all = yield* dns.lookup(name("a.b"))
        assert.deepStrictEqual(all.map(NetAddress.formatIp), ["10.0.0.1", "::1"])
        const v6 = yield* dns.lookup(name("a.b"), { family: "IPv6" })
        assert.deepStrictEqual(v6.map(NetAddress.formatIp), ["::1"])
        assert.strictEqual((yield* dns.resolve(name("a.b"), "SRV")).length, 1)
        const noData = yield* Effect.flip(dns.resolve(name("a.b"), "MX"))
        assert.strictEqual(noData.reason, "NotFound")
        assert.strictEqual(noData.recordType, "MX")
        const noNames = yield* Effect.flip(dns.reverse(ip("10.0.0.1")))
        assert.strictEqual(noNames.reason, "NotFound")
      }))

    it.effect("answers from a static zone", () =>
      Effect.gen(function*() {
        const dns = yield* Dns.Dns
        const addresses = yield* dns.lookup(name("DB.internal."))
        assert.deepStrictEqual(addresses.map(NetAddress.formatIp), ["10.0.0.5", "fd00::5"])
        const web = yield* dns.resolve(name("example.com"), "A")
        assert.deepStrictEqual(web.map(Dns.formatRecord), ["A 192.0.2.1"])
        const alias = yield* dns.resolve(name("alias.internal"), "CNAME")
        assert.deepStrictEqual(alias.map(Dns.formatRecord), ["CNAME db.internal"])
        const notFollowed = yield* Effect.flip(dns.lookup(name("alias.internal")))
        assert.strictEqual(notFollowed.reason, "NotFound")
        const services = yield* dns.resolve(name("_pg._tcp.db.internal"), "SRV")
        assert.deepStrictEqual(services.map((record) => record.target), ["db1.internal", "db2.internal"])
        const names = yield* dns.reverse(ip("192.0.2.1"))
        assert.deepStrictEqual<ReadonlyArray<string>>(names, ["example.com"])
        assert.deepStrictEqual<ReadonlyArray<string>>(yield* dns.reverse(ip("10.0.0.5")), ["db.internal"])

        const missing = yield* Effect.flip(dns.lookup(name("missing.internal")))
        assert.strictEqual(missing.reason, "NotFound")
        const noV6 = yield* Effect.flip(dns.lookup(name("v4.internal"), { family: "IPv6" }))
        assert.strictEqual(noV6.reason, "NotFound")
        const hostsOnly = yield* Effect.flip(dns.resolve(name("v4.internal"), "A"))
        assert.strictEqual(hostsOnly.reason, "NotFound")
      }).pipe(Effect.provide(zone)))

    it("rejects invalid static zones", () => {
      assert.isTrue(Result.isFailure(Dns.makeStatic({ hosts: { "bad name": [] } })))
      assert.isTrue(Result.isFailure(Dns.makeStatic({ hosts: { "a.b": ["10.0.0.1" as any] } })))
      assert.isTrue(Result.isFailure(Dns.makeStatic({ records: { "a.b": [{} as any] } })))
    })
  })

  describe("resolveInet", () => {
    it.effect("returns concrete addresses without a lookup", () =>
      Effect.gen(function*() {
        const inet = NetAddress.inetAddressFromStringUnsafe("10.0.0.1:80")
        assert.deepStrictEqual(yield* (yield* Dns.Dns).resolveInet(inet), [inet])
        const literal = yield* (yield* Dns.Dns).resolveInet(endpoint("[::1]:443"))
        assert.deepStrictEqual(literal.map(NetAddress.formatInet), ["[::1]:443"])
        const wrongFamily = yield* Effect.flip((yield* Dns.Dns).resolveInet(inet, { family: "IPv6" }))
        assert.strictEqual(wrongFamily._tag, "DnsError")
      }).pipe(Effect.provide(Dns.layerStatic({}))))

    it.effect("maps IPv6 zones through the scope ID option", () =>
      Effect.gen(function*() {
        const scopeIds = new Map([["eth0", 2]])
        const named = yield* (yield* Dns.Dns).resolveInet(endpoint("[fe80::1%eth0]:80"), { scopeIds })
        assert.deepStrictEqual(named.map(NetAddress.formatInet), ["[fe80::1%2]:80"])
        const numeric = yield* (yield* Dns.Dns).resolveInet(endpoint("[fe80::1%7]:80"))
        assert.deepStrictEqual(numeric.map(NetAddress.formatInet), ["[fe80::1%7]:80"])
        const unknown = yield* Effect.flip((yield* Dns.Dns).resolveInet(endpoint("[fe80::1%wlan0]:80"), { scopeIds }))
        assert.strictEqual(unknown._tag, "NetAddressError")
      }).pipe(Effect.provide(zone)))

    it.effect("looks up domain names and attaches the port", () =>
      Effect.gen(function*() {
        const all = yield* (yield* Dns.Dns).resolveInet(endpoint("db.internal:5432"))
        assert.deepStrictEqual(all.map(NetAddress.formatInet), ["10.0.0.5:5432", "[fd00::5]:5432"])
        const v4 = yield* (yield* Dns.Dns).resolveInet(endpoint("db.internal:5432"), { family: "IPv4" })
        const first: NetAddress.InetAddressV4 = v4[0]
        assert.strictEqual(NetAddress.formatInet(first), "10.0.0.5:5432")
      }).pipe(Effect.provide(zone)))

    it.effect("passes Unix paths through", () =>
      Effect.gen(function*() {
        const unix = NetAddress.unixPathAddress("/run/app.sock")
        assert.deepStrictEqual(yield* (yield* Dns.Dns).resolveSocketAddress(unix), [unix])
        const inet = yield* (yield* Dns.Dns).resolveSocketAddress(endpoint("v4.internal:1"))
        assert.deepStrictEqual(inet.map(NetAddress.formatSocketAddress), ["10.0.0.4:1"])
      }).pipe(Effect.provide(zone)))
  })
})
