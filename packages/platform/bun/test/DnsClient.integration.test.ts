import * as BunDnsClient from "@effect/platform-bun/BunDnsClient"
import * as Effect from "effect/Effect"
import * as Dns from "effect/net/Dns"
import { describeDnsClient, describeDnsServer } from "../../node-shared/test/Dns.test-utils.ts"

describeDnsClient("DnsClient (Bun)")

describeDnsServer("DnsClient.layerDns (Bun)", (nameServer) =>
  Effect.service(Dns.Dns).pipe(
    Effect.provide(BunDnsClient.layerDns({ nameServers: [nameServer], timeout: "2 seconds" }))
  ))
