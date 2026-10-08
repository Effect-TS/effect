import * as DenoAddressResolver from "@effect/platform-deno/DenoAddressResolver"
import * as DenoDns from "@effect/platform-deno/DenoDns"
import { describeDnsServer } from "../../node-shared/test/Dns.test-utils.ts"

// `Deno.resolveDns` reports every error response, including refused queries,
// with the same `NotFound` error as a missing name.
describeDnsServer("DenoDns", (nameServer) => DenoDns.make({ nameServer }), DenoAddressResolver.layer, {
  refusedAsNotFound: true
})
