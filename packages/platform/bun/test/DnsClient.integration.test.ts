import * as BunDatagramSocket from "@effect/platform-bun/BunDatagramSocket"
import * as BunDnsClient from "@effect/platform-bun/BunDnsClient"
import * as BunSocket from "@effect/platform-bun/BunSocket"
import * as Effect from "effect/Effect"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as Layer from "effect/Layer"
import * as Dns from "effect/net/Dns"
import * as DnsClient from "effect/net/DnsClient"
import * as NetAddress from "effect/net/NetAddress"
import { describeDnsClient, describeDnsServer } from "../../node-shared/test/Dns.test-utils.ts"

describeDnsClient("DnsClient (Bun)", ({ nameServer, tcpNameServer, udpPayloadSize }) =>
  DnsClient.make({
    nameServers: [nameServer],
    udp: (server) => BunDatagramSocket.make({ connect: { address: server.address, port: server.port } }),
    tcp: () => BunSocket.makeNet({ host: NetAddress.formatIp(tcpNameServer.address), port: tcpNameServer.port }),
    timeout: "2 seconds",
    udpPayloadSize
  }))

describeDnsServer(
  "DnsClient.layerDns (Bun)",
  (nameServer) =>
    Effect.service(Dns.Dns).pipe(
      Effect.provide(
        DnsClient.layerDns.pipe(
          Layer.provide(
            Layer.effect(DnsClient.DnsClient, BunDnsClient.make({ nameServers: [nameServer], timeout: "2 seconds" }))
          )
        )
      )
    )
)

describeDnsClient(
  "DnsClient.makeHttps (Bun)",
  ({ dohUrl }) =>
    DnsClient.makeHttps({ urls: [dohUrl], timeout: "2 seconds" }).pipe(Effect.provide(FetchHttpClient.layer)),
  { https: true }
)

describeDnsServer(
  "DnsClient.layerHttps (Bun)",
  (_, { dohUrl }) =>
    Effect.service(Dns.Dns).pipe(
      Effect.provide(
        DnsClient.layerDns.pipe(
          Layer.provide(
            DnsClient.layerHttps({
              urls: [dohUrl],
              timeout: "2 seconds",
              hosts: Effect.succeed(DnsClient.parseHosts("127.0.0.1 localhost"))
            })
          ),
          Layer.provide(FetchHttpClient.layer)
        )
      )
    )
)
