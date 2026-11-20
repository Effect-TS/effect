import * as DenoDnsClient from "@effect/platform-deno/DenoDnsClient"
import * as Effect from "effect/Effect"
import * as Dns from "effect/net/Dns"
import { describeDnsClient, describeDnsServer } from "../../node-shared/test/Dns.test-utils.ts"

describeDnsClient("DnsClient (Deno)")

describeDnsServer("DnsClient.layerDns (Deno)", (nameServer) =>
  Effect.service(Dns.Dns).pipe(
    Effect.provide(DenoDnsClient.layerDns({ nameServers: [nameServer], timeout: "2 seconds" }))
  ))
