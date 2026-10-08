import * as BunAddressResolver from "@effect/platform-bun/BunAddressResolver"
import * as BunDns from "@effect/platform-bun/BunDns"
import { describeDnsServer } from "../../node-shared/test/Dns.test-utils.ts"

// Bun returns each character string of a TXT record as a separate record, so
// the chunks of a record cannot be reassembled:
// https://github.com/oven-sh/bun/issues/44692
describeDnsServer("BunDns", (nameServer) => BunDns.make({ nameServers: [nameServer] }), BunAddressResolver.layer, {
  splitsTxtRecords: true
})
