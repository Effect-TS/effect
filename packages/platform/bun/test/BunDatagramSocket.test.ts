import * as BunDatagramSocket from "@effect/platform-bun/BunDatagramSocket"
import { suite } from "../../../effect/test/unstable/socket/DatagramSocketTest.ts"

suite("BunDatagramSocket", BunDatagramSocket.layer)
