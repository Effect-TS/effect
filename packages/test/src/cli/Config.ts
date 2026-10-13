// The test configs as the CLI uses them: found (root.ts), loaded, validated, resolved into
// projects, and shown (`etest config`). A config that doesn't load or isn't valid fails the run
// with the reason, before anything is planned; an unknown key is an error, never silently ignored.
//
// The workspace root's config holds the run-wide settings (`workers`) and defaults that every
// project inherits; a nested config is a project of its own, and overrides those defaults one key
// at a time. `paths`, `exclude` and `shared` belong to the config that sets them.
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
import { builtinDefaults, type Project, type Projects, SLOW_MS } from "../Coordinator.ts"
import { CONFIG_FILE, findConfig, hasConfig, isWithin, rootOf } from "./root.ts"

export class ConfigError extends Data.TaggedError("ConfigError")<{ readonly message: string }> {}

/** One config file's values, as written (nothing inherited). */
export interface Loaded {
  /** the config file (absolute), if any */
  readonly file: string | undefined
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
const validate = (config: unknown): string | Omit<Loaded, "file"> => {
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

const none: Loaded = { file: undefined, paths: undefined, exclude: [], workers: undefined, defaults: {}, shared: 0 }

/**
 * Loads and validates one config file (absolute), named in errors relative to `shownFrom`. It
 * is imported afresh whenever the file changed, so a long-running `etest serve` sees edits
 * (modules the config imports are not re-imported; executors are fresh every run).
 */
export const load = (file: string, shownFrom: string): Effect.Effect<Loaded, ConfigError> => {
  const shown = path.relative(shownFrom, file)
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
        : Effect.succeed({ file, ...checked })
    })
  )
}

/**
 * Finds the workspace config: `--config <file>` (relative to `cwd`), or the outermost
 * `etest.config.ts` from `cwd` up to the repository root; none with `--no-config`.
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

/** A project as the CLI sees it: the coordinator's view, plus its config file's own values. */
export interface ResolvedProject extends Project {
  readonly own: Loaded
}

/** The workspace: its root project and config, and its nested projects (loaded on first use). */
export interface Workspace extends Projects<ConfigError> {
  readonly root: ResolvedProject
  /** the root config's values (`file` undefined when there is none) */
  readonly config: Loaded
  readonly at: (dir: string) => Effect.Effect<ResolvedProject | undefined, ConfigError>
  readonly of: (p: string) => Effect.Effect<ResolvedProject, ConfigError>
}

/**
 * The workspace rooted at `root`, with `file` (absolute) as its root config, or none. With
 * `nested: false` (`--no-config`) nested configs are ignored: every file is in the root project.
 */
export const workspaceAt = (
  file: string | undefined,
  root: string,
  options: { readonly nested: boolean } = { nested: true }
): Effect.Effect<Workspace, ConfigError> =>
  Effect.map(file === undefined ? Effect.succeed(none) : load(file, root), (config): Workspace => {
    const project = (dir: string, own: Loaded): ResolvedProject => ({
      key: path.relative(root, dir).split(path.sep).join("/") || ".",
      dir,
      config: own.file,
      configs: [...new Set([config.file, own.file].filter((f): f is string => f !== undefined))],
      paths: own.paths,
      exclude: own.exclude,
      // one key at a time: the project's own value, else the root config's, else built-in
      defaults: {
        timeoutMs: own.defaults.timeoutMs ?? config.defaults.timeoutMs ?? builtinDefaults.timeoutMs,
        retries: own.defaults.retries ?? config.defaults.retries ?? builtinDefaults.retries
      },
      own
    })
    const rootProject = project(root, config)
    const projects = new Map<string, ResolvedProject | undefined>([[root, rootProject]])
    const at = (dir: string): Effect.Effect<ResolvedProject | undefined, ConfigError> =>
      Effect.suspend(() => {
        const abs = path.resolve(dir)
        if (projects.has(abs)) return Effect.succeed(projects.get(abs))
        if (!options.nested || !isWithin(abs, root) || !hasConfig(abs)) return Effect.succeed(undefined)
        return load(path.join(abs, CONFIG_FILE), root).pipe(
          Effect.flatMap((own) =>
            own.workers !== undefined
              ? Effect.fail(
                new ConfigError({
                  message: `${
                    path.relative(root, own.file!)
                  }: \`workers\` can only be set in the workspace root's config (${
                    config.file !== undefined ? path.relative(root, config.file) : "none"
                  }); a run has one set of executors`
                })
              )
              : Effect.succeed(project(abs, own))
          ),
          Effect.tap((p) => Effect.sync(() => projects.set(abs, p)))
        )
      })
    const of = (p: string): Effect.Effect<ResolvedProject, ConfigError> =>
      Effect.gen(function*() {
        const abs = path.resolve(p)
        // a path outside the workspace uses the root's config
        if (!isWithin(abs, root)) return rootProject
        let dir = fs.existsSync(abs) && fs.statSync(abs).isDirectory() ? abs : path.dirname(abs)
        for (;;) {
          const found = yield* at(dir)
          if (found !== undefined) return found
          dir = path.dirname(dir)
        }
      })
    return { root: rootProject, config, at, of }
  })

/** The workspace for `cwd` (see `locate`). */
export const workspace = (
  cwd: string,
  options: { readonly config: Option.Option<string>; readonly noConfig: boolean }
): Effect.Effect<Workspace, ConfigError> =>
  Effect.flatMap(locate(cwd, options), ({ file, root }) => workspaceAt(file, root, { nested: !options.noConfig }))

/** The values a run in `project` starts from, each with where it came from. */
export const describe = (ws: Workspace, project: ResolvedProject = ws.root): Array<string> => {
  const shown = (file: string | undefined) => file !== undefined ? path.relative(ws.root.dir, file) : undefined
  const rootFile = shown(ws.config.file)
  const projectFile = shown(project.own.file)
  const nested = project.key !== ws.root.key
  /** where an inherited value came from: the project's config, the root's, or built-in */
  const source = (own: boolean, inherited: boolean) =>
    own ? (nested ? projectFile! : rootFile!) : inherited ? rootFile! : "built-in"
  /** where a value of the project's own came from */
  const local = (set: boolean) => set ? (nested ? projectFile! : rootFile!) : "built-in"
  const ms = (n: number) => Duration.format(Duration.millis(n))
  const own = project.own
  const inherited = ws.config.defaults
  return [
    `workspace: ${ws.root.dir} (${
      rootFile !== undefined ? `the directory of ${rootFile}` : "the working directory: no config"
    })`,
    `config: ${rootFile ?? "none"}`,
    ...(nested ? [`project: ${project.key} (${projectFile}; its defaults override the workspace's)`] : []),
    `paths: ${JSON.stringify(project.paths ?? ["."])} (${
      local(project.paths !== undefined)
    }; paths given on the command line replace them)`,
    `exclude: node_modules, dot-directories (built-in)${
      project.exclude.length
        ? `, ${project.exclude.map((p) => JSON.stringify(p)).join(", ")} (${local(true)})`
        : ""
    }`,
    `workers: ${ws.config.workers ?? BUILTIN_WORKERS} (${
      ws.config.workers !== undefined ? rootFile : "built-in"
    }; --workers overrides)`,
    `timeout: ${ms(project.defaults.timeoutMs)} (${
      source(own.defaults.timeoutMs !== undefined, nested && inherited.timeoutMs !== undefined)
    }; a suite or test can set its own)`,
    `retries: ${project.defaults.retries} (${
      source(own.defaults.retries !== undefined, nested && inherited.retries !== undefined)
    }; a suite or test can set its own)`,
    `slow: over ${ms(SLOW_MS)} (built-in; a slow test still passes, and is reported)`,
    `shared: ${ws.config.shared} layer${ws.config.shared === 1 ? "" : "s"}${
      ws.config.shared ? ` (${rootFile}, shared by the whole run)` : ""
    }${nested ? `; ${own.shared} for this project${own.shared ? ` (${projectFile})` : ""}` : ""}`
  ]
}

/** `etest config`: print the resolved config of the project here, with where each value comes from. */
export const configCommand = (onError: (error: ConfigError) => Effect.Effect<never, unknown>) =>
  Command.make("config", {}).pipe(
    Command.withDescription(
      "Show the test config this directory resolves to (workspace and project), and where each value comes from"
    ),
    Command.withHandler(() =>
      Effect.gen(function*() {
        const ws = yield* workspace(process.cwd(), { config: Option.none(), noConfig: false })
        yield* Console.log(describe(ws, yield* ws.of(process.cwd())).join("\n"))
      }).pipe(Effect.catchTag("ConfigError", onError))
    )
  )
