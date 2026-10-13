// `etest serve`: a long-running test runner for one working directory, so repeated runs
// (the edit-run loop of a coding agent) skip startup. While it runs, `etest` in the same
// directory forwards its command line here (see bin.ts) and streams back the output and
// exit code; `--no-server` runs locally instead.
//
// Correctness first: executors cache every module they load, so a set of executors is
// used for one run only, and user code is always loaded fresh. What stays warm is this
// process (the CLI and coordinator), and the next run's executors, started in the
// background while the current run is going (Effect and the executor runtime loaded, no
// user code).
import * as Cause from "effect/Cause"
import * as CliError from "effect/cli/CliError"
import * as Command from "effect/cli/Command"
import * as Flag from "effect/cli/Flag"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import type * as Worker from "effect/workers/Worker"
import * as fs from "node:fs"
import * as net from "node:net"
import { command, executorPool, Executors, ExitCode, Invocation } from "./Cli.ts"
import * as Config from "./Config.ts"
import { consoleFor, Output } from "./Output.ts"
import { type Request, type Response, socketPath } from "./socket.ts"

/**
 * Executors that are always one run ahead: taking a pool for a run immediately starts the
 * next one, and the taken pool is shut down when its run ends. A run asking for a
 * different number of workers gets a fresh pool.
 */
export const warmExecutors = (size: number) =>
  Effect.gen(function*() {
    const context = yield* Effect.context<Worker.WorkerPlatform | Worker.Spawner>()
    const serverScope = yield* Effect.scope
    const prepare = Effect.gen(function*() {
      const scope = yield* Scope.make()
      const pool = yield* Layer.buildWithScope(executorPool(size), scope)
      return { scope, pool }
    }).pipe(Effect.provideContext(context))
    let next = yield* Effect.forkIn(prepare, serverScope)
    const take = Effect.suspend(() => {
      const ready = next
      return Fiber.join(ready).pipe(
        Effect.tap(() =>
          Effect.forkIn(prepare, serverScope).pipe(Effect.tap((fiber) => Effect.sync(() => next = fiber)))
        )
      )
    })
    return Executors.of({
      layer: (workers) =>
        workers === size
          ? Layer.effectContext(
            Effect.acquireRelease(take, ({ scope }) => Scope.close(scope, Exit.void)).pipe(
              Effect.map(({ pool }) => pool)
            )
          )
          : executorPool(workers)
    })
  })

/** Failures that were already reported to the client: an `ExitCode`, or one of effect/cli's own errors. */
const reported = (cause: Cause.Cause<unknown>) =>
  cause.reasons.some((reason) =>
    reason._tag === "Fail" && (reason.error instanceof ExitCode || CliError.isCliError(reason.error))
  )

const exitCodeOf = (exit: Exit.Exit<unknown, unknown>): number => {
  if (Exit.isSuccess(exit)) return 0
  const error = exit.cause.reasons.find((reason) => reason._tag === "Fail")
  if (error && error._tag === "Fail" && error.error instanceof ExitCode) return error.error.code
  return exit.cause.reasons.every((reason) => reason._tag === "Interrupt") ? 130 : 1
}

/**
 * Runs an `etest` command line in this process, with its output going to `output` and its
 * executors from `executors`, and returns the exit code. Used by `etest serve` and `etest mcp`.
 * `invocation` says where the command line came from (see `Invocation`).
 */
export const runCommandLine = (version: string, executors: Executors["Service"]) =>
(
  argv: ReadonlyArray<string>,
  output: Output["Service"],
  invocation: Invocation
) =>
  Command.runWith(command, { version, helpOnError: false })(argv).pipe(
    Effect.provideService(Output, output),
    Effect.provideService(Invocation, invocation),
    Effect.provideService(Executors, executors),
    Effect.provideService(Console.Console, consoleFor(output)),
    Effect.exit,
    Effect.map((exit) => {
      const code = exitCodeOf(exit)
      // ExitCode and effect/cli's errors are already reported; anything else is unexpected
      if (code === 1 && Exit.isFailure(exit) && !reported(exit.cause)) output.err(Cause.pretty(exit.cause) + "\n")
      return code
    })
  )

/**
 * For a long-running process (`etest serve`, `etest mcp`): finds the project from the working
 * directory, moves to its root, and returns its config. Runs it serves resolve the same root.
 */
export const enterProject = Effect.gen(function*() {
  const config = yield* Config.resolve(process.cwd(), { config: Option.none(), noConfig: false }).pipe(
    Effect.catchTag(
      "ConfigError",
      (error) => Console.error(`etest: ${error.message}`).pipe(Effect.andThen(Effect.fail(new ExitCode({ code: 1 }))))
    )
  )
  if (process.cwd() !== config.root) process.chdir(config.root)
  return config
})

const serve = (version: string, options: { readonly workers: Option.Option<number> }) =>
  Effect.gen(function*() {
    const config = yield* enterProject
    const cwd = config.root
    const location = socketPath(cwd)
    const workers = Option.getOrElse(options.workers, () => config.workers ?? Config.BUILTIN_WORKERS)
    const executors = yield* warmExecutors(workers)
    const runFork = Effect.runForkWith(
      yield* Effect.context<Command.Environment | Worker.WorkerPlatform | Worker.Spawner>()
    )
    const oneAtATime = Semaphore.makeUnsafe(1)

    const handle = (client: net.Socket, request: Request) => {
      const send = (response: Response) => {
        if (!client.destroyed) client.write(JSON.stringify(response) + "\n")
      }
      if (request.root !== cwd) {
        send({ err: `etest serve: this server is for ${cwd}, not ${request.root}\n` })
        send({ exit: 2 })
        client.end()
        return
      }
      const output = Output.of({ out: (text) => send({ out: text }), err: (text) => send({ err: text }) })
      const started = Date.now()
      const program = runCommandLine(version, executors)(request.argv, output, {
        cwd: request.cwd,
        script: request.script
      }).pipe(
        Effect.flatMap((code) =>
          Effect.sync(() => {
            send({ exit: code })
            client.end()
            process.stderr.write(
              `etest serve: ${["etest", ...request.argv].join(" ")} → exit ${code} (${Date.now() - started}ms)\n`
            )
          })
        )
      )
      const fiber = runFork(
        oneAtATime.withPermits(1)(program).pipe(
          Effect.onInterrupt(() =>
            Effect.sync(() =>
              process.stderr.write(`etest serve: ${["etest", ...request.argv].join(" ")} → interrupted by the client\n`)
            )
          )
        )
      )
      // the client went away (e.g. Ctrl-C): stop its run
      client.on("close", () => {
        runFork(Fiber.interrupt(fiber))
      })
    }

    const server = net.createServer((client) => {
      let buffered = ""
      client.setEncoding("utf8")
      client.on("data", (chunk: string) => {
        buffered += chunk
        const newline = buffered.indexOf("\n")
        if (newline === -1) return
        client.removeAllListeners("data")
        try {
          handle(client, JSON.parse(buffered.slice(0, newline)) as Request)
        } catch {
          client.destroy()
        }
      })
      client.on("error", () => {})
    })

    // a socket file left behind by a server that died is in the way; a live one is not ours to take
    if (process.platform !== "win32" && fs.existsSync(location)) {
      const alive = yield* Effect.callback<boolean>((resume) => {
        const probe = net.connect(location)
        probe.on("connect", () => {
          probe.destroy()
          resume(Effect.succeed(true))
        })
        probe.on("error", () => resume(Effect.succeed(false)))
      })
      if (alive) {
        yield* Console.error(`etest serve: already running for ${cwd} (${location})`)
        return yield* new ExitCode({ code: 1 })
      }
      fs.rmSync(location, { force: true })
    }
    yield* Effect.callback<void>((resume) => {
      server.listen(location, () => resume(Effect.void))
    })
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        server.close()
        if (process.platform !== "win32") fs.rmSync(location, { force: true })
      })
    )
    yield* Console.error(`etest serve: ready for ${cwd} (workers=${workers}); stop with Ctrl-C`)
    return yield* Effect.never
  })

/** `etest serve [--workers N]`, serving the plain `etest` command to forwarded command lines. */
export const serveCommand = (version: string) =>
  Command.make("serve", {
    workers: Flag.Int("workers").pipe(
      Flag.withDescription("Executors per run (worker threads; default: the config's `workers`, else 2)"),
      Flag.optional
    )
  }).pipe(
    Command.withDescription(
      "Keep a test runner running for this directory: `etest` here then forwards to it and skips startup"
    ),
    Command.withHandler((options) => Effect.scoped(serve(version, options)))
  )
