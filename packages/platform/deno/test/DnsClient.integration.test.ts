import * as DenoDatagramSocket from "@effect/platform-deno/DenoDatagramSocket"
import * as DenoDnsClient from "@effect/platform-deno/DenoDnsClient"
import * as DenoSocket from "@effect/platform-deno/DenoSocket"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Dns from "effect/net/Dns"
import * as DnsClient from "effect/net/DnsClient"
import * as NetAddress from "effect/net/NetAddress"
import { describeDnsClient, describeDnsServer } from "../../node-shared/test/Dns.test-utils.ts"

describeDnsClient("DnsClient (Deno)", ({ nameServer, tcpNameServer, udpPayloadSize }) =>
  DnsClient.make({
    nameServers: [nameServer],
    udp: (server) => DenoDatagramSocket.make({ peer: { address: server.address, port: server.port } }),
    tcp: () => DenoSocket.makeTcp({ hostname: NetAddress.formatIp(tcpNameServer.address), port: tcpNameServer.port }),
    timeout: "2 seconds",
    udpPayloadSize
  }))

describeDnsServer(
  "DnsClient.layerDns (Deno)",
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
