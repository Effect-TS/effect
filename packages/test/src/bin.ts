#!/usr/bin/env node
// One-shot CLI. Never interactive; exit code 0 = all green, 1 = anything red.
//   node src/bin.ts [paths...] [--list] [--test <id|substring>] [--tag <t>] [--seed <n>]
//                   [--workers <n>] [--bail] [--reporter agent|human|jsonl] [--config <file> | --no-config]
// The config defaults to ./effect-test.config.ts when it exists.
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import { Effect, Exit } from "effect"
import * as Runtime from "effect/Runtime"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { parseArgs } from "node:util"
import { executorPool, run } from "./Coordinator.ts"
import * as Reporters from "./Reporters.ts"
import { isConfig } from "./Test.ts"

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    list: { type: "boolean", default: false },
    test: { type: "string" },
    tag: { type: "string" },
    seed: { type: "string" },
    workers: { type: "string", default: "2" },
    bail: { type: "boolean", default: false },
    reporter: { type: "string", default: "agent" },
    config: { type: "string" },
    "no-config": { type: "boolean", default: false }
  }
})

// Executors (worker threads) inherit the environment, so this is how they find the config.
const configFile = values["no-config"]
  ? undefined
  : values.config ?? (fs.existsSync("effect-test.config.ts") ? "effect-test.config.ts" : undefined)
if (configFile !== undefined) {
  // Validate here too: a broken config must fail the run, not leave executors with nothing to run.
  const mod = await import(pathToFileURL(path.resolve(configFile)).href)
  if (!isConfig(mod.default)) {
    process.stderr.write(`effect-test: ${configFile}: the default export is not a Test.config(...)\n`)
    process.exit(1)
  }
  process.env.EFFECT_TEST_CONFIG = path.resolve(configFile)
}

const write = (s: string) => {
  process.stdout.write(s)
}
const bin = path.relative(process.cwd(), fileURLToPath(import.meta.url))
const ctx: Reporters.ReporterContext = {
  write,
  rerun: (t, runSeed) => `node ${bin} ${t.file} --test "${t.id}" --seed ${runSeed}`
}
const reporter = values.reporter === "human"
  ? Reporters.human(ctx)
  : values.reporter === "jsonl"
  ? Reporters.jsonl(ctx)
  : Reporters.agent(ctx)

const seed = values.seed !== undefined ? Number(values.seed) : Math.floor(Math.random() * 100_000)
const workers = Number(values.workers)

const program = run({
  paths: positionals,
  list: values.list,
  listJson: values.reporter === "jsonl",
  test: values.test,
  tag: values.tag,
  seed,
  workers,
  filesPerExecutor: 4,
  testsPerFile: 8,
  bail: values.bail,
  reporter,
  write
}).pipe(Effect.scoped, Effect.provide(executorPool(workers, 4)))

NodeRuntime.runMain(program, {
  disableErrorReporting: false,
  teardown: (exit, onExit) => Exit.isSuccess(exit) ? onExit(exit.value as number) : Runtime.defaultTeardown(exit, onExit)
})
