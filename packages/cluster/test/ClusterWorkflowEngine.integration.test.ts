import { describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { runMultiRunner } from "./fixtures/multi-runner.js"

describe.runIf(process.env.EFFECT_CLUSTER_INTEGRATION === "1")("TCP/PostgreSQL multi-runner integration", () => {
  it.effect("preserves durable work through ownership changes", () => Effect.promise(runMultiRunner), 1_800_000)
})
