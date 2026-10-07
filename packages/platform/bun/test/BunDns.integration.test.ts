import * as BunDns from "@effect/platform-bun/BunDns"
import { describeDnsServer } from "../../node-shared/test/Dns.test-utils.ts"

describeDnsServer("BunDns", {
  make: (nameServer) => BunDns.make({ nameServers: [nameServer] }),
  // Bun reports missing record types as missing names and returns each chunk
  // of a multi-chunk TXT record as a separate record.
  noDataReason: "NotFound",
  refusedReason: "Refused",
  splitsTxtChunks: true
})
