import * as DenoDatagramSocket from "@effect/platform-deno/DenoDatagramSocket"
import { suite } from "../../../effect/test/unstable/socket/DatagramSocketTest.ts"

suite("DenoDatagramSocket", DenoDatagramSocket.layer)
