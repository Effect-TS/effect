import * as NodeAddressResolver from "@effect/platform-node/NodeAddressResolver"
import * as NodeDns from "@effect/platform-node/NodeDns"
import { describeDnsServer } from "../../node-shared/test/Dns.test-utils.ts"

describeDnsServer("NodeDns", (nameServer) => NodeDns.make({ nameServers: [nameServer] }), NodeAddressResolver.layer)
