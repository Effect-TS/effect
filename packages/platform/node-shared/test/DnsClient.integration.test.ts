import * as NodeCrypto from "@effect/platform-node-shared/NodeCrypto"
import * as NodeDatagramSocket from "@effect/platform-node-shared/NodeDatagramSocket"
import * as NodeDnsClient from "@effect/platform-node-shared/NodeDnsClient"
import * as NodeSocket from "@effect/platform-node-shared/NodeSocket"
import * as Effect from "effect/Effect"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as Layer from "effect/Layer"
import * as Dns from "effect/net/Dns"
import * as DnsClient from "effect/net/DnsClient"
import * as NetAddress from "effect/net/NetAddress"
import { describeDnsClient, describeDnsServer } from "./Dns.test-utils.ts"

describeDnsClient(
  "DnsClient over UDP (Node.js)",
  ({ nameServer, tcpNameServer, udpPayloadSize }) =>
    DnsClient.make({ timeout: "2 seconds" }).pipe(
      Effect.provideServiceEffect(
        DnsClient.Transport,
        DnsClient.makeTransportUdp({
          nameServers: [nameServer],
          udpPayloadSize,
          udp: (server) => NodeDatagramSocket.make({ connect: { address: server.address, port: server.port } }),
          // The container maps its TCP listener to a different port.
          tcp: () => NodeSocket.makeNet({ host: NetAddress.formatIp(tcpNameServer.address), port: tcpNameServer.port })
        }).pipe(Effect.provide(NodeCrypto.layer))
      )
    )
)

describeDnsClient(
  "DnsClient over TCP (Node.js)",
  ({ tcpNameServer }) =>
    DnsClient.make({ timeout: "2 seconds" }).pipe(
      Effect.provideServiceEffect(
        DnsClient.Transport,
        Effect.orDie(NodeDnsClient.makeTransportTcp({ nameServers: [NetAddress.formatInet(tcpNameServer)] }))
      )
    ),
  { stream: true }
)

describeDnsClient(
  "DnsClient over HTTPS (Node.js)",
  ({ dohUrl }) =>
    DnsClient.make({ timeout: "2 seconds" }).pipe(
      Effect.provideServiceEffect(DnsClient.Transport, DnsClient.makeTransportHttps({ urls: [dohUrl] })),
      Effect.provide(FetchHttpClient.layer)
    ),
  { stream: true }
)

describeDnsServer(
  "DnsClient.layerDns over UDP (Node.js)",
  (nameServer) =>
    Effect.service(Dns.Dns).pipe(
      Effect.provide(
        DnsClient.layerDns.pipe(
          Layer.provide(
            Layer.effect(DnsClient.DnsClient, NodeDnsClient.make({ nameServers: [nameServer], timeout: "2 seconds" }))
          )
        )
      )
    )
)

describeDnsServer(
  "DnsClient.layerDns over HTTPS (Node.js)",
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
