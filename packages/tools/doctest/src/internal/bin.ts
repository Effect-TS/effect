#!/usr/bin/env node
/**
 * @since 4.0.0
 */
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as CliError from "effect/unstable/cli/CliError"
import * as Command from "effect/unstable/cli/Command"
import PackageJson from "../../package.json" with { type: "json" }
import { cli } from "../Cli.ts"

Command.run(cli, { version: PackageJson.version }).pipe(
  Effect.tapError((error) =>
    Console.error(
      error instanceof CliError.UserError && error.cause instanceof Error ? error.cause.message : String(error)
    )
  ),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain({ disableErrorReporting: true })
)
