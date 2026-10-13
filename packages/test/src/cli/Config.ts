// The test config as the CLI uses it: found (root.ts), loaded, validated, and shown
// (`etest config`). A config that doesn't load or isn't valid fails the run with the reason,
// before anything is planned; an unknown key is an error, never silently ignored.
import * as Command from "effect/cli/Command"
import * as Console from "effect/Console"
import * as Data from "effect/Data"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as fs from "node:fs"
import * as path from "node:path"
import { pathToFileURL } from "node:url"
import { builtinDefaults, SLOW_MS } from "../Coordinator.ts"
import { findConfig, rootOf } from "./root.ts"

export class ConfigError extends Data.TaggedError("ConfigError")<{ readonly message: string }> {}

/** The parts of a config the CLI needs. `shared` stays with the executors, which load the config themselves. */
export interface Loaded {
  /** the config file (absolute), if any */
  readonly file: string | undefined
  readonly root: string
  readonly paths: ReadonlyArray<string> | undefined
  readonly exclude: ReadonlyArray<string>
  readonly workers: number | undefined
  readonly defaults: { readonly timeoutMs?: number | undefined; readonly retries?: number | undefined }
  readonly shared: number
}

export const BUILTIN_WORKERS = 2

const KEYS = ["paths", "exclude", "workers", "defaults", "shared"]

const isStrings = (u: unknown): u is ReadonlyArray<string> => Array.isArray(u) && u.every((s) => typeof s === "string")
const isCount = (u: unknown, min: number): u is number => typeof u === "number" && Number.isInteger(u) && u >= min

/** Checks a config's default export; the first problem found is the error. */
const validate = (config: unknown): string | Omit<Loaded, "file" | "root"> => {
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    return "the default export is not a Test.config({ ... })"
  }
  const c = config as Record<string, unknown>
  for (const key of Object.keys(c)) {
    if (!KEYS.includes(key)) {
      const hint = key === "timeout" || key === "retries" ? ` (did you mean \`defaults: { ${key}: ... }\`?)` : ""
      return `unknown key "${key}"${hint}; the keys are ${KEYS.join(", ")}`
    }
  }
  if (c.paths !== undefined && !isStrings(c.paths)) return "`paths` must be an array of strings"
  if (c.exclude !== undefined && !isStrings(c.exclude)) return "`exclude` must be an array of glob strings"
  if (c.workers !== undefined && !isCount(c.workers, 1)) return "`workers` must be a whole number, at least 1"
  if (c.shared !== undefined && !(Array.isArray(c.shared) && c.shared.every(Layer.isLayer))) {
    return "`shared` must be an array of Layers"
  }
  let timeoutMs: number | undefined
  let retries: number | undefined
  if (c.defaults !== undefined) {
    if (typeof c.defaults !== "object" || c.defaults === null) return "`defaults` must be an object"
    const d = c.defaults as Record<string, unknown>
    for (const key of Object.keys(d)) {
      if (key !== "timeout" && key !== "retries") return `unknown key "defaults.${key}"; the keys are timeout, retries`
    }
    if (d.timeout !== undefined) {
      const duration = Duration.fromInput(d.timeout as Duration.Input)
      if (Option.isNone(duration)) return "`defaults.timeout` must be a duration, e.g. \"30 seconds\" or 30000"
      timeoutMs = Duration.toMillis(duration.value)
    }
    if (d.retries !== undefined) {
      if (!isCount(d.retries, 0)) return "`defaults.retries` must be a whole number, at least 0"
      retries = d.retries
    }
  }
  return {
    paths: c.paths as ReadonlyArray<string> | undefined,
    exclude: (c.exclude as ReadonlyArray<string> | undefined) ?? [],
    workers: c.workers as number | undefined,
    defaults: { timeoutMs, retries },
    shared: (c.shared as ReadonlyArray<unknown> | undefined)?.length ?? 0
  }
}

/**
 * Loads and validates the config (`file`, absolute), or the empty config when there is none.
 * It is imported afresh whenever the file changed, so a long-running `etest serve` sees
 * edits (modules the config imports are not re-imported; executors are fresh every run).
 */
export const load = (file: string | undefined, root: string): Effect.Effect<Loaded, ConfigError> => {
  if (file === undefined) {
    return Effect.succeed({
      file,
      root,
      paths: undefined,
      exclude: [],
      workers: undefined,
      defaults: {},
      shared: 0
    })
  }
  const shown = path.relative(root, file)
  return Effect.tryPromise({
    try: () => import(`${pathToFileURL(file).href}?mtime=${fs.statSync(file).mtimeMs}`),
    catch: (cause) =>
      new ConfigError({
        message: `${shown}: failed to load\n${cause instanceof Error ? cause.stack ?? cause.message : String(cause)}`
      })
  }).pipe(
    Effect.flatMap((mod) => {
      const checked = validate(mod.default)
      return typeof checked === "string"
        ? Effect.fail(new ConfigError({ message: `${shown}: ${checked}` }))
        : Effect.succeed({ file, root, ...checked })
    })
  )
}

/**
 * Finds the config: `--config <file>` (relative to `cwd`), or the nearest `etest.config.ts`
 * from `cwd` up to the repository root; none with `--no-config`.
 */
export const locate = (
  cwd: string,
  options: { readonly config: Option.Option<string>; readonly noConfig: boolean }
): Effect.Effect<{ readonly file: string | undefined; readonly root: string }, ConfigError> => {
  if (options.noConfig && Option.isSome(options.config)) {
    return Effect.fail(new ConfigError({ message: "--config and --no-config contradict each other: pass one" }))
  }
  if (options.noConfig) return Effect.succeed({ file: undefined, root: rootOf(undefined, cwd) })
  if (Option.isSome(options.config)) {
    const file = path.resolve(cwd, options.config.value)
    if (!fs.existsSync(file)) {
      return Effect.fail(new ConfigError({ message: `--config: no such file: ${options.config.value}` }))
    }
    return Effect.succeed({ file, root: rootOf(file, cwd) })
  }
  const file = findConfig(cwd)
  return Effect.succeed({ file, root: rootOf(file, cwd) })
}

/** The resolved values a run starts from, each with where it came from. */
export const describe = (config: Loaded): Array<string> => {
  const from = config.file !== undefined ? path.relative(config.root, config.file) : undefined
  const source = (set: boolean) => set ? from! : "built-in"
  const ms = (n: number) => Duration.format(Duration.millis(n))
  return [
    `root: ${config.root} (${from !== undefined ? `the directory of ${from}` : "the working directory: no config"})`,
    `config: ${from ?? "none"}`,
    `paths: ${JSON.stringify(config.paths ?? ["."])} (${
      source(config.paths !== undefined)
    }; paths given on the command line replace them)`,
    `exclude: node_modules, dot-directories (built-in)${
      config.exclude.length ? `, ${config.exclude.map((p) => JSON.stringify(p)).join(", ")} (${from})` : ""
    }`,
    `workers: ${config.workers ?? BUILTIN_WORKERS} (${source(config.workers !== undefined)}; --workers overrides)`,
    `timeout: ${ms(config.defaults.timeoutMs ?? builtinDefaults.timeoutMs)} (${
      source(config.defaults.timeoutMs !== undefined)
    }; a suite or test can set its own)`,
    `retries: ${config.defaults.retries ?? builtinDefaults.retries} (${
      source(config.defaults.retries !== undefined)
    }; a suite or test can set its own)`,
    `slow: over ${ms(SLOW_MS)} (built-in; a slow test still passes, and is reported)`,
    `shared: ${config.shared} layer${config.shared === 1 ? "" : "s"}${config.shared ? ` (${from})` : ""}`
  ]
}

/** Loads the config for `cwd`, or reports why it can't be (`ExitCode`-style: the caller decides the exit). */
export const resolve = (cwd: string, options: { readonly config: Option.Option<string>; readonly noConfig: boolean }) =>
  Effect.flatMap(locate(cwd, options), ({ file, root }) => load(file, root))

/** `etest config`: print the resolved config, with where each value comes from. */
export const configCommand = (onError: (error: ConfigError) => Effect.Effect<never, unknown>) =>
  Command.make("config", {}).pipe(
    Command.withDescription("Show the test config this directory resolves to, and where each value comes from"),
    Command.withHandler(() =>
      resolve(process.cwd(), { config: Option.none(), noConfig: false }).pipe(
        Effect.flatMap((config) => Console.log(describe(config).join("\n"))),
        Effect.catchTag("ConfigError", onError)
      )
    )
  )
