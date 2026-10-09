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

describeDnsClient("DnsClient (Node.js)", ({ nameServer, tcpNameServer, udpPayloadSize }) =>
  DnsClient.make({
    nameServers: [nameServer],
    udp: (server) => NodeDatagramSocket.make({ connect: { address: server.address, port: server.port } }),
    tcp: () => NodeSocket.makeNet({ host: NetAddress.formatIp(tcpNameServer.address), port: tcpNameServer.port }),
    timeout: "2 seconds",
    udpPayloadSize
  }))

describeDnsServer(
  "DnsClient.layerDns (Node.js)",
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

describeDnsClient(
  "DnsClient.makeHttps (Node.js)",
  ({ dohUrl }) =>
    DnsClient.makeHttps({ urls: [dohUrl], timeout: "2 seconds" }).pipe(Effect.provide(FetchHttpClient.layer)),
  { https: true }
)

describeDnsServer(
  "DnsClient.layerHttps (Node.js)",
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
