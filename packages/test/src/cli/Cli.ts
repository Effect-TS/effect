// The `etest` command, built with effect/cli: its flags become a `Run.Request`, which Run.ts
// resolves and hands to the coordinator. One-shot and never interactive: it exits 0 when
// everything is green, 1 when anything is red, 130 on Ctrl-C.
import * as Argument from "effect/cli/Argument"
import * as Command from "effect/cli/Command"
import * as Flag from "effect/cli/Flag"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Results from "./Results.ts"
import * as Run from "./Run.ts"
import * as Workspace from "./Workspace.ts"

const paths = Argument.String("paths").pipe(
  Argument.withDescription(
    "Files or directories to search for *.test.ts files (default: the config's `paths` at a project's root, else the working directory)"
  ),
  Argument.variadic()
)

const list = Flag.Boolean("list").pipe(
  Flag.withDescription("Print the test tree without running anything"),
  Flag.withDefault(false)
)

const test = Flag.String("test").pipe(
  Flag.withDescription("Run only tests whose id contains this text"),
  Flag.optional
)

const failed = Flag.Boolean("failed").pipe(
  Flag.withDescription(`Re-run only the tests that failed in previous runs (recorded in ${Results.location})`),
  Flag.withDefault(false)
)

const changed = Flag.Boolean("changed").pipe(
  Flag.withDescription("Run only the tests affected by uncommitted changes (files they import, followed statically)"),
  Flag.withDefault(false)
)

const since = Flag.String("since").pipe(
  Flag.withMetavar("REF"),
  Flag.withDescription("With --changed (implied): also include what changed on this branch since it left REF"),
  Flag.optional
)

const tag = Flag.String("tag").pipe(
  Flag.withDescription("Run only tests with this tag"),
  Flag.optional
)

const seed = Flag.Int("seed").pipe(
  Flag.withDescription("Seed for this run (default: random, printed in the summary)"),
  Flag.optional
)

const workers = Flag.Int("workers").pipe(
  Flag.withDescription("Number of executors (worker threads; default: the workspace config's `workers`, else 2)"),
  Flag.optional
)

const bail = Flag.Boolean("bail").pipe(
  Flag.withDescription("Stop at the first failure and interrupt running tests"),
  Flag.withDefault(false)
)

const reporter = Flag.Literals("reporter", ["agent", "human", "jsonl"]).pipe(
  Flag.withDescription("Output format: compact failures-first text, a coloured tree, or one JSON event per line"),
  Flag.withDefault("agent")
)

const config = Flag.String("config").pipe(
  Flag.withMetavar("FILE"),
  Flag.withDescription(
    "Workspace config file (default: the outermost etest.config.ts, up to the repository root); nested projects keep theirs"
  ),
  Flag.optional
)

const noConfig = Flag.Boolean("no-config").pipe(
  Flag.withDescription("Ignore every test config (nested ones too), so every file builds its own layers"),
  Flag.withDefault(false)
)

const noServer = Flag.Boolean("no-server").pipe(
  Flag.withDescription("Run in this process even when `etest serve` is running for this workspace"),
  Flag.withDefault(false)
)

/** The `etest` command itself: run the tests. `etest serve` runs this on forwarded arguments. */
export const command = Command.make("etest", {
  paths,
  list,
  test,
  failed,
  changed,
  since,
  tag,
  seed,
  workers,
  bail,
  reporter,
  config,
  noConfig,
  noServer
}).pipe(
  Command.withDescription("Run Effect-native tests"),
  Command.withHandler(({ noServer: _, ...options }) =>
    Run.execute({
      ...options,
      test: Option.getOrUndefined(options.test),
      since: Option.getOrUndefined(options.since),
      tag: Option.getOrUndefined(options.tag),
      seed: Option.getOrUndefined(options.seed),
      workers: Option.getOrUndefined(options.workers),
      config: Option.getOrUndefined(options.config)
    })
  )
)

/** `etest config`: print the resolved config of the project here, with where each value comes from. */
export const configCommand = Command.make("config", {}).pipe(
  Command.withDescription(
    "Show the test config this directory resolves to (workspace and project), and where each value comes from"
  ),
  Command.withHandler(() =>
    Effect.gen(function*() {
      const cwd = process.cwd()
      const ws = yield* Workspace.workspace(cwd)
      yield* Console.log(Workspace.describe(ws, yield* ws.of(cwd)).join("\n"))
    }).pipe(
      Effect.catchTag(
        "ConfigError",
        (error) =>
          Console.error(`etest: ${error.message}`).pipe(Effect.andThen(Effect.fail(new Run.ExitCode({ code: 1 }))))
      )
    )
  )
)
