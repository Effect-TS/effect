#!/usr/bin/env node
// Runs on Node, Bun or Deno: the platform is picked from the runtime we are on.
import * as Command from "effect/cli/Command"
import PackageJson from "../../package.json" with { type: "json" }
import * as Platform from "../Platform.ts"
import { cli } from "./Cli.ts"
import { platforms } from "./platforms.ts"

Platform.runMain(platforms, Command.run(cli, { version: PackageJson.version }))
