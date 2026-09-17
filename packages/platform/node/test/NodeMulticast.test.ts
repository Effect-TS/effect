import * as NodeMulticast from "@effect/platform-node/NodeMulticast"
import { suite } from "../../../effect/test/unstable/socket/MulticastTest.ts"
import { suite as suiteV6 } from "../../../effect/test/unstable/socket/MulticastV6Test.ts"

suite("NodeMulticast", NodeMulticast.layer)
suiteV6("NodeMulticast", NodeMulticast.layer)
