import * as BunDnsClient from "@effect/platform-bun/BunDnsClient"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Dns from "effect/net/Dns"
import * as DnsClient from "effect/net/DnsClient"
import { describeDnsClient, describeDnsServer } from "../../node-shared/test/Dns.test-utils.ts"

describeDnsClient("DnsClient (Bun)")

describeDnsServer("DnsClient.layerDns (Bun)", (nameServer) =>
  Effect.service(Dns.Dns).pipe(
    Effect.provide(
      DnsClient.layerDns.pipe(
        Layer.provide(BunDnsClient.layer({ nameServers: [nameServer], timeout: "2 seconds" }))
      )
    )
  ))
