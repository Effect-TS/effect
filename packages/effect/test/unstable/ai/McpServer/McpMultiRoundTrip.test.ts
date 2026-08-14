import * as McpProtocol from "effect/unstable/ai/McpProtocol"
import { layer as makeMcpConformanceLayer } from "./McpConformance/McpConformance.ts"
import * as MultiRoundTripTest from "./McpConformance/MultiRoundTripTest.ts"

const protocol = McpProtocol.v2026_07_28

MultiRoundTripTest.suite(protocol, makeMcpConformanceLayer(protocol))
