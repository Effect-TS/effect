#!/usr/bin/env node

/**
 * Node.js entrypoint used during development builds before packing. It proxies
 * to the shared CLI wiring so tests, the published loader, and this script all
 * exercise the same code path.
 *
 * @since 0.0.1
 * @internal
 */
import { NodeRuntime } from "@effect/platform-node"
import * as Effect from "effect/Effect"
import { run } from "./cli.js"

run(process.argv).pipe(
  Effect.tapErrorCause(Effect.logError),
  NodeRuntime.runMain
)
