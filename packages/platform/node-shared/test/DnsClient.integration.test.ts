import * as NodeDnsClient from "@effect/platform-node-shared/NodeDnsClient"
import * as Effect from "effect/Effect"
import * as Dns from "effect/net/Dns"
import { describeDnsClient, describeDnsServer } from "./Dns.test-utils.ts"

describeDnsClient("DnsClient (Node.js)")

describeDnsServer("DnsClient.layerDns (Node.js)", (nameServer) =>
  Effect.service(Dns.Dns).pipe(
    Effect.provide(NodeDnsClient.layerDns({ nameServers: [nameServer], timeout: "2 seconds" }))
  ))
