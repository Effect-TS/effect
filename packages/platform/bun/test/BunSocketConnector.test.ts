import * as BunSocketConnector from "@effect/platform-bun/BunSocketConnector"
import { socketConnectorTests } from "../../node-shared/test/utils/socketConnector.ts"

socketConnectorTests("BunSocketConnector", BunSocketConnector.make)
