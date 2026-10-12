#!/usr/bin/env node
// Runs on Node, Bun or Deno: the platform is picked from the runtime we are on.
import * as Command from "effect/cli/Command"
import type { Crypto } from "effect/Crypto"
import type { FileSystem } from "effect/FileSystem"
import type { Path } from "effect/Path"
import type { ChildProcessSpawner } from "effect/process/ChildProcessSpawner"
import type { Stdio } from "effect/Stdio"
import type { Terminal } from "effect/Terminal"
import type * as Worker from "effect/workers/Worker"
import PackageJson from "../../package.json" with { type: "json" }
import * as Platform from "../Platform.ts"
import { cli } from "./Cli.ts"

/**
 * What the CLI needs from a platform (`./platform/*.ts`): the runtime's standard services
 * (the same set as `NodeServices`, `BunServices` and `DenoServices`) and the spawner the
 * coordinator uses to start executors.
 */
export type Services =
  | ChildProcessSpawner
  | Crypto
  | FileSystem
  | Path
  | Stdio
  | Terminal
  | Worker.WorkerPlatform
  | Worker.Spawner

const platforms: Platform.Imports<Services> = {
  node: () => import("./platform/node.ts"),
  bun: () => import("./platform/bun.ts"),
  deno: () => import("./platform/deno.ts")
}

Platform.runMain(platforms, Command.run(cli, { version: PackageJson.version }))
