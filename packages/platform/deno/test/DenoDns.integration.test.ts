import * as DenoAddressResolver from "@effect/platform-deno/DenoAddressResolver"
import * as DenoDns from "@effect/platform-deno/DenoDns"
import { describeDnsServer } from "../../node-shared/test/Dns.test-utils.ts"

describeDnsServer("DenoDns", (nameServer) => DenoDns.make({ nameServer }), DenoAddressResolver.layer)
