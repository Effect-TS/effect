import { assert, describe, it } from "@effect/vitest"
import { Crypto, Duration, Effect, Equal, Exit, Fiber, Layer, Queue, Result } from "effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Hex from "effect/encoding/Hex"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientError from "effect/http/HttpClientError"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as DnsMessage from "effect/internal/dnsMessage"
import * as Dns from "effect/net/Dns"
import * as DnsClient from "effect/net/DnsClient"
import * as Host from "effect/net/Host"
import * as NetAddress from "effect/net/NetAddress"
import * as DatagramSocket from "effect/socket/DatagramSocket"
import * as Socket from "effect/socket/Socket"
import { TestClock, TestCrypto } from "effect/testing"

const name = Host.domainNameFromStringUnsafe
const inet = NetAddress.inetAddressFromStringUnsafe

const primary = inet("192.0.2.53:53")
const secondary = inet("[2001:db8::53]:53")

const encodeName = (input: string): Array<number> => [
  ...(input === "." ? [] : input.replace(/\.$/, "").split(".")).flatMap((label) => [
    label.length,
    ...Array.from(label, (character) => character.charCodeAt(0))
  ]),
  0
]

const u16 = (value: number) => [value >> 8, value & 0xff]

/**
 * Builds a response with A records for 192.0.2.1, 192.0.2.2, ...
 */
const response = (options: {
  readonly id: number
  readonly question?: readonly [string, number] | undefined
  readonly rcode?: number | undefined
  readonly truncated?: boolean | undefined
  readonly isResponse?: boolean | undefined
  readonly answers?: number | undefined
}): Uint8Array => {
  const answers = options.answers ?? 0
  const flags = (options.isResponse === false ? 0 : 0x8000) | 0x0180 | (options.truncated ? 0x0200 : 0) |
    (options.rcode ?? 0)
  const owner = options.question?.[0] ?? "example.test"
  return Uint8Array.from([
    ...u16(options.id),
    ...u16(flags),
    ...u16(options.question === undefined ? 0 : 1),
    ...u16(answers),
    0,
    0,
    0,
    0,
    ...(options.question === undefined ? [] : [...encodeName(options.question[0]), ...u16(options.question[1]), 0, 1]),
    ...Array.from({ length: answers }, (_, i) => [
      ...encodeName(owner),
      0,
      1,
      0,
      1,
      0,
      0,
      0x0e,
      0x10,
      0,
      4,
      192,
      0,
      2,
      i + 1
    ]).flat()
  ])
}

interface Request {
  readonly server: NetAddress.InetAddress
  readonly transport: "udp" | "tcp"
  readonly header: DnsMessage.Header
  readonly payload: Uint8Array
}

interface Reply {
  readonly payload: Uint8Array
  readonly from?: NetAddress.InetAddress | undefined
}

/**
 * In-memory UDP and TCP transports whose name servers answer with `handle`.
 * Requests without replies time out.
 */
const fakeNetwork = (handle: (request: Request) => ReadonlyArray<Reply>) => {
  const requests: Array<Request> = []
  const state = { open: 0, opened: 0 }
  const receive = (server: NetAddress.InetAddress, transport: Request["transport"], payload: Uint8Array) => {
    const request = { server, transport, header: Result.getOrThrow(DnsMessage.decodeHeader(payload)), payload }
    requests.push(request)
    return handle(request)
  }

  const udp = (server: NetAddress.InetAddress) =>
    Effect.gen(function*() {
      const queue = yield* Queue.unbounded<DatagramSocket.Datagram, DatagramSocket.DatagramSocketError>()
      return DatagramSocket.make({
        reader: Effect.acquireRelease(
          Effect.sync(() => {
            state.open++
            state.opened++
            return {
              pull: Queue.takeAll(queue),
              address: inet("0.0.0.0:40000"),
              dropped: () => 0,
              joinMulticast: () => Effect.void
            }
          }),
          () => Effect.sync(() => state.open--)
        ),
        writer: Effect.succeed({
          write: (datagram) =>
            Effect.sync(() => {
              for (const reply of receive(server, "udp", datagram.payload as Uint8Array)) {
                Queue.offerUnsafe(queue, { payload: reply.payload, address: reply.from ?? server })
              }
            }),
          writeAll: () => Effect.die("unused")
        })
      })
    })

  const tcp = (server: NetAddress.InetAddress) =>
    Effect.gen(function*() {
      const queue = yield* Queue.unbounded<Uint8Array, Socket.SocketError>()
      return Socket.make({
        reader: Effect.succeed({ pull: Queue.takeAll(queue), upgrade: () => Effect.void }),
        writer: Effect.succeed({
          write: (chunk) =>
            Effect.sync(() => {
              const frame = chunk as Uint8Array
              assert.strictEqual((frame[0] << 8) | frame[1], frame.length - 2)
              for (const reply of receive(server, "tcp", frame.subarray(2))) {
                const length = reply.payload.length
                // Split the framed reply to exercise reassembly.
                Queue.offerUnsafe(queue, Uint8Array.of(length >> 8))
                Queue.offerUnsafe(queue, Uint8Array.from([length & 0xff, ...reply.payload]))
              }
            }),
          writeAll: () => Effect.die("unused")
        })
      })
    })

  return { udp, tcp, requests, state }
}

// Secure random bytes for query IDs; digests are not used.
const crypto = Crypto.make({
  randomBytes: (size) => globalThis.crypto.getRandomValues(new Uint8Array(size)),
  digest: () => Effect.die("unused")
})

const udpTransport = (
  network: Pick<ReturnType<typeof fakeNetwork>, "udp" | "tcp">,
  options?: Partial<DnsClient.TransportUdpOptions>
) =>
  DnsClient.makeTransportUdp({ nameServers: [primary, secondary], udp: network.udp, tcp: network.tcp, ...options })
    .pipe(
      Effect.provideService(Crypto.Crypto, crypto)
    )

const tcpTransport = (network: ReturnType<typeof fakeNetwork>, options?: Partial<DnsClient.TransportTcpOptions>) =>
  DnsClient.makeTransportTcp({ nameServers: [primary, secondary], tcp: network.tcp, ...options }).pipe(
    Effect.provideService(Crypto.Crypto, crypto)
  )

const answer = (
  request: Pick<Request, "header">,
  options?: Omit<Parameters<typeof response>[0], "id" | "question">
): Reply => ({
  payload: response({
    id: request.header.id,
    question: [request.header.questions[0].name, request.header.questions[0].type],
    answers: 1,
    ...options
  })
})

const run = <R>(transport: Effect.Effect<DnsClient.Transport["Service"], never, R>, options?: DnsClient.MakeOptions) =>
  Effect.gen(function*() {
    const client = yield* DnsClient.make(options).pipe(Effect.provideServiceEffect(DnsClient.Transport, transport))
    const fiber = yield* Effect.forkChild(client.query(name("example.test"), "A"))
    yield* TestClock.adjust("1 minute")
    return yield* Fiber.await(fiber)
  })

const reasonOf = (exit: Exit.Exit<DnsClient.Response, Dns.DnsError>): Dns.DnsErrorReason | undefined =>
  Result.getOrUndefined(Exit.findError(exit))?.reason

describe("DnsClient", () => {
  it.effect("sends a query and returns the response", () =>
    Effect.gen(function*() {
      const network = fakeNetwork((request) => [answer(request, { answers: 2 })])
      const exit = yield* run(udpTransport(network))
      assert.isTrue(Exit.isSuccess(exit))
      const response = Exit.isSuccess(exit) ? exit.value : undefined!
      assert.deepStrictEqual(response.answer.map((record) => [record.owner, Duration.toSeconds(record.ttl)]), [
        ["example.test.", 3600],
        ["example.test.", 3600]
      ])
      assert.strictEqual(network.requests.length, 1)
      const [request] = network.requests
      assert.strictEqual(request.server, primary)
      assert.isTrue(request.header.flags.recursionDesired)
      assert.deepStrictEqual(request.header.questions, [{ name: "example.test.", type: 1, class: 1 }])
      // The query advertises the default EDNS(0) UDP payload size.
      assert.deepStrictEqual([...request.payload.subarray(-11)], [0, 0, 41, 0x04, 0xd0, 0, 0, 0, 0, 0, 0])
      assert.strictEqual(network.state.open, 0)
    }))

  it.effect("uses a new socket and a random ID for every attempt", () =>
    Effect.gen(function*() {
      const network = fakeNetwork(() => [])
      yield* run(udpTransport(network), { attempts: 3 })
      assert.strictEqual(network.requests.length, 6)
      assert.strictEqual(network.state.opened, 6)
      assert.strictEqual(network.state.open, 0)
      assert.isAbove(new Set(network.requests.map((request) => request.header.id)).size, 1)
    }))

  it.effect("takes query IDs from the Crypto service", () =>
    Effect.gen(function*() {
      const ids = (seed: string) =>
        Effect.gen(function*() {
          const network = fakeNetwork((request) =>
            request.transport === "udp" ? [answer(request, { truncated: true })] : [answer(request)]
          )
          const transport = DnsClient.makeTransportUdp({ nameServers: [primary], udp: network.udp, tcp: network.tcp })
          yield* run(
            transport.pipe(
              Effect.provide(TestCrypto.layer(seed).pipe(Layer.provide(Layer.succeed(Crypto.Crypto, crypto))))
            )
          )
          return network.requests.map((request) => request.header.id)
        })
      const first = yield* ids("dns")
      assert.strictEqual(first.length, 2)
      assert.deepStrictEqual(yield* ids("dns"), first)
      assert.notDeepEqual(yield* ids("other"), first)
    }))

  it.effect("ignores responses that do not match the query", () =>
    Effect.gen(function*() {
      const network = fakeNetwork((request) => {
        const id = request.header.id
        const question = ["example.test.", 1] as const
        return [
          { payload: response({ id: id ^ 1, question, answers: 1 }) },
          { payload: response({ id, question, answers: 1 }), from: inet("192.0.2.66:53") },
          { payload: response({ id, question, answers: 1 }), from: inet("192.0.2.53:5353") },
          { payload: response({ id, question: ["other.test.", 1], answers: 1 }) },
          { payload: response({ id, question: ["example.test.", 28], answers: 1 }) },
          { payload: response({ id, question, isResponse: false, answers: 1 }) },
          { payload: Uint8Array.of(id >> 8, id & 0xff, 0x80) },
          // Name servers may change the letter case of the question.
          { payload: response({ id, question: ["Example.TEST.", 1], answers: 2 }) }
        ]
      })
      const exit = yield* run(udpTransport(network))
      assert.isTrue(Exit.isSuccess(exit))
      assert.strictEqual(Exit.isSuccess(exit) ? exit.value.answer.length : 0, 2)
      assert.strictEqual(network.requests.length, 1)
    }))

  it.effect("retries truncated responses over TCP", () =>
    Effect.gen(function*() {
      const network = fakeNetwork((request) =>
        request.transport === "udp" ? [answer(request, { truncated: true })] : [answer(request, { answers: 3 })]
      )
      const exit = yield* run(udpTransport(network))
      assert.strictEqual(Exit.isSuccess(exit) ? exit.value.answer.length : 0, 3)
      assert.deepStrictEqual(network.requests.map((request) => [request.transport, request.server]), [
        ["udp", primary],
        ["tcp", primary]
      ])
      assert.notStrictEqual(network.requests[0].header.id, network.requests[1].header.id)
    }))

  it.effect("retries over TCP with the name server that truncated", () =>
    Effect.gen(function*() {
      const network = fakeNetwork((request) =>
        Equal.equals(request.server, primary)
          ? []
          : request.transport === "udp"
          ? [answer(request, { truncated: true })]
          : [answer(request)]
      )
      assert.isTrue(Exit.isSuccess(yield* run(udpTransport(network))))
      assert.deepStrictEqual(network.requests.map((request) => [request.transport, request.server]), [
        ["udp", primary],
        ["udp", secondary],
        ["tcp", secondary]
      ])
    }))

  it.effect("rejects TCP responses that do not match the query", () =>
    Effect.gen(function*() {
      const network = fakeNetwork((request) =>
        request.transport === "udp"
          ? [answer(request, { truncated: true })]
          : [{ payload: response({ id: request.header.id ^ 1, question: ["example.test.", 1] }) }]
      )
      assert.strictEqual(reasonOf(yield* run(udpTransport(network), { attempts: 1 })), "InvalidResponse")
    }))

  it.effect("tries the next name server after a timeout", () =>
    Effect.gen(function*() {
      const network = fakeNetwork((request) => request.server === primary ? [] : [answer(request)])
      const exit = yield* run(udpTransport(network))
      assert.isTrue(Exit.isSuccess(exit))
      assert.deepStrictEqual(network.requests.map((request) => request.server), [primary, secondary])
    }))

  it.effect("fails with Timeout when no name server answers", () =>
    Effect.gen(function*() {
      const network = fakeNetwork(() => [])
      assert.strictEqual(reasonOf(yield* run(udpTransport(network))), "Timeout")
      assert.deepStrictEqual(network.requests.map((request) => request.server), [
        primary,
        secondary,
        primary,
        secondary
      ])
    }))

  it.effect("waits the timeout for each attempt", () =>
    Effect.gen(function*() {
      const network = fakeNetwork(() => [])
      const client = yield* DnsClient.make({ timeout: "2 seconds", attempts: 2 }).pipe(
        Effect.provideServiceEffect(DnsClient.Transport, udpTransport(network, { nameServers: [primary] }))
      )
      const fiber = yield* Effect.forkChild(client.query(name("example.test"), "A"))
      yield* TestClock.adjust("1999 millis")
      assert.strictEqual(network.requests.length, 1)
      yield* TestClock.adjust("1 millis")
      assert.strictEqual(network.requests.length, 2)
      yield* TestClock.adjust("2 seconds")
      assert.isTrue(Exit.isFailure(yield* Fiber.await(fiber)))
    }))

  it.effect("maps response codes and tries the next name server", () =>
    Effect.gen(function*() {
      for (
        const [rcode, reason] of [
          [1, "InvalidResponse"],
          [2, "ServerFailure"],
          [4, "Unsupported"],
          [5, "Refused"],
          [9, "Unknown"]
        ] as const
      ) {
        const network = fakeNetwork((request) => [answer(request, { rcode, answers: 0 })])
        const exit = yield* run(udpTransport(network), { attempts: 1 })
        assert.strictEqual(reasonOf(exit), reason)
        assert.strictEqual(network.requests.length, 2)
      }
      const recovered = fakeNetwork((
        request
      ) => [answer(request, request.server === primary ? { rcode: 2, answers: 0 } : {})])
      assert.isTrue(Exit.isSuccess(yield* run(udpTransport(recovered))))
    }))

  it.effect("accepts format errors without a question", () =>
    Effect.gen(function*() {
      const network = fakeNetwork((request) => [{ payload: response({ id: request.header.id, rcode: 1 }) }])
      assert.strictEqual(reasonOf(yield* run(udpTransport(network), { attempts: 1 })), "InvalidResponse")
      // Responses without a question are otherwise ignored.
      const ignored = fakeNetwork((request) => [{ payload: response({ id: request.header.id }) }])
      assert.strictEqual(reasonOf(yield* run(udpTransport(ignored), { attempts: 1 })), "Timeout")
    }))

  it.effect("returns NXDOMAIN responses without trying other name servers", () =>
    Effect.gen(function*() {
      const network = fakeNetwork((request) => [answer(request, { rcode: 3, answers: 0 })])
      const exit = yield* run(udpTransport(network))
      assert.strictEqual(Exit.isSuccess(exit) ? exit.value.rcode : undefined, 3)
      assert.strictEqual(network.requests.length, 1)
    }))

  it.effect("reports malformed responses", () =>
    Effect.gen(function*() {
      const network = fakeNetwork((request) => {
        const { payload } = answer(request)
        return [{ payload: payload.subarray(0, payload.length - 1) }]
      })
      const exit = yield* run(udpTransport(network))
      assert.strictEqual(reasonOf(exit), "InvalidResponse")
      assert.strictEqual(network.requests.length, 4)
    }))

  it.effect("reports transport errors as Refused", () =>
    Effect.gen(function*() {
      const network = fakeNetwork(() => [])
      const udp = (server: NetAddress.InetAddress) =>
        Effect.map(network.udp(server), (socket) =>
          DatagramSocket.make({
            reader: socket.reader,
            writer: Effect.succeed({
              write: () =>
                Effect.fail(
                  new DatagramSocket.DatagramSocketError({
                    reason: new DatagramSocket.DatagramSocketWriteError({ kind: "Unreachable", cause: new Error("") })
                  })
                ),
              writeAll: () => Effect.die("unused")
            })
          }))
      const exit = yield* run(udpTransport({ udp, tcp: network.tcp }), { attempts: 1 })
      assert.strictEqual(reasonOf(exit), "Refused")
      assert.strictEqual(network.state.open, 0)
    }))

  it.effect("rotates the first name server when rotate is set", () =>
    Effect.gen(function*() {
      const network = fakeNetwork((request) => [answer(request)])
      const client = yield* DnsClient.make({ rotate: true }).pipe(
        Effect.provideServiceEffect(DnsClient.Transport, udpTransport(network))
      )
      for (let i = 0; i < 3; i++) yield* client.query(name("example.test"), "A")
      assert.deepStrictEqual(network.requests.map((request) => request.server), [primary, secondary, primary])
    }))

  it.effect("closes the socket when the query is interrupted", () =>
    Effect.gen(function*() {
      const network = fakeNetwork(() => [])
      const client = yield* DnsClient.make().pipe(
        Effect.provideServiceEffect(DnsClient.Transport, udpTransport(network, { nameServers: [primary] }))
      )
      const fiber = yield* Effect.forkChild(client.query(name("example.test"), "A"))
      yield* TestClock.adjust("1 second")
      assert.strictEqual(network.state.open, 1)
      yield* Fiber.interrupt(fiber)
      assert.strictEqual(network.state.open, 0)
    }))

  it.effect("uses port 53 for name servers given as IP addresses", () =>
    Effect.gen(function*() {
      const network = fakeNetwork((request) => [answer(request)])
      const exit = yield* run(udpTransport(network, { nameServers: [NetAddress.ipFromStringUnsafe("192.0.2.53")] }))
      assert.isTrue(Exit.isSuccess(exit))
      assert.deepStrictEqual(network.requests.map((request) => NetAddress.formatInet(request.server)), [
        "192.0.2.53:53"
      ])
    }))

  it.effect("parses name servers given as strings", () =>
    Effect.gen(function*() {
      const network = fakeNetwork(() => [])
      yield* run(udpTransport(network, { nameServers: ["192.0.2.53", "2001:db8::53", "[2001:db8::53]:5353"] }), {
        attempts: 1
      })
      assert.deepStrictEqual(network.requests.map((request) => NetAddress.formatInet(request.server)), [
        "192.0.2.53:53",
        "[2001:db8::53]:53",
        "[2001:db8::53]:5353"
      ])
      assert.isTrue(Exit.hasDies(yield* Effect.exit(udpTransport(network, { nameServers: ["ns.example"] }))))
    }))

  it.effect("parses and normalizes names given as strings", () =>
    Effect.gen(function*() {
      const network = fakeNetwork((request) => [answer(request)])
      const client = yield* DnsClient.make().pipe(
        Effect.provideServiceEffect(DnsClient.Transport, udpTransport(network, { nameServers: [primary] }))
      )
      yield* client.query("Bücher.Example.", "A")
      assert.deepStrictEqual(network.requests.map((request) => request.header.questions[0].name), [
        "xn--bcher-kva.example."
      ])
      const error = yield* Effect.flip(client.query("not a name", "A"))
      assert.deepStrictEqual([error.reason, error.method, error.hostname, error.recordType], [
        "BadName",
        "resolve",
        "not a name",
        "A"
      ])
      assert.strictEqual(network.requests.length, 1)
    }))

  it.effect("parses search domains given as strings", () =>
    Effect.gen(function*() {
      const network = fakeNetwork(() => [])
      const client = yield* DnsClient.make({ search: ["Corp.Example", "example."] }).pipe(
        Effect.provideServiceEffect(DnsClient.Transport, udpTransport(network))
      )
      assert.deepStrictEqual<ReadonlyArray<string>>(client.search, ["corp.example", "example."])
      const exit = yield* Effect.exit(
        DnsClient.make({ search: ["bad..name"] }).pipe(
          Effect.provideServiceEffect(DnsClient.Transport, udpTransport(network))
        )
      )
      assert.isTrue(Exit.hasDies(exit))
    }))

  it.effect("sends queries without recursion when requested", () =>
    Effect.gen(function*() {
      const network = fakeNetwork((request) => [answer(request)])
      const client = yield* DnsClient.make().pipe(
        Effect.provideServiceEffect(DnsClient.Transport, udpTransport(network, { nameServers: [primary] }))
      )
      yield* client.query(name("example.test."), "A", { recursionDesired: false })
      assert.isFalse(network.requests[0].header.flags.recursionDesired)
    }))

  it.effect("rejects invalid options when the service is created", () =>
    Effect.gen(function*() {
      const network = fakeNetwork(() => [])
      for (
        const options of [{ attempts: 0 }, { attempts: 1.5 }, { timeout: Duration.zero }, {
          timeout: Duration.infinity
        }, { ndots: -1 }]
      ) {
        const exit = yield* Effect.exit(
          DnsClient.make(options).pipe(Effect.provideServiceEffect(DnsClient.Transport, udpTransport(network)))
        )
        assert.isTrue(Exit.hasDies(exit), JSON.stringify(options))
      }
      for (const options of [{ udpPayloadSize: 511 }, { udpPayloadSize: 65536 }, { nameServers: [] as any }]) {
        assert.isTrue(Exit.hasDies(yield* Effect.exit(udpTransport(network, options))), JSON.stringify(options))
      }
    }))
})

describe("makeTransportTcp", () => {
  it.effect("sends every query over TCP with a random ID", () =>
    Effect.gen(function*() {
      const network = fakeNetwork((request) => [answer(request, { answers: 2 })])
      const exit = yield* run(tcpTransport(network), { attempts: 3 })
      assert.strictEqual(Exit.isSuccess(exit) ? exit.value.answer.length : 0, 2)
      const other = fakeNetwork((request) => [answer(request)])
      yield* run(tcpTransport(other))
      const requests = [...network.requests, ...other.requests]
      assert.deepStrictEqual(requests.map((request) => [request.transport, request.server]), [
        ["tcp", primary],
        ["tcp", primary]
      ])
      assert.notStrictEqual(requests[0].header.id, requests[1].header.id)
      // The query has an EDNS(0) OPT record.
      assert.strictEqual(requests[0].payload.length, 12 + 14 + 4 + 11)
    }))

  it.effect("connects to the port of each name server", () =>
    Effect.gen(function*() {
      const network = fakeNetwork(() => [])
      yield* run(
        tcpTransport(network, {
          nameServers: [inet("[2001:db8::53]:5353"), NetAddress.ipFromStringUnsafe("192.0.2.53")]
        })
      )
      assert.deepStrictEqual(network.requests.slice(0, 2).map((request) => NetAddress.formatInet(request.server)), [
        "[2001:db8::53]:5353",
        "192.0.2.53:53"
      ])
    }))

  it.effect("returns truncated responses as received", () =>
    Effect.gen(function*() {
      const network = fakeNetwork((request) => [answer(request, { truncated: true })])
      const exit = yield* run(tcpTransport(network))
      assert.isTrue(Exit.isSuccess(exit) && exit.value.flags.truncated)
      assert.strictEqual(network.requests.length, 1)
    }))

  it.effect("rejects responses that do not match the query", () =>
    Effect.gen(function*() {
      const network = fakeNetwork((request) => [
        { payload: response({ id: request.header.id ^ 1, question: ["example.test.", 1], answers: 1 }) }
      ])
      assert.strictEqual(reasonOf(yield* run(tcpTransport(network), { attempts: 1 })), "InvalidResponse")
      assert.strictEqual(network.requests.length, 2)
    }))

  it.effect("tries each name server, including IPv6 addresses, until one answers", () =>
    Effect.gen(function*() {
      const network = fakeNetwork((request) => Equal.equals(request.server, primary) ? [] : [answer(request)])
      assert.isTrue(Exit.isSuccess(yield* run(tcpTransport(network))))
      assert.deepStrictEqual(network.requests.map((request) => request.server), [primary, secondary])
      const silent = fakeNetwork(() => [])
      assert.strictEqual(reasonOf(yield* run(tcpTransport(silent))), "Timeout")
      assert.strictEqual(silent.requests.length, 4)
    }))

  it.effect("rejects an empty name server list", () =>
    Effect.gen(function*() {
      const network = fakeNetwork(() => [])
      assert.isTrue(Exit.hasDies(yield* Effect.exit(tcpTransport(network, { nameServers: [] as any }))))
    }))
})

describe("makeTransportHttps", () => {
  const first = "https://dns.example/dns-query"
  const second = "https://backup.example/resolve?key=1"

  interface HttpRequest {
    readonly method: string
    readonly url: URL
    readonly headers: Readonly<Record<string, string>>
    readonly query: Uint8Array
    readonly header: DnsMessage.Header
    readonly signal: AbortSignal
  }

  interface HttpReply {
    readonly status?: number | undefined
    readonly contentType?: string | undefined
    readonly payload?: Uint8Array | undefined
  }

  /**
   * An in-memory `HttpClient` whose servers answer with `handle`. Requests
   * answered with `"hang"` never complete; `"error"` fails with a transport
   * error.
   */
  const fakeHttp = (handle: (request: HttpRequest) => HttpReply | "hang" | "error") => {
    const requests: Array<HttpRequest> = []
    const layer = Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make((request, url, signal) =>
        Effect.suspend(() => {
          const query = request.method === "GET"
            ? Result.getOrThrow(Base64Url.decode(url.searchParams.get("dns") ?? ""))
            : request.body._tag === "Uint8Array"
            ? request.body.body
            : new Uint8Array(0)
          const received = {
            method: request.method,
            url,
            headers: {
              ...request.headers,
              ...(request.body._tag === "Uint8Array" ? { "content-type": request.body.contentType } : {})
            },
            query,
            header: Result.getOrThrow(DnsMessage.decodeHeader(query)),
            signal
          }
          requests.push(received)
          const reply = handle(received)
          if (reply === "hang") return Effect.never
          if (reply === "error") {
            return Effect.fail(
              new HttpClientError.HttpClientError({
                reason: new HttpClientError.TransportError({ request, cause: new Error("connection refused") })
              })
            )
          }
          return Effect.succeed(HttpClientResponse.fromWeb(
            request,
            new Response(reply.payload as Uint8Array<ArrayBuffer> | undefined ?? null, {
              status: reply.status ?? 200,
              headers: { "content-type": reply.contentType ?? "application/dns-message" }
            })
          ))
        })
      )
    )
    return { layer, requests }
  }

  const httpsTransport = (http: ReturnType<typeof fakeHttp>, options?: Partial<DnsClient.TransportHttpsOptions>) =>
    DnsClient.makeTransportHttps({ urls: [first, second], ...options }).pipe(Effect.provide(http.layer))

  const runHttps = (
    http: ReturnType<typeof fakeHttp>,
    { method, urls, ...options }: Partial<DnsClient.TransportHttpsOptions> & DnsClient.MakeOptions = {}
  ) => run(httpsTransport(http, { method, ...(urls === undefined ? {} : { urls }) }), options)

  // The padded query for example.test. A with ID 0 and recursion desired.
  const paddedQuery = Result.getOrThrow(Hex.decode(
    `
      0000 0100 0001 0000 0000 0001
      076578616d706c65047465737400 0001 0001
      00 0029 04d0 00000000 0057 000c 0053 ${"00".repeat(83)}
    `.replace(/\s+/g, "")
  ))

  it.effect("sends GET requests with the query in the dns parameter", () =>
    Effect.gen(function*() {
      const http = fakeHttp((request) => answer(request, { answers: 2 }))
      const exit = yield* runHttps(http)
      assert.strictEqual(Exit.isSuccess(exit) ? exit.value.answer.length : 0, 2)
      assert.strictEqual(http.requests.length, 1)
      const [request] = http.requests
      assert.strictEqual(request.method, "GET")
      assert.strictEqual(paddedQuery.length, 128)
      assert.strictEqual(
        request.url.toString(),
        `https://dns.example/dns-query?dns=${Base64Url.encode(paddedQuery)}`
      )
      // base64url without padding: 128 bytes take 171 characters.
      assert.match(request.url.searchParams.get("dns")!, /^AAABAAABAAAAAAABB2V4YW1wbGU[\w-]{144}$/)
      assert.strictEqual(request.headers.accept, "application/dns-message")
    }))

  it.effect("keeps the parameters of the URL", () =>
    Effect.gen(function*() {
      const http = fakeHttp((request) => answer(request))
      yield* runHttps(http, { urls: [second] })
      const [request] = http.requests
      assert.strictEqual(request.url.origin + request.url.pathname, "https://backup.example/resolve")
      assert.deepStrictEqual([...request.url.searchParams.keys()], ["key", "dns"])
      assert.deepStrictEqual(request.query, paddedQuery)
    }))

  it.effect("sends POST requests with the query as the body", () =>
    Effect.gen(function*() {
      const http = fakeHttp((request) => answer(request))
      const exit = yield* runHttps(http, { method: "POST" })
      assert.isTrue(Exit.isSuccess(exit))
      const [request] = http.requests
      assert.strictEqual(request.method, "POST")
      assert.strictEqual(request.url.toString(), first)
      assert.strictEqual(request.headers.accept, "application/dns-message")
      assert.strictEqual(request.headers["content-type"], "application/dns-message")
      assert.deepStrictEqual(request.query, paddedQuery)
    }))

  it.effect("sends queries with ID 0 padded to 128 bytes", () =>
    Effect.gen(function*() {
      const http = fakeHttp((request) => answer(request))
      const client = yield* DnsClient.make().pipe(
        Effect.provideServiceEffect(DnsClient.Transport, httpsTransport(http, { urls: [first] }))
      )
      for (const host of ["a.test", `${"a".repeat(63)}.${"b".repeat(32)}.test`]) {
        yield* client.query(name(host), "AAAA", { recursionDesired: false })
      }
      assert.deepStrictEqual(http.requests.map((request) => request.header.id), [0, 0])
      assert.deepStrictEqual(http.requests.map((request) => request.query.length), [128, 256])
      assert.isFalse(http.requests[0].header.flags.recursionDesired)
    }))

  it.effect("checks the status and content type", () =>
    Effect.gen(function*() {
      for (
        const [reply, reason] of [
          [{ status: 500 }, "ServerFailure"],
          [{ status: 503, contentType: "text/plain" }, "ServerFailure"],
          [{ status: 404 }, "InvalidResponse"],
          [{ status: 302 }, "InvalidResponse"],
          [{ contentType: "text/html" }, "InvalidResponse"],
          [{ contentType: "application/json" }, "InvalidResponse"]
        ] as const
      ) {
        const http = fakeHttp((request) => ({ ...answer(request), ...reply }))
        const exit = yield* runHttps(http, { attempts: 1 })
        assert.strictEqual(reasonOf(exit), reason, JSON.stringify(reply))
        assert.deepStrictEqual(http.requests.map((request) => request.url.origin), [
          "https://dns.example",
          "https://backup.example"
        ])
        // Requests whose body is not read are aborted when the attempt ends.
        assert.isTrue(http.requests.every((request) => request.signal.aborted))
      }
      // Media type parameters and letter case are accepted.
      const http = fakeHttp((request) => ({
        ...answer(request),
        status: 203,
        contentType: "Application/DNS-Message; charset=binary"
      }))
      assert.isTrue(Exit.isSuccess(yield* runHttps(http)))
    }))

  it.effect("rejects responses that do not match the query", () =>
    Effect.gen(function*() {
      const question = ["example.test.", 1] as const
      for (
        const payload of [
          response({ id: 1, question, answers: 1 }),
          response({ id: 0, question: ["other.test.", 1], answers: 1 }),
          response({ id: 0, question: ["example.test.", 28], answers: 1 }),
          response({ id: 0, question, isResponse: false, answers: 1 }),
          response({ id: 0, answers: 1 }),
          Uint8Array.of(0, 0, 0x80)
        ]
      ) {
        const http = fakeHttp(() => ({ payload }))
        assert.strictEqual(reasonOf(yield* runHttps(http, { attempts: 1 })), "InvalidResponse")
        assert.strictEqual(http.requests.length, 2)
      }
      const http = fakeHttp(() => ({ payload: response({ id: 0, question: ["Example.TEST.", 1], answers: 1 }) }))
      assert.isTrue(Exit.isSuccess(yield* runHttps(http)))
    }))

  it.effect("ignores the truncation flag", () =>
    Effect.gen(function*() {
      const http = fakeHttp((request) => answer(request, { truncated: true }))
      const exit = yield* runHttps(http)
      assert.isTrue(Exit.isSuccess(exit) && exit.value.flags.truncated)
      assert.strictEqual(http.requests.length, 1)
    }))

  it.effect("maps response codes and tries the next URL", () =>
    Effect.gen(function*() {
      const http = fakeHttp((request) =>
        answer(request, request.url.origin === "https://dns.example" ? { rcode: 5, answers: 0 } : {})
      )
      assert.isTrue(Exit.isSuccess(yield* runHttps(http)))
      const refused = fakeHttp((request) => answer(request, { rcode: 5, answers: 0 }))
      assert.strictEqual(reasonOf(yield* runHttps(refused)), "Refused")
      assert.strictEqual(refused.requests.length, 4)
      const nxdomain = fakeHttp((request) => answer(request, { rcode: 3, answers: 0 }))
      const exit = yield* runHttps(nxdomain)
      assert.strictEqual(Exit.isSuccess(exit) ? exit.value.rcode : undefined, 3)
    }))

  it.effect("reports HTTP client errors as Refused", () =>
    Effect.gen(function*() {
      const http = fakeHttp(() => "error")
      assert.strictEqual(reasonOf(yield* runHttps(http)), "Refused")
      assert.strictEqual(http.requests.length, 4)
    }))

  it.effect("times out and aborts each request", () =>
    Effect.gen(function*() {
      const http = fakeHttp(() => "hang")
      const client = yield* DnsClient.make({ timeout: "2 seconds", attempts: 2 }).pipe(
        Effect.provideServiceEffect(DnsClient.Transport, httpsTransport(http))
      )
      const fiber = yield* Effect.forkChild(client.query(name("example.test"), "A"))
      yield* TestClock.adjust("1999 millis")
      assert.strictEqual(http.requests.length, 1)
      assert.isFalse(http.requests[0].signal.aborted)
      yield* TestClock.adjust("1 millis")
      assert.strictEqual(http.requests.length, 2)
      assert.isTrue(http.requests[0].signal.aborted)
      yield* TestClock.adjust("6 seconds")
      assert.strictEqual(reasonOf(yield* Fiber.await(fiber)), "Timeout")
      assert.deepStrictEqual(http.requests.map((request) => request.url.origin), [
        "https://dns.example",
        "https://backup.example",
        "https://dns.example",
        "https://backup.example"
      ])
    }))

  it.effect("tries the next URL after a timeout", () =>
    Effect.gen(function*() {
      const http = fakeHttp((request) => request.url.origin === "https://dns.example" ? "hang" : answer(request))
      assert.isTrue(Exit.isSuccess(yield* runHttps(http)))
      assert.strictEqual(http.requests.length, 2)
    }))

  it.effect("rotates the first URL when rotate is set", () =>
    Effect.gen(function*() {
      const http = fakeHttp((request) => answer(request))
      const client = yield* DnsClient.make({ rotate: true }).pipe(
        Effect.provideServiceEffect(DnsClient.Transport, httpsTransport(http, { urls: [first, new URL(second)] }))
      )
      for (let i = 0; i < 3; i++) yield* client.query(name("example.test"), "A")
      assert.deepStrictEqual(http.requests.map((request) => request.url.origin), [
        "https://dns.example",
        "https://backup.example",
        "https://dns.example"
      ])
    }))

  it.effect("rejects invalid URLs", () =>
    Effect.gen(function*() {
      const http = fakeHttp(() => "hang")
      for (const urls of [[] as any, ["dns.example"] as const, ["ftp://dns.example/"] as const]) {
        assert.isTrue(Exit.hasDies(yield* Effect.exit(httpsTransport(http, { urls }))), JSON.stringify(urls))
      }
    }))
})

describe("nameServerFromString", () => {
  it("parses IP addresses with and without a port", () => {
    const format = (input: string) => Result.map(DnsClient.nameServerFromString(input), NetAddress.formatInet)
    assert.deepStrictEqual(
      ["192.0.2.53", "192.0.2.53:5353", "2001:db8::53", "[2001:db8::53]:5353", "fe80::1%2"].map(format),
      [
        Result.succeed("192.0.2.53:53"),
        Result.succeed("192.0.2.53:5353"),
        Result.succeed("[2001:db8::53]:53"),
        Result.succeed("[2001:db8::53]:5353"),
        Result.succeed("[fe80::1%2]:53")
      ]
    )
    for (const input of ["ns.example", "ns.example:53", "192.0.2.53:", "[2001:db8::53]", "192.0.2.256", ""]) {
      assert.isTrue(Result.isFailure(DnsClient.nameServerFromString(input)), input)
    }
  })
})

describe("nameServerFromInput", () => {
  it("parses strings, converts address inputs, and uses port 53 for IP addresses", () => {
    const inet = NetAddress.inetAddressFromStringUnsafe("192.0.2.53:5353")
    const format = (input: NetAddress.IpAddressInput | NetAddress.InetAddressInput) =>
      Result.map(DnsClient.nameServerFromInput(input), NetAddress.formatInet)
    assert.deepStrictEqual(
      [
        "2001:db8::53",
        NetAddress.ipFromStringUnsafe("192.0.2.53"),
        [192, 0, 2, 53] as const,
        inet,
        { address: "2001:db8::53", port: 5353 }
      ].map(format),
      [
        Result.succeed("[2001:db8::53]:53"),
        Result.succeed("192.0.2.53:53"),
        Result.succeed("192.0.2.53:53"),
        Result.succeed("192.0.2.53:5353"),
        Result.succeed("[2001:db8::53]:5353")
      ]
    )
    assert.strictEqual(Result.getOrThrow(DnsClient.nameServerFromInput(inet)), inet)
    for (
      const input of ["ns.example", [192, 0, 2] as unknown as NetAddress.IpAddressInput, { address: "ns", port: 53 }]
    ) {
      assert.isTrue(Result.isFailure(DnsClient.nameServerFromInput(input)), JSON.stringify(input))
    }
  })
})

describe("parseResolvConf", () => {
  it("reads name servers, search domains, and options", () => {
    const config = DnsClient.parseResolvConf([
      "# generated",
      "; comment",
      "nameserver 192.0.2.1",
      "nameserver 2001:db8::1",
      "nameserver fe80::1%2",
      "nameserver 192.0.2.4",
      "domain ignored.example",
      "search Corp.Example example. bad..name",
      "options ndots:3 timeout:2 attempts:4 rotate edns0 unknown:1",
      "sortlist 192.0.2.0/24",
      ""
    ].join("\r\n"))
    assert.deepStrictEqual(config.nameServers.map(NetAddress.formatInet), [
      "192.0.2.1:53",
      "[2001:db8::1]:53",
      "[fe80::1%2]:53"
    ])
    assert.deepStrictEqual<ReadonlyArray<string> | undefined>(config.search, ["corp.example", "example."])
    assert.strictEqual(config.ndots, 3)
    assert.deepStrictEqual(config.timeout, Duration.seconds(2))
    assert.strictEqual(config.attempts, 4)
    assert.isTrue(config.rotate)
  })

  it("leaves missing values undefined", () => {
    assert.deepStrictEqual(DnsClient.parseResolvConf(""), {
      nameServers: [],
      search: undefined,
      ndots: undefined,
      timeout: undefined,
      attempts: undefined,
      rotate: undefined
    })
  })

  it("skips invalid name servers", () => {
    const config = DnsClient.parseResolvConf("nameserver fe80::1%eth0\nnameserver example.com\nnameserver\n")
    assert.deepStrictEqual(config.nameServers, [])
  })

  it("uses the last search or domain line", () => {
    assert.deepStrictEqual<ReadonlyArray<string> | undefined>(
      DnsClient.parseResolvConf("search a.example b.example\ndomain c.example").search,
      [
        "c.example"
      ]
    )
  })

  it("clamps options like glibc and ignores invalid values", () => {
    const config = DnsClient.parseResolvConf("options ndots:99 timeout:0 attempts:9\noptions ndots:x attempts:-1")
    assert.strictEqual(config.ndots, 15)
    assert.deepStrictEqual(config.timeout, Duration.seconds(1))
    assert.strictEqual(config.attempts, 5)
  })
})

describe("parseHosts", () => {
  it("reads addresses and aliases", () => {
    const hosts = DnsClient.parseHosts([
      "127.0.0.1   localhost",
      "::1         localhost ip6-localhost # loopback",
      "# 192.0.2.9 commented.example",
      "192.0.2.1   DB.Example.  db",
      "192.0.2.1   db",
      "fe80::1%eth0 router",
      "not-an-ip   ignored.example",
      "192.0.2.2   bad..name good.example",
      "192.0.2.3"
    ].join("\n"))
    assert.deepStrictEqual(
      Object.fromEntries([...hosts].map(([name, addresses]) => [name, addresses.map(NetAddress.formatIp)])),
      {
        localhost: ["127.0.0.1", "::1"],
        "ip6-localhost": ["::1"],
        "db.example": ["192.0.2.1"],
        db: ["192.0.2.1"],
        "good.example": ["192.0.2.2"]
      }
    )
  })
})

describe("layerDns", () => {
  const a = (address: string) =>
    Dns.makeRecordUnsafe("A", { address: NetAddress.ipFromStringUnsafe(address) as NetAddress.Ipv4Address })
  const aaaa = (address: string) =>
    Dns.makeRecordUnsafe("AAAA", { address: NetAddress.ipFromStringUnsafe(address) as NetAddress.Ipv6Address })
  const cname = (target: string) => Dns.makeRecordUnsafe("CNAME", { target: name(target) })
  const ptr = (host: string) => Dns.makeRecordUnsafe("PTR", { host: name(host) })

  /**
   * A client answering from fixed records by owner name. The answer to a
   * query holds every record of its name, and of the names its CNAME records
   * point to when `chains` is set.
   */
  const staticClient = (options: {
    readonly records: Record<string, ReadonlyArray<Dns.DnsRecord | DnsClient.RawRecord>>
    readonly search?: ReadonlyArray<string>
    readonly ndots?: number
    readonly hosts?: string
    readonly chains?: boolean
    readonly failures?: Record<string, Dns.DnsErrorReason>
  }) => {
    const queries: Array<string> = []
    const client = DnsClient.DnsClient.of({
      query: (queried, type) =>
        Effect.suspend(() => {
          queries.push(`${queried} ${type}`)
          const key = queried.endsWith(".") ? queried : `${queried}.`
          const reason = options.failures?.[key]
          if (reason !== undefined) {
            return Effect.fail(new Dns.DnsError({ reason, method: "resolve", hostname: queried, recordType: type }))
          }
          const answer: Array<DnsClient.ResourceRecord> = []
          let owner: string | undefined = key
          for (let hops = 0; owner !== undefined && hops < 20; hops++) {
            const records: ReadonlyArray<Dns.DnsRecord | DnsClient.RawRecord> = options.records[owner] ?? []
            for (const data of records) {
              if (data._tag === type || data._tag === "CNAME" || data._tag === "Raw") {
                answer.push({ owner: owner.toUpperCase(), ttl: Duration.seconds(60), class: 1, data })
              }
            }
            const alias = records.find((record): record is Dns.Cname => record._tag === "CNAME")
            owner = options.chains && type !== "CNAME" && alias !== undefined ? alias.target : undefined
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
            rcode: key in options.records ? 0 : 3,
            answer,
            authority: [],
            additional: [],
            edns: undefined
          })
        }),
      search: (options.search ?? []).map(name),
      ndots: options.ndots ?? 1,
      hosts: Effect.succeed(DnsClient.parseHosts(options.hosts ?? ""))
    })
    const dns = Effect.service(Dns.Dns).pipe(
      Effect.provide(DnsClient.layerDns.pipe(Layer.provide(Layer.succeed(DnsClient.DnsClient, client))))
    )
    return { dns, queries }
  }

  const formatIps = (addresses: ReadonlyArray<NetAddress.IpAddress>) => addresses.map(NetAddress.formatIp)

  it.effect("looks up names in the hosts table before DNS", () =>
    Effect.gen(function*() {
      const { dns, queries } = staticClient({
        hosts: "192.0.2.1 db.internal\n2001:db8::1 db.internal",
        records: { "v6.internal.": [aaaa("2001:db8::6")] }
      })
      const service = yield* dns
      assert.deepStrictEqual(formatIps(yield* service.lookup(name("db.internal."))), ["192.0.2.1", "2001:db8::1"])
      assert.deepStrictEqual(formatIps(yield* service.lookup(name("db.internal"), { family: "IPv6" })), [
        "2001:db8::1"
      ])
      assert.deepStrictEqual(queries, [])
    }))

  it.effect("queries DNS when the hosts table has no address of the family", () =>
    Effect.gen(function*() {
      const { dns, queries } = staticClient({
        hosts: "192.0.2.1 db.internal",
        records: { "db.internal.": [aaaa("2001:db8::6")] }
      })
      assert.deepStrictEqual(formatIps(yield* (yield* dns).lookup(name("db.internal"), { family: "IPv6" })), [
        "2001:db8::6"
      ])
      assert.deepStrictEqual(queries, ["db.internal. AAAA"])
    }))

  it.effect("returns IPv4 addresses before IPv6 addresses", () =>
    Effect.gen(function*() {
      const { dns, queries } = staticClient({
        records: { "example.test.": [aaaa("2001:db8::1"), a("192.0.2.1")] }
      })
      assert.deepStrictEqual(formatIps(yield* (yield* dns).lookup(name("example.test"))), [
        "192.0.2.1",
        "2001:db8::1"
      ])
      assert.deepStrictEqual(queries.sort(), ["example.test. A", "example.test. AAAA"])
    }))

  it.effect("tries search domains after names with fewer than ndots dots", () =>
    Effect.gen(function*() {
      const { dns, queries } = staticClient({
        search: ["corp.example", "example."],
        records: { "db.example.": [a("192.0.2.1")] }
      })
      assert.deepStrictEqual(formatIps(yield* (yield* dns).lookup(name("db"), { family: "IPv4" })), ["192.0.2.1"])
      assert.deepStrictEqual(queries, ["db.corp.example. A", "db.example. A"])
    }))

  it.effect("tries names with at least ndots dots as given first", () =>
    Effect.gen(function*() {
      const { dns, queries } = staticClient({
        search: ["corp.example"],
        ndots: 1,
        records: { "db.internal.corp.example.": [a("192.0.2.1")] }
      })
      assert.deepStrictEqual(formatIps(yield* (yield* dns).lookup(name("db.internal"), { family: "IPv4" })), [
        "192.0.2.1"
      ])
      assert.deepStrictEqual(queries, ["db.internal. A", "db.internal.corp.example. A"])
    }))

  it.effect("tries fully qualified names only as given", () =>
    Effect.gen(function*() {
      const { dns, queries } = staticClient({ search: ["corp.example"], records: {} })
      const error = yield* Effect.flip((yield* dns).lookup(name("db."), { family: "IPv4" }))
      assert.strictEqual(error.reason, "NotFound")
      assert.strictEqual(error.method, "lookup")
      assert.deepStrictEqual(queries, ["db. A"])
    }))

  it.effect("reports failed queries when no name has addresses", () =>
    Effect.gen(function*() {
      const { dns, queries } = staticClient({
        search: ["corp.example"],
        records: {},
        failures: { "db.corp.example.": "Timeout" }
      })
      const error = yield* Effect.flip((yield* dns).lookup(name("db"), { family: "IPv4" }))
      assert.strictEqual(error.reason, "Timeout")
      assert.strictEqual(error.method, "lookup")
      assert.strictEqual(error.hostname, "db")
      assert.deepStrictEqual(queries, ["db.corp.example. A", "db. A"])
    }))

  it.effect("ignores a failed query when another name has addresses", () =>
    Effect.gen(function*() {
      const { dns } = staticClient({
        search: ["corp.example"],
        records: { "db.": [a("192.0.2.1")] },
        failures: { "db.corp.example.": "ServerFailure" }
      })
      assert.deepStrictEqual(formatIps(yield* (yield* dns).lookup(name("db"), { family: "IPv4" })), ["192.0.2.1"])
    }))

  it.effect("follows CNAME records in the answer", () =>
    Effect.gen(function*() {
      const { dns, queries } = staticClient({
        chains: true,
        records: { "www.example.test.": [cname("cdn.example.test.")], "cdn.example.test.": [a("192.0.2.1")] }
      })
      assert.deepStrictEqual(formatIps(yield* (yield* dns).lookup(name("www.example.test"), { family: "IPv4" })), [
        "192.0.2.1"
      ])
      assert.deepStrictEqual(queries, ["www.example.test. A"])
    }))

  it.effect("queries the target of a CNAME record the answer does not resolve", () =>
    Effect.gen(function*() {
      const { dns, queries } = staticClient({
        records: { "www.example.test.": [cname("cdn.example.test.")], "cdn.example.test.": [a("192.0.2.1")] }
      })
      assert.deepStrictEqual(formatIps(yield* (yield* dns).lookup(name("www.example.test"), { family: "IPv4" })), [
        "192.0.2.1"
      ])
      assert.deepStrictEqual(queries, ["www.example.test. A", "cdn.example.test. A"])
    }))

  it.effect("follows up to 8 CNAME records", () =>
    Effect.gen(function*() {
      const chain = (aliases: number) => {
        const records: Record<string, ReadonlyArray<Dns.DnsRecord>> = {}
        for (let i = 0; i < aliases; i++) records[`a${i}.example.test.`] = [cname(`a${i + 1}.example.test.`)]
        records[`a${aliases}.example.test.`] = [a("192.0.2.1")]
        return staticClient({ records })
      }
      const eight = chain(8)
      assert.deepStrictEqual(yield* (yield* eight.dns).resolve(name("a0.example.test."), "A"), [a("192.0.2.1")])
      assert.strictEqual(eight.queries.length, 9)
      const nine = chain(9)
      const error = yield* Effect.flip((yield* nine.dns).resolve(name("a0.example.test."), "A"))
      assert.strictEqual(error.reason, "NotFound")
      assert.strictEqual(nine.queries.length, 9)
      // A loop ends the same way.
      const loop = staticClient({
        chains: true,
        records: { "a.example.test.": [cname("b.example.test.")], "b.example.test.": [cname("a.example.test.")] }
      })
      assert.strictEqual(
        (yield* Effect.flip((yield* loop.dns).resolve(name("a.example.test."), "A"))).reason,
        "NotFound"
      )
    }))

  it.effect("resolves records and skips raw records", () =>
    Effect.gen(function*() {
      const { dns } = staticClient({
        records: {
          "example.test.": [ptr("good.example.test."), { _tag: "Raw", type: 12, data: Uint8Array.of(0) }],
          "raw.test.": [{ _tag: "Raw", type: 12, data: Uint8Array.of(0) }],
          "other.test.": [{ _tag: "Raw", type: 15, data: Uint8Array.of(0) }]
        }
      })
      assert.deepStrictEqual(yield* (yield* dns).resolve(name("example.test"), "PTR"), [ptr("good.example.test.")])
      // A name whose records of the type cannot be represented is reported as an invalid response.
      const invalid = yield* Effect.flip((yield* dns).resolve(name("raw.test"), "PTR"))
      assert.deepStrictEqual([invalid.reason, invalid.recordType], ["InvalidResponse", "PTR"])
      assert.strictEqual((yield* Effect.flip((yield* dns).resolve(name("other.test"), "PTR"))).reason, "NotFound")
      const error = yield* Effect.flip((yield* dns).resolve(name("missing.test"), "PTR"))
      assert.strictEqual(error.reason, "NotFound")
      assert.strictEqual(error.recordType, "PTR")
    }))

  it.effect("returns CNAME records when they are queried", () =>
    Effect.gen(function*() {
      const { dns } = staticClient({
        chains: true,
        records: { "www.example.test.": [cname("example.test.")], "example.test.": [a("192.0.2.1")] }
      })
      assert.deepStrictEqual(yield* (yield* dns).resolve(name("www.example.test"), "CNAME"), [cname("example.test.")])
    }))

  it.effect("looks up the names of an address through classless delegations", () =>
    Effect.gen(function*() {
      const { dns } = staticClient({
        chains: true,
        records: {
          "1.2.0.192.in-addr.arpa.": [cname("1.0-25.2.0.192.in-addr.arpa.")],
          "1.0-25.2.0.192.in-addr.arpa.": [ptr("host.example.test.")]
        }
      })
      assert.deepStrictEqual<ReadonlyArray<string>>(
        yield* (yield* dns).reverse(NetAddress.ipFromStringUnsafe("192.0.2.1")),
        [
          "host.example.test."
        ]
      )
      const failing = staticClient({ records: {}, failures: { "2.2.0.192.in-addr.arpa.": "Refused" } })
      const error = yield* Effect.flip((yield* failing.dns).reverse(NetAddress.ipFromStringUnsafe("192.0.2.2")))
      assert.deepStrictEqual([error.reason, error.method, error.hostname], ["Refused", "reverse", "192.0.2.2"])
    }))
})
