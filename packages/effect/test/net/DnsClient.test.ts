import { assert, describe, it } from "@effect/vitest"
import { Context, Crypto, Duration, Effect, Exit, Fiber, Layer, Queue, Result } from "effect"
import * as Arr from "effect/Array"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Hex from "effect/encoding/Hex"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as Dns from "effect/net/Dns"
import * as DnsClient from "effect/net/DnsClient"
import * as Host from "effect/net/Host"
import * as NetAddress from "effect/net/NetAddress"
import * as DatagramSocket from "effect/socket/DatagramSocket"
import * as Socket from "effect/socket/Socket"
import { TestClock } from "effect/testing"

const name = Host.domainNameFromStringUnsafe
const ip = NetAddress.ipFromStringUnsafe
const hex = (input: string): Uint8Array => Result.getOrThrow(Hex.decode(input.replace(/\s+/g, "")))

const a = (address: string) => Dns.makeRecordUnsafe("A", { address: ip(address) as NetAddress.Ipv4Address })

/**
 * Answers a query with its ID and question, and A records for 192.0.2.1,
 * 192.0.2.2, ...
 */
const reply = (query: Uint8Array, options: {
  readonly rcode?: number | undefined
  readonly answers?: number | undefined
  readonly truncated?: boolean | undefined
  readonly recursionAvailable?: boolean | undefined
  readonly edns?: boolean | undefined
} = {}): Uint8Array => {
  let end = 12
  while (query[end] !== 0) end += query[end] + 1
  const answers = options.answers ?? 1
  return Uint8Array.from([
    query[0],
    query[1],
    0x80 | (options.truncated ? 0x02 : 0) | (query[2] & 0x01),
    (options.recursionAvailable === false ? 0 : 0x80) | (options.rcode ?? 0),
    0,
    1,
    0,
    answers,
    0,
    0,
    0,
    options.edns ? 1 : 0,
    ...query.subarray(12, end + 5),
    ...Array.from({ length: answers }, (_, i) => [0xc0, 12, 0, 1, 0, 1, 0, 0, 0x0e, 0x10, 0, 4, 192, 0, 2, i + 1])
      .flat(),
    // OPT record advertising 1232 bytes
    ...(options.edns ? [0, 0, 41, 4, 208, 0, 0, 0, 0, 0, 0] : [])
  ])
}

const hasEdns = (query: Uint8Array): boolean => query[11] === 1

/**
 * Queries `example.test.` with a client sending to `transport`, letting
 * exchanges without a response time out.
 */
const query = (
  transport: DnsClient.Transport["Service"],
  options?: DnsClient.MakeOptions
) =>
  Effect.gen(function*() {
    const client = yield* DnsClient.make(options).pipe(Effect.provideService(DnsClient.Transport, transport))
    const fiber = yield* Effect.forkChild(client.query("example.test", "A"))
    yield* TestClock.adjust("1 minute")
    return yield* Fiber.join(fiber)
  })

/**
 * A transport whose name servers answer with `handlers`, recording the
 * queries they receive. Name servers without a response time out.
 */
const fakeTransport = (...handlers: Arr.NonEmptyReadonlyArray<(query: Uint8Array) => Uint8Array | undefined>) => {
  const queries: Array<{ readonly server: number; readonly query: Uint8Array }> = []
  const transport = DnsClient.Transport.of({
    servers: Arr.map(handlers, (handle, server) => ({
      send: (exchange) =>
        Effect.suspend(() => {
          const query = exchange.encode({ id: 0, udpPayloadSize: 1232 })
          queries.push({ server, query })
          const response = handle(query)
          return response === undefined ? exchange.limit(Effect.never) : Effect.succeed(response)
        })
    }))
  })
  return { transport, queries }
}

describe("DnsClient", () => {
  it.effect("sends a query with EDNS(0) and returns the decoded response", () =>
    Effect.gen(function*() {
      // example.test. A from CoreDNS: two answers, an NS record in authority, and an OPT record.
      const captured = hex(`
        0000 8500 0001 0002 0001 0001
        076578616d706c6504746573740000010001
        076578616d706c6504746573740000010001 0000012c 0004 c0000201
        076578616d706c6504746573740000010001 0000012c 0004 c0000202
        076578616d706c6504746573740000020001 0000012c 0012 036e7331076578616d706c65047465737400
        00 0029 04d0 00000000 0000
      `)
      const { queries, transport } = fakeTransport(() => captured)
      const response = yield* query(transport)
      assert.deepStrictEqual(queries.map(({ query }) => query), [
        hex(`0000 0100 0001 0000 0000 0001 076578616d706c650474657374 00 0001 0001 00 0029 04d0 00000000 0000`)
      ])
      const rr = <D extends Dns.DnsRecord>(data: D) => ({
        owner: "example.test.",
        ttl: Duration.seconds(300),
        class: 1,
        data
      })
      assert.deepStrictEqual(response, {
        flags: {
          authoritative: true,
          truncated: false,
          recursionDesired: true,
          recursionAvailable: false,
          authenticData: false,
          checkingDisabled: false
        },
        rcode: 0,
        answer: [rr(a("192.0.2.1")), rr(a("192.0.2.2"))],
        authority: [rr(Dns.makeRecordUnsafe("NS", { host: name("ns1.example.test.") }))],
        additional: [],
        edns: { udpPayloadSize: 1232, version: 0, dnssecOk: false }
      })
    }))

  it.effect("tries the next name server after a failure", () =>
    Effect.gen(function*() {
      for (
        const failing of [
          (query: Uint8Array) => reply(query, { rcode: 2, answers: 0 }),
          // A referral from a name server without recursion
          (query: Uint8Array) => reply(query, { answers: 0, recursionAvailable: false }),
          () => undefined
        ]
      ) {
        const { queries, transport } = fakeTransport(failing, (query) => reply(query))
        assert.strictEqual((yield* query(transport)).answer.length, 1)
        assert.deepStrictEqual(queries.map(({ server }) => server), [0, 1])
      }
      // NXDOMAIN is an answer.
      const { queries, transport } = fakeTransport((query) => reply(query, { rcode: 3, answers: 0 }), reply)
      assert.strictEqual((yield* query(transport)).rcode, 3)
      assert.strictEqual(queries.length, 1)
    }))

  it.effect("fails with the last error once every attempt has failed", () =>
    Effect.gen(function*() {
      const { queries, transport } = fakeTransport(() => undefined, (query) => reply(query, { rcode: 5, answers: 0 }))
      assert.strictEqual((yield* Effect.flip(query(transport))).reason, "Refused")
      assert.deepStrictEqual(queries.map(({ server }) => server), [0, 1, 0, 1])
      for (
        const [rcode, reason] of [
          [1, "InvalidResponse"],
          [2, "ServerFailure"],
          [4, "Unsupported"],
          [9, "Unknown"]
        ] as const
      ) {
        const { transport } = fakeTransport((query) => reply(query, { rcode, answers: 0, edns: true }))
        assert.strictEqual((yield* Effect.flip(query(transport))).reason, reason)
      }
      assert.strictEqual((yield* Effect.flip(query(fakeTransport(() => undefined).transport))).reason, "Timeout")
    }))

  it.effect("retries queries without EDNS(0) after FORMERR without an OPT record", () =>
    Effect.gen(function*() {
      const { queries, transport } = fakeTransport((query) =>
        hasEdns(query) ? reply(query, { rcode: 1, answers: 0 }) : reply(query)
      )
      assert.strictEqual((yield* query(transport)).answer.length, 1)
      assert.deepStrictEqual(queries.map(({ query }) => hasEdns(query)), [true, false])
    }))

  it.effect("reports malformed responses as InvalidResponse", () =>
    Effect.gen(function*() {
      const valid = reply(hex(`0000 0100 0001 0000 0000 0000 076578616d706c650474657374 00 0001 0001`))
      const messages = [
        ...Array.from({ length: valid.length }, (_, length) => valid.subarray(0, length)),
        // A question name that points to itself
        hex(`0000 8000 0001 0000 0000 0000 c00c 0001 0001`)
      ]
      for (const message of messages) {
        const error = yield* Effect.flip(query(fakeTransport(() => message).transport, { attempts: 1 }))
        assert.strictEqual(error.reason, "InvalidResponse", `${message.length} bytes`)
      }
    }))

  it.effect("checks the name and type before sending a query", () =>
    Effect.gen(function*() {
      const { queries, transport } = fakeTransport((query) => reply(query, { answers: 0 }))
      const client = yield* DnsClient.make().pipe(Effect.provideService(DnsClient.Transport, transport))
      const badName = yield* Effect.flip(client.query("not a name", "A"))
      assert.deepStrictEqual([badName.reason, badName.hostname], ["BadName", "not a name"])
      // OPT and zone transfers cannot be queried.
      for (const type of ["UNKNOWN" as Dns.RecordType, 0, 41, 252, 0x10000]) {
        assert.strictEqual((yield* Effect.flip(client.query("example.test", type))).reason, "Unsupported")
      }
      assert.strictEqual(queries.length, 0)
      // Other types are queried by numeric code.
      yield* client.query("example.test", 65)
      assert.deepStrictEqual(queries.map(({ query }) => query.subarray(26, 28)), [Uint8Array.of(0, 65)])
    }))
})

// Secure random bytes for query IDs; digests are not used.
const crypto = Crypto.make({
  randomBytes: (size) => globalThis.crypto.getRandomValues(new Uint8Array(size)),
  digest: () => Effect.die("unused")
})

describe("makeTransportUdp", () => {
  const server = NetAddress.inetAddressFromStringUnsafe("192.0.2.53:53")

  interface Reply {
    readonly payload: Uint8Array
    readonly from?: NetAddress.InetAddress | undefined
  }

  /**
   * A transport over in-memory UDP and TCP sockets whose name server answers
   * with `handle`.
   */
  const fakeNetwork = (handle: (transport: "udp" | "tcp", query: Uint8Array) => ReadonlyArray<Reply>) => {
    const received: Array<"udp" | "tcp"> = []
    const transport = DnsClient.makeTransportUdp({
      nameServers: [server],
      udp: (nameServer) =>
        Effect.gen(function*() {
          const queue = yield* Queue.unbounded<DatagramSocket.Datagram, DatagramSocket.DatagramSocketError>()
          return DatagramSocket.make({
            reader: Effect.succeed({
              pull: Queue.takeAll(queue),
              address: NetAddress.inetAddressFromStringUnsafe("0.0.0.0:40000"),
              dropped: () => 0,
              joinMulticast: () => Effect.void
            }),
            writer: Effect.succeed({
              write: (datagram) =>
                Effect.sync(() => {
                  received.push("udp")
                  for (const { from, payload } of handle("udp", datagram.payload as Uint8Array)) {
                    Queue.offerUnsafe(queue, { payload, address: from ?? nameServer })
                  }
                }),
              writeAll: () => Effect.die("unused")
            })
          })
        }),
      tcp: () =>
        Effect.gen(function*() {
          const queue = yield* Queue.unbounded<Uint8Array, Socket.SocketError>()
          return Socket.make({
            reader: Effect.succeed({ pull: Queue.takeAll(queue), upgrade: () => Effect.void }),
            writer: Effect.succeed({
              write: (chunk) =>
                Effect.sync(() => {
                  received.push("tcp")
                  for (const { payload } of handle("tcp", (chunk as Uint8Array).subarray(2))) {
                    // Split the length prefix to exercise reassembly.
                    Queue.offerUnsafe(queue, Uint8Array.of(payload.length >> 8))
                    Queue.offerUnsafe(queue, Uint8Array.from([payload.length & 0xff, ...payload]))
                  }
                }),
              writeAll: () => Effect.die("unused")
            })
          })
        })
    }).pipe(Effect.provideService(Crypto.Crypto, crypto))
    return { transport, received }
  }

  it.effect("ignores responses that do not match the query", () =>
    Effect.gen(function*() {
      const { received, transport } = fakeNetwork((_, query) => {
        const otherId = reply(query, { answers: 2 })
        otherId[1] ^= 1
        const otherQuestion = reply(query, { answers: 2 })
        otherQuestion[13] = "x".charCodeAt(0)
        // Name servers may change the letter case of the question.
        const upperCase = reply(query)
        upperCase[13] = "E".charCodeAt(0)
        return [
          { payload: otherId },
          { payload: otherQuestion },
          { payload: reply(query, { answers: 2 }), from: NetAddress.inetAddressFromStringUnsafe("192.0.2.66:53") },
          { payload: upperCase }
        ]
      })
      assert.strictEqual((yield* query(yield* transport)).answer.length, 1)
      assert.deepStrictEqual(received, ["udp"])
    }))

  it.effect("retries truncated responses over TCP", () =>
    Effect.gen(function*() {
      const { received, transport } = fakeNetwork((transport, query) => [
        { payload: transport === "udp" ? reply(query, { truncated: true, answers: 0 }) : reply(query, { answers: 3 }) }
      ])
      assert.strictEqual((yield* query(yield* transport)).answer.length, 3)
      assert.deepStrictEqual(received, ["udp", "tcp"])
    }))
})

describe("makeTransportHttps", () => {
  interface HttpRequest {
    readonly method: string
    readonly url: URL
    readonly headers: Readonly<Record<string, string>>
    readonly query: Uint8Array
    readonly requestInit: globalThis.RequestInit | undefined
  }

  /**
   * A transport over an in-memory `HttpClient` that answers with `handle`.
   */
  const fakeHttp = (
    handle: (request: HttpRequest) => {
      readonly status?: number | undefined
      readonly contentType?: string | undefined
      readonly headers?: Record<string, string> | undefined
      readonly payload: Uint8Array
    },
    options?: Partial<DnsClient.TransportHttpsOptions>
  ) => {
    const requests: Array<HttpRequest> = []
    const client = HttpClient.make((request, url, _signal, fiber) =>
      Effect.sync(() => {
        const received = {
          method: request.method,
          url,
          headers: {
            ...request.headers,
            ...(request.body._tag === "Uint8Array" ? { "content-type": request.body.contentType } : {})
          },
          query: request.body._tag === "Uint8Array"
            ? request.body.body
            : Result.getOrThrow(Base64Url.decode(url.searchParams.get("dns") ?? "")),
          requestInit: Context.getOrUndefined(fiber.context, FetchHttpClient.RequestInit)
        }
        requests.push(received)
        const reply = handle(received)
        return HttpClientResponse.fromWeb(
          request,
          new Response(reply.payload as Uint8Array<ArrayBuffer>, {
            status: reply.status ?? 200,
            headers: { "content-type": reply.contentType ?? "application/dns-message", ...reply.headers }
          })
        )
      })
    )
    const transport = DnsClient.makeTransportHttps({ urls: ["https://dns.example/dns-query"], ...options }).pipe(
      Effect.provideService(HttpClient.HttpClient, client)
    )
    return { transport, requests }
  }

  // The query for example.test. A with ID 0, padded to 128 bytes.
  const paddedQuery = hex(`
    0000 0100 0001 0000 0000 0001
    076578616d706c650474657374 00 0001 0001
    00 0029 04d0 00000000 0057 000c 0053 ${"00".repeat(83)}
  `)

  it.effect("sends GET requests with the padded query in the dns parameter", () =>
    Effect.gen(function*() {
      const { requests, transport } = fakeHttp((request) => ({ payload: reply(request.query) }), {
        urls: ["https://dns.example/dns-query?key=1"]
      })
      assert.strictEqual((yield* query(yield* transport)).answer.length, 1)
      assert.deepStrictEqual(requests.map((request) => [request.method, request.url.toString()]), [
        ["GET", `https://dns.example/dns-query?key=1&dns=${Base64Url.encode(paddedQuery)}`]
      ])
      assert.strictEqual(requests[0].headers.accept, "application/dns-message")
    }))

  it.effect("sends POST requests with the padded query as the body", () =>
    Effect.gen(function*() {
      const { requests, transport } = fakeHttp((request) => ({ payload: reply(request.query) }), { method: "POST" })
      assert.strictEqual((yield* query(yield* transport)).answer.length, 1)
      const [request] = requests
      assert.deepStrictEqual([request.method, request.url.toString()], ["POST", "https://dns.example/dns-query"])
      assert.strictEqual(request.headers["content-type"], "application/dns-message")
      assert.deepStrictEqual(request.query, paddedQuery)
    }))

  it.effect("checks the status, content type, and length of responses", () =>
    Effect.gen(function*() {
      for (
        const [response, reason] of [
          [{ status: 500 }, "ServerFailure"],
          [{ status: 429 }, "Temporary"],
          [{ status: 302 }, "InvalidResponse"],
          [{ contentType: "text/html" }, "InvalidResponse"],
          [{ payload: new Uint8Array(0x10000) }, "InvalidResponse"]
        ] as const
      ) {
        const { transport } = fakeHttp((request) => ({ payload: reply(request.query), ...response }))
        const error = yield* Effect.flip(query(yield* transport, { attempts: 1 }))
        assert.strictEqual(error.reason, reason, JSON.stringify(response))
      }
      const { transport } = fakeHttp((request) => ({
        payload: reply(request.query),
        contentType: "Application/DNS-Message; charset=binary"
      }))
      yield* query(yield* transport)
    }))

  // RFC 8484 section 5.1
  it.effect("subtracts the HTTP Age from TTLs", () =>
    Effect.gen(function*() {
      for (const [age, ttl] of [["250", 3350], ["4000", 0]] as const) {
        const { transport } = fakeHttp((request) => ({ payload: reply(request.query), headers: { age } }))
        const response = yield* query(yield* transport)
        assert.deepStrictEqual(response.answer.map((record) => Duration.toSeconds(record.ttl)), [ttl], `Age: ${age}`)
      }
    }))

  it.effect("does not let fetch follow redirects", () =>
    Effect.gen(function*() {
      const { requests, transport } = fakeHttp((request) => ({ payload: reply(request.query) }))
      yield* query(yield* transport).pipe(
        Effect.provideService(FetchHttpClient.RequestInit, { credentials: "omit", redirect: "follow" })
      )
      assert.deepStrictEqual(requests[0].requestInit, { credentials: "omit", redirect: "manual" })
    }))

  it.effect("requires HTTPS, except for loopback hosts", () =>
    Effect.gen(function*() {
      for (const url of ["ftp://dns.example/", "http://dns.example/", "http://192.0.2.53/", "http://a.localhost/"]) {
        const exit = yield* Effect.exit(fakeHttp(() => ({ payload: new Uint8Array() }), { urls: [url] }).transport)
        assert.isTrue(Exit.hasDies(exit), url)
      }
      yield* fakeHttp(() => ({ payload: new Uint8Array() }), {
        urls: ["http://127.0.0.1:8080/", "http://[::1]/", "http://localhost/"]
      }).transport
    }))
})

describe("parseResolvConf", () => {
  it("reads name servers, search domains, and options like glibc", () => {
    const config = DnsClient.parseResolvConf([
      "# comment",
      "nameserver 192.0.2.1",
      "nameserver fe80::1%2",
      "nameserver ns.example",
      "nameserver 2001:db8::1",
      "nameserver 192.0.2.3",
      "nameserver 192.0.2.4",
      "search a.example b.example",
      "domain Corp.Example",
      "options ndots:99 timeout:0 attempts:x rotate use-vc no-aaaa unknown:1",
      ""
    ].join("\r\n"))
    assert.deepStrictEqual(config, {
      nameServers: ["192.0.2.1:53", "[2001:db8::1]:53", "192.0.2.3:53"].map(NetAddress.inetAddressFromStringUnsafe),
      search: [name("corp.example")],
      ndots: 15,
      timeout: Duration.seconds(1),
      attempts: undefined,
      rotate: true,
      useTcp: true,
      noAaaa: true
    })
  })

  it("leaves missing values undefined", () => {
    assert.deepStrictEqual(DnsClient.parseResolvConf(""), {
      nameServers: [],
      search: undefined,
      ndots: undefined,
      timeout: undefined,
      attempts: undefined,
      rotate: undefined,
      useTcp: undefined,
      noAaaa: undefined
    })
  })
})

describe("layerDns", () => {
  const aaaa = (address: string) => Dns.makeRecordUnsafe("AAAA", { address: ip(address) as NetAddress.Ipv6Address })
  const cname = (target: string) => Dns.makeRecordUnsafe("CNAME", { target })
  const ptr = (host: string) => Dns.makeRecordUnsafe("PTR", { host })

  /**
   * A `Dns` service over a client answering from records by owner name. An
   * answer holds the records of its name, and of the names its CNAME records
   * point to when `chains` is set. Names without records are NXDOMAIN.
   */
  const staticDns = (options: {
    readonly records: Record<string, ReadonlyArray<Dns.DnsRecord | Dns.Unknown>>
    readonly failures?: Record<string, Dns.DnsErrorReason>
    readonly chains?: boolean
    readonly search?: ReadonlyArray<string>
    readonly ndots?: number
    readonly noAaaa?: boolean
    readonly hosts?: string
  }) => {
    const queries: Array<string> = []
    const client = DnsClient.DnsClient.of({
      query: (input, type) =>
        Effect.suspend(() => {
          const queried = Host.toFullyQualified(name(input))
          queries.push(`${queried} ${type}`)
          const reason = options.failures?.[queried]
          if (reason !== undefined) {
            return Effect.fail(new Dns.DnsError({ reason, method: "resolve", hostname: queried }))
          }
          const answer: Array<DnsClient.ResourceRecord> = []
          for (let owner: string | undefined = queried, hops = 0; owner !== undefined && hops < 20; hops++) {
            const records: ReadonlyArray<Dns.DnsRecord | Dns.Unknown> = options.records[owner] ?? []
            for (const data of records) {
              if (data._tag === type || data._tag === "CNAME" || data._tag === "UNKNOWN") {
                answer.push({ owner: owner.toUpperCase(), ttl: Duration.seconds(60), class: 1, data })
              }
            }
            const alias = records.find((record): record is Dns.Cname => record._tag === "CNAME")
            owner = options.chains && type !== "CNAME" ? alias?.target : undefined
          }
          return Effect.succeed({
            flags: {
              authoritative: true,
              truncated: false,
              recursionDesired: true,
              recursionAvailable: true,
              authenticData: false,
              checkingDisabled: false
            },
            rcode: queried in options.records ? 0 : 3,
            answer,
            authority: [],
            additional: [],
            edns: undefined
          })
        }),
      search: (options.search ?? []).map(name),
      ndots: options.ndots ?? 1,
      noAaaa: options.noAaaa ?? false,
      hosts: Host.parseHostsFile(options.hosts ?? "")
    })
    const dns = Effect.service(Dns.Dns).pipe(
      Effect.provide(DnsClient.layerDns.pipe(Layer.provide(Layer.succeed(DnsClient.DnsClient, client))))
    )
    return { dns, queries }
  }

  const formatIps = (addresses: ReadonlyArray<NetAddress.IpAddress>) => addresses.map(NetAddress.formatIp)

  it.effect("looks up the hosts table and localhost names before DNS", () =>
    Effect.gen(function*() {
      const { dns, queries } = staticDns({
        hosts: "192.0.2.1 db.internal\n2001:db8::1 db.internal\n127.0.0.2 localhost",
        records: { "db.internal.": [aaaa("2001:db8::6")] }
      })
      const service = yield* dns
      assert.deepStrictEqual(formatIps(yield* service.lookup("db.internal")), ["192.0.2.1", "2001:db8::1"])
      assert.deepStrictEqual(formatIps(yield* service.lookup("localhost")), ["127.0.0.2"])
      assert.deepStrictEqual(formatIps(yield* service.lookup("App.Localhost")), ["127.0.0.1", "::1"])
      assert.deepStrictEqual(queries, [])
    }))

  it.effect("skips AAAA queries with noAaaa", () =>
    Effect.gen(function*() {
      const { dns, queries } = staticDns({
        noAaaa: true,
        records: { "app.example.": [a("192.0.2.1"), aaaa("2001:db8::6")] }
      })
      assert.deepStrictEqual(formatIps(yield* (yield* dns).lookup("app.example")), ["192.0.2.1"])
      assert.deepStrictEqual(queries, ["app.example. A"])
    }))

  it.effect("tries the search domains in the order given by ndots", () =>
    Effect.gen(function*() {
      const { dns, queries } = staticDns({ search: ["corp.example"], ndots: 2, records: {} })
      const service = yield* dns
      for (const host of ["db", "db.internal", "db.internal.example", "db."]) {
        yield* Effect.flip(service.lookup(host, { family: "IPv4" }))
      }
      assert.deepStrictEqual(queries, [
        "db.corp.example. A",
        "db. A",
        "db.internal.corp.example. A",
        "db.internal. A",
        "db.internal.example. A",
        "db.internal.example.corp.example. A",
        "db. A"
      ])
    }))

  it.effect("stops searching at failures other than SERVFAIL", () =>
    Effect.gen(function*() {
      const records = { "db.": [a("192.0.2.1")] }
      const refused = staticDns({ search: ["corp.example"], records, failures: { "db.corp.example.": "Refused" } })
      const error = yield* Effect.flip((yield* refused.dns).lookup("db", { family: "IPv4" }))
      assert.deepStrictEqual([error.reason, error.method, error.hostname], ["Refused", "lookup", "db"])
      assert.deepStrictEqual(refused.queries, ["db.corp.example. A"])
      const servfail = staticDns({
        search: ["corp.example"],
        records,
        failures: { "db.corp.example.": "ServerFailure" }
      })
      assert.deepStrictEqual(formatIps(yield* (yield* servfail.dns).lookup("db", { family: "IPv4" })), ["192.0.2.1"])
    }))

  it.effect("follows up to 8 CNAME records, querying targets the answer leaves unresolved", () =>
    Effect.gen(function*() {
      const chain = (aliases: number) => {
        const records: Record<string, ReadonlyArray<Dns.DnsRecord>> = {}
        for (let i = 0; i < aliases; i++) records[`a${i}.example.`] = [cname(`a${i + 1}.example.`)]
        records[`a${aliases}.example.`] = [a("192.0.2.1")]
        return staticDns({ records })
      }
      const eight = chain(8)
      assert.deepStrictEqual(yield* (yield* eight.dns).resolve("a0.example", "A"), [a("192.0.2.1")])
      assert.strictEqual(eight.queries.length, 9)
      assert.strictEqual((yield* Effect.flip((yield* chain(9).dns).resolve("a0.example", "A"))).reason, "NotFound")
      const loop = staticDns({
        chains: true,
        records: { "a.example.": [cname("b.example.")], "b.example.": [cname("a.example.")] }
      })
      assert.strictEqual((yield* Effect.flip((yield* loop.dns).resolve("a.example", "A"))).reason, "NotFound")
    }))

  it.effect("looks up the names of an address through classless delegations", () =>
    Effect.gen(function*() {
      const { dns } = staticDns({
        chains: true,
        records: {
          "1.2.0.192.in-addr.arpa.": [cname("1.0/25.2.0.192.in-addr.arpa.")],
          "1.0/25.2.0.192.in-addr.arpa.": [ptr("host.example.")]
        }
      })
      assert.deepStrictEqual<ReadonlyArray<string>>(yield* (yield* dns).reverse(ip("192.0.2.1")), ["host.example."])
    }))

  it.effect("fails with InvalidResponse when no record of the type can be represented", () =>
    Effect.gen(function*() {
      const bad = Dns.makeUnknownRecordUnsafe({ type: 12, data: Uint8Array.of(0xff) })
      const { dns } = staticDns({ records: { "good.example.": [ptr("a.example."), bad], "bad.example.": [bad] } })
      const service = yield* dns
      assert.deepStrictEqual(yield* service.resolve("good.example", "PTR"), [ptr("a.example.")])
      assert.strictEqual((yield* Effect.flip(service.resolve("bad.example", "PTR"))).reason, "InvalidResponse")
    }))
})
