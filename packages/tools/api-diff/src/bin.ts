#!/usr/bin/env node
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Effect from "effect/Effect"
import * as Command from "effect/unstable/cli/Command"
import PackageJson from "../package.json" with { type: "json" }
import { cli } from "./Cli.ts"

Command.run(cli, { version: PackageJson.version }).pipe(
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain
)
