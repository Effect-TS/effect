import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Stream from "effect/Stream"
import * as ChildProcess from "effect/unstable/process/ChildProcess"
import { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner"
import { SpikeError } from "./Errors.ts"
import { Findings } from "./Findings.ts"

export interface PnpmRun {
  readonly args: ReadonlyArray<string>
  readonly cwd: string
  readonly exitCode: number
  readonly durationMs: number
  readonly stdout: string
  readonly stderr: string
}

export interface PnpmOptions {
  readonly cwd: string
  /** Registry token, passed to pnpm through the environment (never argv). */
  readonly token: Option.Option<Redacted.Redacted<string>>
  /** One-time password, passed through pnpm's `--otp` option. */
  readonly otp?: Option.Option<Redacted.Redacted<string>> | undefined
}

const REGISTRY_TOKEN_ENV = "npm_config_//registry.npmjs.org/:_authToken"

/**
 * Runs `pnpm <args>` the way CI would: stdin is not a TTY, so pnpm cannot fall
 * back to an interactive OTP or web-auth prompt. Credentials travel only via
 * environment variables, except for pnpm's OTP option, and are scrubbed from
 * the captured output.
 */
export const runPnpm = Effect.fn("runPnpm")(function*(
  args: ReadonlyArray<string>,
  options: PnpmOptions
) {
  const spawner = yield* ChildProcessSpawner
  const findings = yield* Findings

  const env: Record<string, string> = {}
  if (Option.isSome(options.token)) {
    yield* findings.addSecret(options.token.value)
    env[REGISTRY_TOKEN_ENV] = Redacted.value(options.token.value)
  }
  const commandArgs = [...args]
  if (options.otp !== undefined && Option.isSome(options.otp)) {
    yield* findings.addSecret(options.otp.value)
    commandArgs.push("--otp", Redacted.value(options.otp.value))
  }

  const command = ChildProcess.make("pnpm", commandArgs, {
    cwd: options.cwd,
    env,
    extendEnv: true,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe"
  })

  const startedAt = Date.now()
  const result = yield* Effect.scoped(
    Effect.gen(function*() {
      const handle = yield* spawner.spawn(command)
      const [stdout, stderr, exitCode] = yield* Effect.all([
        Stream.mkString(Stream.decodeText(handle.stdout)),
        Stream.mkString(Stream.decodeText(handle.stderr)),
        handle.exitCode
      ], { concurrency: "unbounded" })
      return { stdout, stderr, exitCode: Number(exitCode) }
    })
  ).pipe(
    Effect.mapError((cause) => new SpikeError({ message: `Failed to run pnpm ${args.join(" ")}`, cause }))
  )

  const run: PnpmRun = {
    args,
    cwd: options.cwd,
    exitCode: result.exitCode,
    durationMs: Date.now() - startedAt,
    stdout: findings.redact(result.stdout),
    stderr: findings.redact(result.stderr)
  }
  return run
})

/** Extracts the `stageId` values pnpm prints for `stage publish --json`. */
export const stageIdsFromJson = (
  stdout: string
): ReadonlyArray<{ readonly name: string; readonly stageId: string }> => {
  try {
    const parsed = JSON.parse(stdout) as Record<string, { readonly stageId?: string }>
    return Object.entries(parsed).flatMap(([name, summary]) =>
      typeof summary?.stageId === "string" ? [{ name, stageId: summary.stageId }] : []
    )
  } catch {
    return []
  }
}
