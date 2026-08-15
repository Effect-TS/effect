import * as McpProtocol from "effect/unstable/ai/McpProtocol"
import { layer as makeMcpConformanceLayer } from "./McpConformance/McpConformance.ts"
import * as SubscriptionsTest from "./McpConformance/SubscriptionsTest.ts"

const protocol = McpProtocol.v2026_07_28

SubscriptionsTest.suite(protocol, makeMcpConformanceLayer(protocol))
