import { assert, describe, it } from "@effect/vitest"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Dns from "effect/net/Dns"
import * as Host from "effect/net/Host"
import * as NetAddress from "effect/net/NetAddress"
import * as NodeDnsApi from "node:dns"
import * as Fs from "node:fs/promises"
import * as Os from "node:os"
import * as Path from "node:path"
import { GenericContainer, type StartedTestContainer, Wait } from "testcontainers"
import { afterAll, beforeAll } from "vitest"

const name = Host.domainNameFromStringUnsafe
const ip = NetAddress.ipFromStringUnsafe

/**
 * The records every platform should return for the fixture zone below.
 */
const expected: { readonly [K in Dns.RecordType]: ReadonlyArray<Dns.RecordFor<K>> } = {
  A: [
    Dns.makeRecordUnsafe("A", { address: ip("192.0.2.1") as NetAddress.Ipv4Address }),
    Dns.makeRecordUnsafe("A", { address: ip("192.0.2.2") as NetAddress.Ipv4Address })
  ],
  AAAA: [Dns.makeRecordUnsafe("AAAA", { address: ip("2001:db8::1") as NetAddress.Ipv6Address })],
  CAA: [Dns.makeRecordUnsafe("CAA", { critical: false, tag: "issue", value: "ca.example.test" })],
  CNAME: [Dns.makeRecordUnsafe("CNAME", { target: name("example.test.") })],
  MX: [Dns.makeRecordUnsafe("MX", { exchange: name("mail.example.test."), priority: 10 })],
  NAPTR: [
    Dns.makeRecordUnsafe("NAPTR", {
      order: 100,
      preference: 10,
      flags: "S",
      service: "SIP+D2U",
      regexp: "",
      replacement: name("_sip._udp.example.test.")
    })
  ],
  NS: [Dns.makeRecordUnsafe("NS", { host: name("ns1.example.test.") })],
  PTR: [Dns.makeRecordUnsafe("PTR", { host: name("example.test.") })],
  SOA: [
    Dns.makeRecordUnsafe("SOA", {
      primary: name("ns1.example.test."),
      admin: "hostmaster.example.test.",
      serial: 2024010101,
      refresh: Duration.seconds(3600),
      retry: Duration.seconds(600),
      expire: Duration.seconds(604800),
      minimum: Duration.seconds(300)
    })
  ],
  SRV: [Dns.makeRecordUnsafe("SRV", { target: name("db1.example.test."), port: 5432, priority: 10, weight: 5 })],
  TXT: [Dns.makeRecordUnsafe("TXT", { chunks: ["v=spf1 ", "-all"] })]
}

/**
 * Asserts that two record lists hold the same records, in any order. Name
 * servers may rotate the order of records in an answer.
 */
const assertRecords = (actual: ReadonlyArray<Dns.DnsRecord>, records: ReadonlyArray<Dns.DnsRecord>) => {
  assert.strictEqual(actual.length, records.length, `expected ${records.map(Dns.formatRecord).join(", ")}`)
  for (const record of records) {
    assert.isTrue(
      actual.some((candidate) => Equal.equals(candidate, record)),
      `expected ${Dns.formatRecord(record)} in ${actual.map(Dns.formatRecord).join(", ")}`
    )
  }
}

const corefile = `
example.test {
  file /etc/coredns/example.test.db
}
2.0.192.in-addr.arpa {
  file /etc/coredns/2.0.192.in-addr.arpa.db
}
edge.test {
  file /etc/coredns/edge.test.db
}
`

// Mirrors `expected`, plus names for root targets, missing records, and
// missing names. Names outside both zones are refused.
const exampleZone = `
$ORIGIN example.test.
$TTL 300
@           IN SOA   ns1.example.test. hostmaster.example.test. 2024010101 3600 600 604800 300
@           IN NS    ns1.example.test.
@           IN A     192.0.2.1
@           IN A     192.0.2.2
@           IN AAAA  2001:db8::1
@           IN MX    10 mail.example.test.
@           IN TXT   "v=spf1 " "-all"
@           IN CAA   0 issue "ca.example.test"
@           IN NAPTR 100 10 "S" "SIP+D2U" "" _sip._udp.example.test.
ns1         IN A     192.0.2.53
www         IN CNAME example.test.
null-mx     IN MX    0 .
_pg._tcp    IN SRV   10 5 5432 db1.example.test.
_none._tcp  IN SRV   0 0 0 .
`

const reverseZone = `
$ORIGIN 2.0.192.in-addr.arpa.
$TTL 300
@           IN SOA   ns1.example.test. hostmaster.example.test. 1 3600 600 604800 300
@           IN NS    ns1.example.test.
1           IN PTR   example.test.
2           IN PTR   good.example.test.
2           IN PTR   bad\\032host.example.test.
`

// Records that platform resolvers report in unusual forms: a root primary name,
// a mailbox with an escaped dot, timers of 2^31 seconds or more, a CAA record
// with only a reserved flag set, and UTF-8 text.
const edgeZone = `
$ORIGIN edge.test.
$TTL 300
@           IN SOA   . john\\.doe.example.test. 1 4294967295 2147483648 604800 300
@           IN NS    ns1.example.test.
@           IN CAA   1 issue "ca.example.test"
@           IN TXT   "gr\\195\\188\\195\\159"
`

/**
 * Starts a CoreDNS container serving the fixture zones and returns the address
 * of its UDP listener.
 */
export const startDnsServer = async (): Promise<{
  readonly nameServer: NetAddress.InetAddressV4
  readonly stop: () => Promise<void>
}> => {
  // The fixtures are bind-mounted rather than copied: under Bun, the archive
  // testcontainers builds for copied content loses its last file.
  const directory = await Fs.mkdtemp(Path.join(Os.tmpdir(), "effect-dns-"))
  let container: StartedTestContainer | undefined
  const stop = async () => {
    try {
      await container?.stop()
    } finally {
      await Fs.rm(directory, { recursive: true, force: true })
    }
  }
  try {
    await Fs.chmod(directory, 0o755)
    for (
      const [file, content] of [
        ["Corefile", corefile],
        ["example.test.db", exampleZone],
        ["2.0.192.in-addr.arpa.db", reverseZone],
        ["edge.test.db", edgeZone]
      ]
    ) {
      await Fs.writeFile(Path.join(directory, file), content, { mode: 0o644 })
    }
    container = await new GenericContainer("coredns/coredns:1.14.7")
      .withBindMounts([{ source: directory, target: "/etc/coredns", mode: "ro" }])
      .withCommand(["-conf", "/etc/coredns/Corefile"])
      .withExposedPorts("53/udp")
      .withWaitStrategy(Wait.forLogMessage(/CoreDNS-/))
      .start()
    // The resolver APIs accept only IP addresses for name servers.
    const { address } = await NodeDnsApi.promises.lookup(container.getHost(), { family: 4 })
    return {
      nameServer: NetAddress.inetAddressFromStringUnsafe(
        `${address}:${container.getMappedPort("53/udp")}`
      ) as NetAddress.InetAddressV4,
      stop
    }
  } catch (error) {
    await stop()
    throw error
  }
}

const isBun = typeof process !== "undefined" && process.versions.bun !== undefined
const isDeno = "Deno" in globalThis

/**
 * Runs end-to-end tests of a platform `Dns` service against a CoreDNS
 * container. Every runtime must behave the same; the only skipped tests cover
 * documented runtime bugs that the platform services cannot work around.
 */

export const describeDnsServer = (
  label: string,
  make: (nameServer: NetAddress.InetAddress) => Dns.Dns
) =>
  describe(label, () => {
    let server: Awaited<ReturnType<typeof startDnsServer>>
    beforeAll(async () => {
      server = await startDnsServer()
    }, 120_000)
    afterAll(async () => {
      await server?.stop()
    })

    const dns = () => make(server.nameServer)

    it.effect("looks up localhost from the hosts file", () =>
      Effect.gen(function*() {
        const addresses = yield* dns().lookup(name("localhost"), { family: "IPv4" })
        assert.isTrue(addresses.some((address) => NetAddress.formatIp(address) === "127.0.0.1"))
        const endpoints = yield* dns().resolveInet(Host.hostPortFromStringUnsafe("localhost:8080"), { family: "IPv4" })
        assert.isTrue(endpoints.some((address) => NetAddress.formatInet(address) === "127.0.0.1:8080"))
      }))

    it.effect("queries every record type", () =>
      Effect.gen(function*() {
        for (const type of ["A", "AAAA", "CAA", "MX", "NAPTR", "NS", "SOA"] as const) {
          assertRecords(yield* dns().resolve(name("example.test."), type), expected[type])
        }
        assertRecords(yield* dns().resolve(name("www.example.test"), "CNAME"), expected.CNAME)
        assertRecords(yield* dns().resolve(name("_pg._tcp.example.test"), "SRV"), expected.SRV)
      }))

    // Bun returns each character string of a TXT record as a separate record,
    // so the chunks of a record cannot be reassembled:
    // https://github.com/oven-sh/bun/issues/44692
    it.effect.skipIf(isBun)("keeps the chunks of a TXT record together", () =>
      Effect.gen(function*() {
        assertRecords(yield* dns().resolve(name("example.test."), "TXT"), expected.TXT)
      }))

    it.effect("returns the root name for null targets", () =>
      Effect.gen(function*() {
        const [mx] = yield* dns().resolve(name("null-mx.example.test"), "MX")
        assert.strictEqual(mx.exchange, ".")
        const [srv] = yield* dns().resolve(name("_none._tcp.example.test"), "SRV")
        assert.strictEqual(srv.target, ".")
      }))

    it.effect("returns fully qualified names", () =>
      Effect.gen(function*() {
        const [srv] = yield* dns().resolve(name("_pg._tcp.example.test"), "SRV")
        assert.isTrue(Host.isFullyQualified(srv.target))
      }))

    it.effect("converts unusual record data", () =>
      Effect.gen(function*() {
        assertRecords(yield* dns().resolve(name("edge.test"), "SOA"), [
          Dns.makeRecordUnsafe("SOA", {
            primary: name("."),
            admin: "john\\.doe.example.test.",
            serial: 1,
            refresh: Duration.seconds(4294967295),
            retry: Duration.seconds(2147483648),
            expire: Duration.seconds(604800),
            minimum: Duration.seconds(300)
          })
        ])
        assertRecords(yield* dns().resolve(name("edge.test"), "CAA"), [
          Dns.makeRecordUnsafe("CAA", { critical: false, tag: "issue", value: "ca.example.test" })
        ])
        assertRecords(yield* dns().resolve(name("edge.test"), "TXT"), [
          Dns.makeRecordUnsafe("TXT", { chunks: ["grüß"] })
        ])
      }))

    it.effect("rejects name servers with a scope ID", () =>
      Effect.gen(function*() {
        const scoped = make(NetAddress.inetAddressFromStringUnsafe("[fe80::1%1]:53"))
        const error = yield* Effect.flip(scoped.resolve(name("example.test."), "A"))
        assert.strictEqual(error.reason, "Unsupported")
      }))

    it.effect("looks up the names of an address", () =>
      Effect.gen(function*() {
        assert.deepStrictEqual<ReadonlyArray<string>>(yield* dns().reverse(ip("192.0.2.1")), ["example.test."])
      }))

    it.effect("skips names that are not valid domain names", () =>
      Effect.gen(function*() {
        assert.deepStrictEqual<ReadonlyArray<string>>(yield* dns().reverse(ip("192.0.2.2")), ["good.example.test."])
      }))

    it.effect("reports missing names", () =>
      Effect.gen(function*() {
        const error = yield* Effect.flip(dns().resolve(name("missing.example.test"), "A"))
        assert.strictEqual(error.reason, "NotFound")
        assert.strictEqual(error.recordType, "A")
      }))

    // `Deno.resolveDns` reports every error response, including refused
    // queries, with the same `NotFound` error as a missing name.
    it.effect.skipIf(isDeno)("reports refused queries", () =>
      Effect.gen(function*() {
        const error = yield* Effect.flip(dns().resolve(name("outside.invalid"), "A"))
        assert.strictEqual(error.reason, "Refused")
      }))

    it.effect("reports names without records of the requested type", () =>
      Effect.gen(function*() {
        const error = yield* Effect.flip(dns().resolve(name("ns1.example.test."), "SRV"))
        assert.strictEqual(error.reason, "NotFound")
      }))
  })
