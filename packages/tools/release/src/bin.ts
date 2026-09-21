#!/usr/bin/env node
import * as NodeHttpClient from "@effect/platform-node/NodeHttpClient"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Command from "effect/unstable/cli/Command"
import PackageJson from "../package.json" with { type: "json" }
import { cli } from "./Cli.ts"
import { Git } from "./Git.ts"
import { GitHub } from "./GitHub.ts"
import { Pnpm } from "./Pnpm.ts"
import { Registry } from "./Registry.ts"
import { Release } from "./Release.ts"
import { Workspace } from "./Workspace.ts"

const MainLayer = Release.layer.pipe(
  Layer.provideMerge(
    Layer.mergeAll(Pnpm.layer, Git.layer, GitHub.layer, Workspace.layer, Registry.layer)
  ),
  Layer.provideMerge(Layer.mergeAll(NodeServices.layer, NodeHttpClient.layerUndici))
)

Command.run(cli, { version: PackageJson.version }).pipe(
  Effect.provide(MainLayer),
  NodeRuntime.runMain
)
