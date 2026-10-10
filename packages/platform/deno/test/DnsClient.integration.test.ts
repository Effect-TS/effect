import * as DenoCrypto from "@effect/platform-deno/DenoCrypto"
import * as DenoDatagramSocket from "@effect/platform-deno/DenoDatagramSocket"
import * as DenoDnsClient from "@effect/platform-deno/DenoDnsClient"
import * as DenoSocket from "@effect/platform-deno/DenoSocket"
import * as Effect from "effect/Effect"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as Layer from "effect/Layer"
import * as Dns from "effect/net/Dns"
import * as DnsClient from "effect/net/DnsClient"
import * as NetAddress from "effect/net/NetAddress"
import { describeDnsClient, describeDnsServer } from "../../node-shared/test/Dns.test-utils.ts"

describeDnsClient(
  "DnsClient over UDP (Deno)",
  ({ nameServer, tcpNameServer, udpPayloadSize }) =>
    DnsClient.make({ timeout: "2 seconds" }).pipe(
      Effect.provideServiceEffect(
        DnsClient.Transport,
        DnsClient.makeTransportUdp({
          nameServers: [nameServer],
          udpPayloadSize,
          udp: (server) => DenoDatagramSocket.make({ peer: { address: server.address, port: server.port } }),
          tcp: () =>
            DenoSocket.makeTcp({ hostname: NetAddress.formatIp(tcpNameServer.address), port: tcpNameServer.port })
        }).pipe(Effect.provide(DenoCrypto.layer))
      )
    )
)

describeDnsClient(
  "DnsClient over TCP (Deno)",
  ({ tcpNameServer }) =>
    DnsClient.make({ timeout: "2 seconds" }).pipe(
      Effect.provideServiceEffect(
        DnsClient.Transport,
        Effect.orDie(DenoDnsClient.makeTransportTcp({ nameServers: [NetAddress.formatInet(tcpNameServer)] }))
      )
    ),
  { stream: true }
)

describeDnsClient(
  "DnsClient over HTTPS (Deno)",
  ({ dohUrl }) =>
    DnsClient.make({ timeout: "2 seconds" }).pipe(
      Effect.provideServiceEffect(DnsClient.Transport, DnsClient.makeTransportHttps({ urls: [dohUrl] })),
      Effect.provide(FetchHttpClient.layer)
    ),
  { stream: true }
)

describeDnsServer(
  "DnsClient.layerDns over UDP (Deno)",
  (nameServer) =>
    Effect.service(Dns.Dns).pipe(
      Effect.provide(
        DnsClient.layerDns.pipe(
          Layer.provide(
            Layer.effect(DnsClient.DnsClient, DenoDnsClient.make({ nameServers: [nameServer], timeout: "2 seconds" }))
          )
        )
      )
    )
)

describeDnsServer(
  "DnsClient.layerDns over HTTPS (Deno)",
  (_, { dohUrl }) =>
    Effect.service(Dns.Dns).pipe(
      Effect.provide(
        DnsClient.layerDns.pipe(
          Layer.provide(
            DnsClient.layer({
              timeout: "2 seconds",
              hosts: Effect.succeed(DnsClient.parseHosts("127.0.0.1 localhost"))
            })
          ),
          Layer.provide(DnsClient.layerTransportHttps({ urls: [dohUrl] })),
          Layer.provide(FetchHttpClient.layer)
        )
      )
    )
)
