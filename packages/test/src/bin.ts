#!/usr/bin/env node
// Runs on Node, Bun or Deno: the platform is picked from the runtime we are on.
import * as Command from "effect/cli/Command"
import * as Effect from "effect/Effect"
import PackageJson from "../package.json" with { type: "json" }
import { cli } from "./Cli.ts"
import * as Platform from "./Platform.ts"

Platform.runMain((platform) => Command.run(cli, { version: PackageJson.version }).pipe(Effect.provide(platform.layer)))
