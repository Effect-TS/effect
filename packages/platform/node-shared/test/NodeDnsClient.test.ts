import * as NodeDns from "@effect/platform-node-shared/NodeDns"
import * as NodeDnsClient from "@effect/platform-node-shared/NodeDnsClient"
import { assert, describe, it } from "@effect/vitest"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as DnsClient from "effect/net/DnsClient"
import * as Host from "effect/net/Host"
import * as NetAddress from "effect/net/NetAddress"
import * as Dgram from "node:dgram"
import * as Net from "node:net"

const scoped = NetAddress.inetAddressFromStringUnsafe("[fe80::1%1]:53")
const global = NetAddress.inetAddressFromStringUnsafe("192.0.2.53:53")

// Answers a query with its question and, unless truncated, an A record for 192.0.2.1.
const reply = (query: Uint8Array, truncated: boolean): Uint8Array => {
  let end = 12
  while (query[end] !== 0) end += query[end] + 1
  const answer = truncated ? [] : [0xc0, 12, 0, 1, 0, 1, 0, 0, 0, 60, 0, 4, 192, 0, 2, 1]
  const message = Uint8Array.from([...query.subarray(0, end + 5), ...answer])
  message[2] = 0x80 | (truncated ? 0x02 : 0) | (query[2] & 0x01)
  message[3] = 0x80
  message[7] = truncated ? 0 : 1
  message[10] = message[11] = 0
  return message
}

const listen = (udp: Dgram.Socket, tcp: Net.Server, port: number) =>
  new Promise<number>((resolve, reject) => {
    tcp.once("error", reject).listen(port, "127.0.0.1", () => {
      const { port } = tcp.address() as Net.AddressInfo
      udp.once("error", (error) => tcp.close(() => reject(error))).bind(port, "127.0.0.1", () => resolve(port))
    })
  })

// A name server on one UDP and TCP port of 127.0.0.1 that truncates every UDP response.
const truncatingServer = Effect.acquireRelease(
  Effect.promise(async () => {
    const received: Array<"udp" | "tcp"> = []
    const udp = Dgram.createSocket("udp4", (query, from) => {
      received.push("udp")
      udp.send(reply(query, true), from.port, from.address)
    })
    const tcp = Net.createServer((socket) => {
      let buffer = Buffer.alloc(0)
      socket.on("data", (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk])
        if (buffer.length < 2 || buffer.length < 2 + buffer.readUInt16BE(0)) return
        received.push("tcp")
        const message = reply(buffer.subarray(2, 2 + buffer.readUInt16BE(0)), false)
        socket.end(Buffer.concat([Buffer.from([message.length >> 8, message.length & 0xff]), message]))
      })
    })
    for (let tries = 0;; tries++) {
      try {
        const port = await listen(udp, tcp, 0)
        return { port, received, udp, tcp }
      } catch (error) {
        if (tries === 10) throw error
      }
    }
  }),
  ({ tcp, udp }) => Effect.promise(() => new Promise<void>((resolve) => udp.close(() => tcp.close(() => resolve()))))
)

const unusedUdpPort = Effect.promise(() =>
  new Promise<number>((resolve) => {
    const socket = Dgram.createSocket("udp4")
    socket.bind(0, "127.0.0.1", () => {
      const { port } = socket.address()
      socket.close(() => resolve(port))
    })
  })
)

describe("NodeDnsClient", () => {
  it.live("retries truncated UDP responses over TCP to the same name server", () =>
    Effect.gen(function*() {
      const server = yield* truncatingServer
      const client = yield* DnsClient.make({ timeout: "2 seconds" }).pipe(
        Effect.provideServiceEffect(
          DnsClient.Transport,
          NodeDnsClient.makeTransportUdp({ nameServers: [`127.0.0.1:${server.port}`] })
        )
      )
      const response = yield* client.query("example.test", "A")
      assert.deepStrictEqual(
        response.answer.map((record) => record.data._tag === "A" ? NetAddress.formatIp(record.data.address) : ""),
        ["192.0.2.1"]
      )
      assert.deepStrictEqual(server.received, ["udp", "tcp"])
    }).pipe(Effect.scoped))

  it.live("reports name servers without a UDP listener as Refused", () =>
    Effect.gen(function*() {
      const port = yield* unusedUdpPort
      const client = yield* DnsClient.make({ timeout: "2 seconds", attempts: 1 }).pipe(
        Effect.provideServiceEffect(
          DnsClient.Transport,
          NodeDnsClient.makeTransportUdp({ nameServers: [`127.0.0.1:${port}`] })
        )
      )
      const error = yield* Effect.flip(client.query("example.test", "A"))
      assert.strictEqual(error.reason, "Refused")
    }))

  it.effect("rejects invalid name servers and search domains, and name servers with a scope ID", () =>
    Effect.gen(function*() {
      const effects: ReadonlyArray<Effect.Effect<unknown, NetAddress.NetAddressError>> = [
        NodeDnsClient.makeTransportUdp({ nameServers: [global, scoped] }),
        NodeDnsClient.makeTransportTcp({ nameServers: [scoped] }),
        NodeDnsClient.make({ nameServers: [scoped] }),
        NodeDnsClient.makeTransportUdp({ nameServers: ["fe80::1%1"] }),
        NodeDnsClient.makeTransportTcp({ nameServers: ["192.0.2.53", "ns.example"] }),
        NodeDnsClient.make({ nameServers: ["ns.example"] }),
        NodeDnsClient.make({ search: ["bad..name"] }),
        Effect.scoped(NodeDns.make({ nameServers: ["192.0.2.53", "ns.example"] })),
        Effect.scoped(NodeDns.make({ nameServers: ["fe80::1%1"] }))
      ]
      for (const effect of effects) {
        const error = yield* Effect.flip(effect)
        assert.strictEqual(error._tag, "NetAddressError")
      }
    }))

  it.effect("creates transports with one entry per name server", () =>
    Effect.gen(function*() {
      const transport = yield* NodeDnsClient.makeTransportUdp({ nameServers: [global, NetAddress.ipv4Loopback] })
      assert.strictEqual(transport.servers.length, 2)
      const fromStrings = yield* NodeDnsClient.makeTransportTcp({ nameServers: ["192.0.2.53", "[2001:db8::53]:5353"] })
      assert.strictEqual(fromStrings.servers.length, 2)
      yield* Effect.scoped(NodeDns.make({ nameServers: ["192.0.2.53", "[2001:db8::53]:5353"] }))
    }))

  it.effect("accepts parsed resolv.conf files and a hosts table", () =>
    Effect.gen(function*() {
      const client = yield* NodeDnsClient.make({
        ...DnsClient.parseResolvConf("nameserver 192.0.2.1\nsearch corp.example\noptions ndots:2 no-aaaa\n"),
        hosts: Host.parseHostsFile("192.0.2.9 db\n")
      })
      assert.deepStrictEqual<ReadonlyArray<string>>(client.search, ["corp.example"])
      assert.strictEqual(client.ndots, 2)
      assert.isTrue(client.noAaaa)
      assert.deepStrictEqual(client.hosts.get("db" as never)?.map(NetAddress.formatIp), ["192.0.2.9"])
      const normalized = yield* NodeDnsClient.make({ search: ["Corp.Example"] })
      assert.deepStrictEqual<ReadonlyArray<string>>(normalized.search, ["corp.example"])
    }))

  it.effect("clamps numeric options to their valid ranges", () =>
    Effect.gen(function*() {
      // Unclamped values would be rejected by the transports and the client.
      const clamped = yield* NodeDnsClient.make({ ndots: 20, attempts: 0, timeout: Duration.zero, udpPayloadSize: 100 })
      assert.strictEqual(clamped.ndots, 15)
      const rounded = yield* NodeDnsClient.make({ ndots: 1.5, attempts: Number.NaN, udpPayloadSize: 1e6 })
      assert.strictEqual(rounded.ndots, 1)
      yield* NodeDnsClient.make({ ndots: -1, useTcp: true })
    }))
})
