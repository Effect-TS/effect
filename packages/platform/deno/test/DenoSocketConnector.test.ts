import * as DenoSocketConnector from "@effect/platform-deno/DenoSocketConnector"
import { socketConnectorTests } from "../../node-shared/test/utils/socketConnector.ts"

socketConnectorTests("DenoSocketConnector", DenoSocketConnector.make)
