import * as BunCrypto from "@effect/platform-bun/BunCrypto"
import * as BunDatagramSocket from "@effect/platform-bun/BunDatagramSocket"
import * as BunDnsClient from "@effect/platform-bun/BunDnsClient"
import * as BunSocket from "@effect/platform-bun/BunSocket"
import * as Effect from "effect/Effect"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as Layer from "effect/Layer"
import * as Dns from "effect/net/Dns"
import * as DnsClient from "effect/net/DnsClient"
import * as Host from "effect/net/Host"
import * as NetAddress from "effect/net/NetAddress"
import { describeDnsClient, describeDnsServer } from "../../node-shared/test/Dns.test-utils.ts"

describeDnsClient(
  "DnsClient over UDP (Bun)",
  ({ nameServer, tcpNameServer, udpPayloadSize }) =>
    DnsClient.make({ timeout: "2 seconds" }).pipe(
      Effect.provideServiceEffect(
        DnsClient.Transport,
        DnsClient.makeTransportUdp({
          nameServers: [nameServer],
          udpPayloadSize,
          udp: (server) => BunDatagramSocket.make({ connect: { address: server.address, port: server.port } }),
          tcp: () => BunSocket.makeNet({ host: NetAddress.formatIp(tcpNameServer.address), port: tcpNameServer.port })
        }).pipe(Effect.provide(BunCrypto.layer))
      )
    )
)

describeDnsClient(
  "DnsClient over TCP (Bun)",
  ({ tcpNameServer }) =>
    DnsClient.make({ timeout: "2 seconds" }).pipe(
      Effect.provideServiceEffect(
        DnsClient.Transport,
        Effect.orDie(BunDnsClient.makeTransportTcp({ nameServers: [NetAddress.formatInet(tcpNameServer)] }))
      )
    ),
  { stream: true }
)

describeDnsClient(
  "DnsClient over HTTPS (Bun)",
  ({ dohUrl }) =>
    DnsClient.make({ timeout: "2 seconds" }).pipe(
      Effect.provideServiceEffect(DnsClient.Transport, DnsClient.makeTransportHttps({ urls: [dohUrl] })),
      Effect.provide(FetchHttpClient.layer)
    ),
  { stream: true }
)

describeDnsServer(
  "DnsClient.layerDns over UDP (Bun)",
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

describeDnsServer(
  "DnsClient.layerDns over HTTPS (Bun)",
  (_, { dohUrl }) =>
    Effect.service(Dns.Dns).pipe(
      Effect.provide(
        DnsClient.layerDns.pipe(
          Layer.provide(
            DnsClient.layer({
              timeout: "2 seconds",
              hosts: Effect.succeed(Host.parseHostsFile("127.0.0.1 localhost"))
            })
          ),
          Layer.provide(DnsClient.layerTransportHttps({ urls: [dohUrl] })),
          Layer.provide(FetchHttpClient.layer)
        )
      )
    )
)
