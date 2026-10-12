// `etest mcp`: the test runner as an MCP server over stdio, so a coding agent can call tools
// instead of shelling out and parsing text. Each tool call runs an `etest` command line in this
// process (the same command `etest serve` runs) with its output captured, executors kept one
// run ahead as in `etest serve`, and calls handled one at a time.
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpServer from "effect/ai/McpServer"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import * as Command from "effect/cli/Command"
import * as Flag from "effect/cli/Flag"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Semaphore from "effect/Semaphore"
import type * as Worker from "effect/workers/Worker"
import { Output } from "./Output.ts"
import { runCommandLine, warmExecutors } from "./Server.ts"

const Selection = {
  paths: Schema.optional(Schema.Array(Schema.String)).annotate({
    description: "Files or directories to search for *.test.ts files (default: the working directory)"
  }),
  test: Schema.optional(Schema.String).annotate({
    description: "A test's full id or 8-character short id, or text its id must contain"
  }),
  tag: Schema.optional(Schema.String).annotate({ description: "Only tests with this tag" })
}

const Outcome = Schema.Struct({
  exitCode: Schema.Number,
  passed: Schema.Boolean,
  output: Schema.String
})

const RunTests = Tool.make("run_tests", {
  description:
    "Run tests and return the outcome. `output` is the compact, failures-first report: one block per failing test with " +
    "its short id, failures (message and file:line:col), captured console output and an exact rerun command. Use " +
    "`failed` to re-run the previous failures, `changed` (and `since`) to run only tests affected by uncommitted changes.",
  parameters: Schema.Struct({
    ...Selection,
    failed: Schema.optional(Schema.Boolean).annotate({ description: "Only the tests that failed in previous runs" }),
    changed: Schema.optional(Schema.Boolean).annotate({
      description: "Only tests affected by uncommitted changes (files they import, followed statically)"
    }),
    since: Schema.optional(Schema.String).annotate({
      description: "With `changed` (implied): also include what changed on this branch since it left this git ref"
    }),
    seed: Schema.optional(Schema.Number).annotate({ description: "Seed, to reproduce a run (it is in every report)" }),
    bail: Schema.optional(Schema.Boolean).annotate({ description: "Stop at the first failure" })
  }),
  success: Outcome
})

const ListTests = Tool.make("list_tests", {
  description:
    "List the test tree without running anything: suites, tests with their short ids, tags, options and fixtures.",
  parameters: Schema.Struct(Selection),
  success: Outcome
})

const Tools = Toolkit.make(RunTests, ListTests)

const selectionArgs = (params: {
  readonly paths?: ReadonlyArray<string> | undefined
  readonly test?: string | undefined
  readonly tag?: string | undefined
}) => [
  ...(params.paths ?? []),
  ...(params.test !== undefined ? ["--test", params.test] : []),
  ...(params.tag !== undefined ? ["--tag", params.tag] : [])
]

const serveMcp = (version: string, options: { readonly workers: number }) =>
  Effect.gen(function*() {
    const run = runCommandLine(version, yield* warmExecutors(options.workers))
    // tool handlers can't require anything: they run with the services this command started with
    const services = yield* Effect.context<Command.Environment | Worker.WorkerPlatform | Worker.Spawner>()
    const oneAtATime = Semaphore.makeUnsafe(1)
    /** Runs a command line, capturing everything it writes (stdout and stderr, in order). */
    const capture = (argv: ReadonlyArray<string>) =>
      oneAtATime.withPermits(1)(Effect.suspend(() => {
        let text = ""
        const output = Output.of({ out: (chunk) => text += chunk, err: (chunk) => text += chunk })
        return Effect.map(run(argv, output), (exitCode) => ({ exitCode, passed: exitCode === 0, output: text }))
      })).pipe(Effect.provideContext(services))
    const handlers = Tools.of({
      run_tests: (params) =>
        capture([
          ...selectionArgs(params),
          ...(params.failed ? ["--failed"] : []),
          ...(params.changed ? ["--changed"] : []),
          ...(params.since !== undefined ? ["--since", params.since] : []),
          ...(params.seed !== undefined ? ["--seed", String(params.seed)] : []),
          ...(params.bail ? ["--bail"] : [])
        ]),
      list_tests: (params) => capture([...selectionArgs(params), "--list"])
    })
    return yield* Layer.launch(
      McpServer.toolkit(Tools).pipe(
        Layer.provideMerge(Tools.toLayer(handlers)),
        Layer.provide(McpServer.layerStdio({
          name: "etest",
          version,
          instructions: "Runs and lists Effect-native tests (etest) in the working directory.",
          protocols: [McpProtocol.v2025_11_25, McpProtocol.v2025_06_18, McpProtocol.v2025_03_26]
        }))
      )
    )
  })

/** `etest mcp [--workers N]`: serve the tools over stdio until the client disconnects. */
export const mcpCommand = (version: string) =>
  Command.make("mcp", {
    workers: Flag.Int("workers").pipe(
      Flag.withDescription("Executors per run (worker threads)"),
      Flag.withDefault(2)
    )
  }).pipe(
    Command.withDescription("Serve the test runner as an MCP server over stdio (tools: run_tests, list_tests)"),
    Command.withHandler((options) => Effect.scoped(serveMcp(version, options)))
  )
