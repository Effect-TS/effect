import * as DenoDns from "@effect/platform-deno/DenoDns"
import { describeDnsServer } from "../../node-shared/test/Dns.test-utils.ts"

describeDnsServer("DenoDns", {
  make: (nameServer) => DenoDns.make({ nameServer }),
  // Deno.resolveDns reports missing record types and refused queries as missing
  // names.
  noDataReason: "NotFound",
  refusedReason: "NotFound"
})
