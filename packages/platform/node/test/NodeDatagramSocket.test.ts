import * as NodeDatagramSocket from "@effect/platform-node/NodeDatagramSocket"
import { suite } from "../../../effect/test/unstable/socket/DatagramSocketTest.ts"

suite("NodeDatagramSocket", NodeDatagramSocket.layer)
