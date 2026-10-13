import * as BunDnsClient from "@effect/platform-bun/BunDnsClient"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as DnsClient from "effect/net/DnsClient"
import * as Dgram from "node:dgram"

const unusedUdpPort = Effect.promise(() =>
  new Promise<number>((resolve) => {
    const socket = Dgram.createSocket("udp4")
    socket.bind(0, "127.0.0.1", () => {
      const { port } = socket.address()
      socket.close(() => resolve(port))
    })
  })
)

describe("BunDnsClient", () => {
  it.live("reports name servers without a UDP listener as Refused", () =>
    Effect.gen(function*() {
      const port = yield* unusedUdpPort
      const client = yield* DnsClient.make({ timeout: "1 second", attempts: 1 }).pipe(
        Effect.provideServiceEffect(
          DnsClient.Transport,
          BunDnsClient.makeTransportUdp({ nameServers: [`127.0.0.1:${port}`] })
        )
      )
      const error = yield* Effect.flip(client.query("example.test", "A"))
      assert.strictEqual(error.reason, "Refused")
    }))
})
