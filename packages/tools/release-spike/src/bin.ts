#!/usr/bin/env node
import * as NodeHttpClient from "@effect/platform-node/NodeHttpClient"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Command from "effect/unstable/cli/Command"
import PackageJson from "../package.json" with { type: "json" }
import { cli } from "./Cli.ts"
import { Findings } from "./Findings.ts"

const FindingsLayer = Layer.unwrap(
  Config.String("RELEASE_SPIKE_FINDINGS").pipe(
    Config.withDefault("tmp/release-spike/findings.jsonl"),
    Effect.map(Findings.layer)
  )
)

const MainLayer = Layer.mergeAll(
  FindingsLayer,
  NodeHttpClient.layerUndici
).pipe(
  Layer.provideMerge(NodeServices.layer)
)

Command.run(cli, { version: PackageJson.version }).pipe(
  Effect.provide(MainLayer),
  NodeRuntime.runMain
)
