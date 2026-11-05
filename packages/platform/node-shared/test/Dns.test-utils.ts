import * as NodeCrypto from "@effect/platform-node-shared/NodeCrypto"
import * as NodeDatagramSocket from "@effect/platform-node-shared/NodeDatagramSocket"
import * as NodeDnsClient from "@effect/platform-node-shared/NodeDnsClient"
import * as NodeSocket from "@effect/platform-node-shared/NodeSocket"
import { assert, describe, it } from "@effect/vitest"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Hex from "effect/encoding/Hex"
import * as Equal from "effect/Equal"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as Dns from "effect/net/Dns"
import * as DnsClient from "effect/net/DnsClient"
import * as Host from "effect/net/Host"
import * as NetAddress from "effect/net/NetAddress"
import * as Result from "effect/Result"
import type * as Scope from "effect/Scope"
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
  TLSA: [
    Dns.makeRecordUnsafe("TLSA", {
      certUsage: 3,
      selector: 1,
      matchingType: 1,
      data: Result.getOrThrow(Hex.decode("38a88126a15ae8e643ce9447c3ce9a874ea0e05255d07ee12227809edbe5c7f1"))
    })
  ],
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

// Without a `tls` block, CoreDNS serves DNS over HTTPS as plain HTTP.
const corefile = `
example.test https://example.test:8443 {
  file /etc/coredns/example.test.db
}
2.0.192.in-addr.arpa https://2.0.192.in-addr.arpa:8443 {
  file /etc/coredns/2.0.192.in-addr.arpa.db
}
edge.test https://edge.test:8443 {
  file /etc/coredns/edge.test.db
}
`

// TXT records that do not fit in a 512-byte UDP response.
const bigTxt = Array.from({ length: 16 }, (_, i) => `big         IN TXT   "record ${i} ${"x".repeat(24)}"`).join("\n")

// Mirrors `expected`, plus records that cannot be represented. Names outside
// the zones are refused.
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
_pg._tcp    IN SRV   10 5 5432 db1.example.test.
_443._tcp   IN TLSA  3 1 1 38a88126a15ae8e643ce9447c3ce9a874ea0e05255d07ee12227809edbe5c7f1
bad-mx      IN MX    10 bad\\032host.example.test.
${bigTxt}
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
// a mailbox with an escaped dot, timers of 2^31 seconds or more, UTF-8 text,
// and a PTR name whose label holds a dot, a space, UTF-8, and a backslash.
const edgeZone = `
$ORIGIN edge.test.
$TTL 300
@           IN SOA   . john\\.doe.example.test. 1 4294967295 2147483648 604800 300
@           IN NS    ns1.example.test.
@           IN TXT   "gr\\195\\188\\195\\159"
_svc._tcp   IN PTR   v2\\.0\\032Caf\\195\\169\\092x._svc._tcp.edge.test.
_dot._tcp   IN PTR   printer\\..
`

/**
 * Starts a CoreDNS container serving the fixture zones.
 */
export const startDnsServer = async (): Promise<{
  readonly nameServer: NetAddress.InetAddressV4
  readonly tcpNameServer: NetAddress.InetAddressV4
  readonly dohUrl: string
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
      .withExposedPorts("53/udp", "53/tcp", "8443/tcp")
      .withWaitStrategy(Wait.forLogMessage(/CoreDNS-/))
      .start()
    // The resolver APIs accept only IP addresses for name servers.
    const { address } = await NodeDnsApi.promises.lookup(container.getHost(), { family: 4 })
    const mapped = (port: "53/udp" | "53/tcp") =>
      NetAddress.inetAddressFromStringUnsafe(`${address}:${container!.getMappedPort(port)}`) as NetAddress.InetAddressV4
    return {
      nameServer: mapped("53/udp"),
      tcpNameServer: mapped("53/tcp"),
      dohUrl: `http://${address}:${container.getMappedPort("8443/tcp")}/dns-query`,
      stop
    }
  } catch (error) {
    await stop()
    throw error
  }
}

/**
 * Runs end-to-end tests of a `Dns` service against a CoreDNS container. The
 * options skip runtime limitations.
 */
export const describeDnsServer = (
  label: string,
  make: (
    nameServer: NetAddress.InetAddress
  ) => Effect.Effect<Dns.Dns["Service"], NetAddress.NetAddressError, Scope.Scope>,
  options?: {
    readonly splitsTxtRecords?: boolean | undefined
    readonly refusedAsNotFound?: boolean | undefined
    readonly lacksTlsa?: boolean | undefined
  }
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
        const addresses = yield* (yield* dns()).lookup(name("localhost"), { family: "IPv4" })
        assert.isTrue(addresses.some((address) => NetAddress.formatIp(address) === "127.0.0.1"))
      }))

    it.effect("queries every record type", () =>
      Effect.gen(function*() {
        const resolver = yield* dns()
        for (const type of ["A", "AAAA", "CAA", "MX", "NAPTR", "NS", "SOA"] as const) {
          assertRecords(yield* resolver.resolve(name("example.test."), type), expected[type])
        }
        assertRecords(yield* resolver.resolve(name("www.example.test"), "CNAME"), expected.CNAME)
        assertRecords(yield* resolver.resolve(name("_pg._tcp.example.test"), "SRV"), expected.SRV)
      }))

    it.effect("queries TLSA records where the runtime supports them", () =>
      Effect.gen(function*() {
        const query = (yield* dns()).resolve(name("_443._tcp.example.test"), "TLSA")
        if (options?.lacksTlsa === true) {
          const error = yield* Effect.flip(query)
          assert.strictEqual(error.reason, "Unsupported")
          assert.strictEqual(error.recordType, "TLSA")
        } else {
          assertRecords(yield* query, expected.TLSA)
        }
      }))

    it.effect.skipIf(options?.splitsTxtRecords === true)("keeps the chunks of a TXT record together", () =>
      Effect.gen(function*() {
        assertRecords(yield* (yield* dns()).resolve(name("example.test."), "TXT"), expected.TXT)
      }))

    it.effect("converts unusual record data", () =>
      Effect.gen(function*() {
        const resolver = yield* dns()
        assertRecords(yield* resolver.resolve(name("edge.test"), "SOA"), [
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
        assertRecords(yield* resolver.resolve(name("edge.test"), "TXT"), [
          Dns.makeRecordUnsafe("TXT", { chunks: ["grüß"] })
        ])
        assertRecords(yield* resolver.resolve(name("_svc._tcp.edge.test"), "PTR"), [
          Dns.makeRecordUnsafe("PTR", { host: "v2\\.0 Café\\\\x._svc._tcp.edge.test." })
        ])
      }))

    it.effect("keeps the root after a label ending with an escaped dot", () =>
      Effect.gen(function*() {
        const records = yield* (yield* dns()).resolve(name("_dot._tcp.edge.test"), "PTR")
        assert.deepStrictEqual(records.map(Dns.formatRecord), ["PTR printer\\.."])
      }))

    it.effect("looks up the host names of an address, skipping invalid names", () =>
      Effect.gen(function*() {
        const resolver = yield* dns()
        assert.deepStrictEqual<ReadonlyArray<string>>(yield* resolver.reverse(ip("192.0.2.1")), ["example.test."])
        assert.deepStrictEqual<ReadonlyArray<string>>(yield* resolver.reverse(ip("192.0.2.2")), [
          "good.example.test."
        ])
      }))

    it.effect("fails when no record can be represented", () =>
      Effect.gen(function*() {
        const error = yield* Effect.flip((yield* dns()).resolve(name("bad-mx.example.test"), "MX"))
        assert.strictEqual(error.reason, "InvalidResponse")
      }))

    it.effect("reports missing names and records", () =>
      Effect.gen(function*() {
        const resolver = yield* dns()
        const missingName = yield* Effect.flip(resolver.resolve(name("missing.example.test"), "A"))
        assert.strictEqual(missingName.reason, "NotFound")
        const missingRecord = yield* Effect.flip(resolver.resolve(name("ns1.example.test."), "SRV"))
        assert.strictEqual(missingRecord.reason, "NotFound")
        const missingAddress = yield* Effect.flip(resolver.reverse(ip("192.0.2.9")))
        assert.strictEqual(missingAddress.reason, "NotFound")
      }))

    it.effect.skipIf(options?.refusedAsNotFound === true)("reports refused queries", () =>
      Effect.gen(function*() {
        const error = yield* Effect.flip((yield* dns()).resolve(name("outside.invalid"), "A"))
        assert.strictEqual(error.reason, "Refused")
      }))
  })

/**
 * Runs end-to-end tests of `NodeDnsClient` against a CoreDNS container.
 * Responses are checked over UDP; the other transports only send large
 * responses.
 */
export const describeDnsClient = (label: string) =>
  describe(label, () => {
    let server: Awaited<ReturnType<typeof startDnsServer>>
    beforeAll(async () => {
      server = await startDnsServer()
    }, 120_000)
    afterAll(async () => {
      await server?.stop()
    })

    // The container maps UDP and TCP to different ports.
    const udpTransport = (udpPayloadSize?: number) =>
      DnsClient.makeTransportUdp({
        nameServers: [server.nameServer],
        udpPayloadSize,
        udp: (nameServer, onError) =>
          NodeDatagramSocket.make({ connect: { address: nameServer.address, port: nameServer.port }, onError }),
        tcp: () =>
          NodeSocket.makeNet({
            host: NetAddress.formatIp(server.tcpNameServer.address),
            port: server.tcpNameServer.port
          })
      }).pipe(Effect.provide(NodeCrypto.layer))
    const tcpTransport = () => Effect.orDie(NodeDnsClient.makeTransportTcp({ nameServers: [server.tcpNameServer] }))
    const httpsTransport = () =>
      DnsClient.makeTransportHttps({ urls: [server.dohUrl] }).pipe(Effect.provide(FetchHttpClient.layer))
    const client = (transport: Effect.Effect<DnsClient.Transport["Service"]>) =>
      DnsClient.make({ timeout: "2 seconds" }).pipe(Effect.provideServiceEffect(DnsClient.Transport, transport))
    const udp = () => client(udpTransport())
    const ttl = (record: DnsClient.ResourceRecord) => Duration.toSeconds(record.ttl)

    it.effect("returns the sections, TTLs, and flags of a response", () =>
      Effect.gen(function*() {
        const response = yield* (yield* udp()).query(name("example.test."), "A")
        assert.strictEqual(response.rcode, 0)
        assert.isTrue(response.flags.authoritative)
        assert.isFalse(response.flags.truncated)
        assert.isTrue(response.flags.recursionDesired)
        assertRecords(response.answer.map((record) => record.data as Dns.DnsRecord), expected.A)
        for (const record of response.answer) {
          assert.strictEqual(record.owner, "example.test.")
          assert.strictEqual(record.class, 1)
          assert.strictEqual(ttl(record), 300)
        }
        assert.deepStrictEqual(response.authority.map((record) => [record.owner, ttl(record), record.data]), [
          ["example.test.", 300, expected.NS[0]]
        ])
        assert.deepStrictEqual(response.edns, { udpPayloadSize: 1232, version: 0, dnssecOk: false })
      }))

    it.effect("returns NXDOMAIN responses with the zone's SOA record", () =>
      Effect.gen(function*() {
        const response = yield* (yield* udp()).query(name("missing.example.test."), "A")
        assert.strictEqual(response.rcode, 3)
        assert.deepStrictEqual(response.answer, [])
        assert.deepStrictEqual(response.authority.map((record) => [record.owner, ttl(record), record.data]), [
          ["example.test.", 300, expected.SOA[0]]
        ])
      }))

    it.effect("returns large responses over every transport", () =>
      Effect.gen(function*() {
        // A 512-byte UDP payload size truncates the response, which is retried over TCP.
        for (const transport of [udpTransport(), udpTransport(512), tcpTransport(), httpsTransport()]) {
          const response = yield* (yield* client(transport)).query(name("big.example.test."), "TXT")
          assert.isFalse(response.flags.truncated)
          assert.strictEqual(response.answer.length, 16)
        }
      }))
  })
