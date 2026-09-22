#!/usr/bin/env node
import * as NodeHttpClient from "@effect/platform-node/NodeHttpClient"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
// The published effect package exports this public barrel, not its source modules.
// oxlint-disable-next-line effect/no-import-from-barrel-package
import { Command } from "effect/unstable/cli"
import PackageJson from "../package.json" with { type: "json" }
import { cli } from "./Cli.ts"
import { Git } from "./Git.ts"
import { GitHub } from "./GitHub.ts"
import { Pnpm } from "./Pnpm.ts"
import { Publication } from "./Publication.ts"
import { Registry } from "./Registry.ts"
import { Release } from "./Release.ts"
import { StageApproval } from "./StageApproval.ts"
import { Workspace } from "./Workspace.ts"

const MainLayer = Layer.mergeAll(Release.layer, Publication.layer).pipe(
  Layer.provideMerge(
    Layer.mergeAll(Pnpm.layer, Git.layer, GitHub.layer, Workspace.layer, Registry.layer, StageApproval.layer)
  ),
  Layer.provideMerge(Layer.mergeAll(NodeServices.layer, NodeHttpClient.layerUndici))
)

Command.run(cli, { version: PackageJson.version }).pipe(
  Effect.provide(MainLayer),
  NodeRuntime.runMain
)
