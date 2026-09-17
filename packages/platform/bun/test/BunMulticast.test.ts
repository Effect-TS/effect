import * as BunMulticast from "@effect/platform-bun/BunMulticast"
import { suite } from "../../../effect/test/unstable/socket/MulticastTest.ts"
import { suite as suiteV6 } from "../../../effect/test/unstable/socket/MulticastV6Test.ts"

suite("BunMulticast", BunMulticast.layer)
suiteV6("BunMulticast", BunMulticast.layer)
