import * as NodeDns from "@effect/platform-node-shared/NodeDns"
import { describeDnsServer } from "./Dns.test-utils.ts"

describeDnsServer("NodeDns", {
  make: (nameServer) => NodeDns.make({ nameServers: [nameServer] }),
  noDataReason: "NoData",
  refusedReason: "Refused"
})
