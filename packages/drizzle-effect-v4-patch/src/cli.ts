#!/usr/bin/env node
/**
 * Command-line entrypoint for applying and removing the verified Drizzle Effect compatibility patch in Bun projects.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Cause from "effect/Cause"
import * as Command from "effect/cli/Command"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"

import PackageJson from "../package.json" with { type: "json" }
import { command } from "./internal/command.ts"

Command.run(command(new URL("../patches/", import.meta.url)), { version: PackageJson.version }).pipe(
  Effect.tapCause((cause) =>
    Effect.gen(function*() {
      for (const reason of cause.reasons) {
        if (Cause.isFailReason(reason) && reason.error._tag === "PatchError") {
          yield* Console.error(reason.error.message)
        }
      }
      if (Cause.hasDies(cause)) {
        yield* Console.error("Unexpected failure while configuring the Drizzle patch.")
      }
    }).pipe(Effect.catchCause(() => Effect.void))
  ),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain({ disableErrorReporting: true })
)
