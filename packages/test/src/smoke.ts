import { Effect } from "effect"
import { NodeRuntime } from "@effect/platform-node"
NodeRuntime.runMain(Effect.log("smoke ok"))
