import * as NodeSocketConnector from "@effect/platform-node-shared/NodeSocketConnector"
import { socketConnectorTests } from "./utils/socketConnector.ts"

socketConnectorTests("NodeSocketConnector", NodeSocketConnector.make)
