import { NodeRuntime } from "@effect/platform-node"
import * as Effect from "effect/Effect"
NodeRuntime.runMain(Effect.log("smoke ok"))
