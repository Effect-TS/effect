// The workspace as the CLI lays it out from config files: its root (root.ts), its projects (a
// directory with an `etest.config.ts`; a test file belongs to the nearest one above it), the
// defaults each project resolves to, and the test files a search finds. The result is plain
// data for the coordinator (`Coordinator.Project`, `Coordinator.TestFile`); the coordinator
// itself never reads a config or searches a directory.
//
// The workspace root's config holds the run-wide settings (`workers`) and defaults that every
// project inherits; a nested config is a project of its own, and overrides those defaults one key
// at a time. `paths`, `exclude` and `shared` belong to the config that sets them.
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as fs from "node:fs"
import * as path from "node:path"
import * as Coordinator from "../Coordinator.ts"
import { BUILTIN_WORKERS, ConfigError, load, type Loaded, none } from "./Config.ts"
import { CONFIG_FILE, findConfig, hasConfig, isWithin, rootOf } from "./root.ts"

const posix = (p: string) => p.split(path.sep).join("/")

/** A project as the CLI lays it out: what the coordinator needs, plus how to search it and its config's own values. */
export interface Project extends Coordinator.Project {
  /** where its tests are when it is searched without paths (relative to `dir`; default: all of it) */
  readonly paths: ReadonlyArray<string> | undefined
  /** glob patterns skipped while searching its directories (relative to `dir`) */
  readonly exclude: ReadonlyArray<string>
  /** its config file's own values (nothing inherited) */
  readonly own: Loaded
}

/** A project as the coordinator takes it (`RunConfig.projects`): no more than `Coordinator.Project`. */
export const forRun = (project: Project): Coordinator.RunConfig["projects"][number] => ({
  key: project.key,
  dir: project.dir,
  ...(project.config !== undefined ? { config: project.config } : {}),
  configs: project.configs,
  defaults: project.defaults
})

/** The workspace: its root project and config, and its nested projects (loaded on first use). */
export interface Workspace {
  readonly root: Project
  /** the root config's values (`file` undefined when there is none) */
  readonly config: Loaded
  /** the project whose root is exactly `dir` (absolute), if it is one (a nested config) */
  readonly at: (dir: string) => Effect.Effect<Project | undefined, ConfigError>
  /** the project a path (absolute) belongs to: the nearest one at or above it */
  readonly of: (p: string) => Effect.Effect<Project, ConfigError>
}

/**
 * Finds the workspace config: `config` (a file relative to `cwd`), or the outermost
 * `etest.config.ts` from `cwd` up to the repository root; none with `noConfig`.
 */
export const locate = (
  cwd: string,
  options: { readonly config?: string | undefined; readonly noConfig?: boolean | undefined }
): Effect.Effect<{ readonly file: string | undefined; readonly root: string }, ConfigError> => {
  if (options.noConfig && options.config !== undefined) {
    return Effect.fail(new ConfigError({ message: "--config and --no-config contradict each other: pass one" }))
  }
  if (options.noConfig) return Effect.succeed({ file: undefined, root: rootOf(undefined, cwd) })
  if (options.config !== undefined) {
    const file = path.resolve(cwd, options.config)
    if (!fs.existsSync(file)) {
      return Effect.fail(new ConfigError({ message: `--config: no such file: ${options.config}` }))
    }
    return Effect.succeed({ file, root: rootOf(file, cwd) })
  }
  const file = findConfig(cwd)
  return Effect.succeed({ file, root: rootOf(file, cwd) })
}

/**
 * The workspace rooted at `root` (absolute), with `file` (absolute) as its root config, or none.
 * With `nested: false` (`--no-config`) nested configs are ignored: every file is in the root project.
 */
export const workspaceAt = (
  file: string | undefined,
  root: string,
  options: { readonly nested: boolean } = { nested: true }
): Effect.Effect<Workspace, ConfigError> =>
  Effect.map(file === undefined ? Effect.succeed(none) : load(file, root), (config): Workspace => {
    const project = (dir: string, own: Loaded): Project => ({
      key: posix(path.relative(root, dir)) || ".",
      dir,
      ...(own.file !== undefined ? { config: own.file } : {}),
      configs: [...new Set([config.file, own.file].filter((f): f is string => f !== undefined))],
      paths: own.paths,
      exclude: own.exclude,
      // one key at a time: the project's own value, else the root config's, else built-in
      defaults: {
        timeoutMs: own.defaults.timeoutMs ?? config.defaults.timeoutMs ?? Coordinator.builtinDefaults.timeoutMs,
        retries: own.defaults.retries ?? config.defaults.retries ?? Coordinator.builtinDefaults.retries
      },
      own
    })
    const rootProject = project(root, config)
    const projects = new Map<string, Project | undefined>([[root, rootProject]])
    const at = (dir: string): Effect.Effect<Project | undefined, ConfigError> =>
      Effect.suspend(() => {
        if (projects.has(dir)) return Effect.succeed(projects.get(dir))
        if (!options.nested || !isWithin(dir, root) || !hasConfig(dir)) return Effect.succeed(undefined)
        return load(path.join(dir, CONFIG_FILE), root).pipe(
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
              : Effect.succeed(project(dir, own))
          ),
          Effect.tap((p) => Effect.sync(() => projects.set(dir, p)))
        )
      })
    const of = (p: string): Effect.Effect<Project, ConfigError> =>
      Effect.gen(function*() {
        // a path outside the workspace uses the root's config
        if (!isWithin(p, root)) return rootProject
        let dir = fs.existsSync(p) && fs.statSync(p).isDirectory() ? p : path.dirname(p)
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
  options: { readonly config?: string | undefined; readonly noConfig?: boolean | undefined } = {}
): Effect.Effect<Workspace, ConfigError> =>
  Effect.flatMap(locate(cwd, options), ({ file, root }) => workspaceAt(file, root, { nested: !options.noConfig }))

// --- discovery

/** Directories that are never searched. */
const skipped = (name: string) => name === "node_modules" || name.startsWith(".")

/** A glob as a RegExp: `*` within a path segment, `**` across segments, `?` one character. */
export const globToRegExp = (glob: string): RegExp => {
  let out = ""
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === "*" && glob[i + 1] === "*") {
      i++
      if (glob[i + 1] === "/") {
        i++
        out += "(?:.*/)?"
      } else out += ".*"
    } else if (c === "*") out += "[^/]*"
    else if (c === "?") out += "[^/]"
    else out += /[\\^$.|+()[\]{}]/.test(c) ? `\\${c}` : c
  }
  return new RegExp(`^${out}$`)
}

export interface Discovered {
  /** the test files found (absolute), sorted, each with its project */
  readonly files: ReadonlyArray<{ readonly file: string; readonly project: Project }>
  /** the projects searched, in the order they were reached */
  readonly projects: ReadonlyArray<Project>
  /** paths that don't exist, as given */
  readonly missing: ReadonlyArray<string>
  /** paths that yield no test file (a file that isn't a test file, or a directory without any), as given */
  readonly empty: ReadonlyArray<string>
}

/**
 * The `*.test.ts` files under `paths` (relative to the workspace root; none: the root), each in
 * the project it belongs to: the nearest one above it.
 *
 * Directories are searched, skipping `node_modules`, dot-directories and what the project's
 * `exclude` matches (relative to the project's root). A search that reaches a nested project
 * continues there with that project's rules: its `exclude`, and its own `paths` (it wasn't
 * named). A directory an outer project excludes is never entered, nested projects included.
 *
 * Naming a path opts it in: a file named directly is never excluded, and a directory that is
 * itself excluded is searched in full when it is named (`etest test/fixtures` despite
 * `**` + `/fixtures/**`). Paths that don't exist, and those that yield no test file, are
 * returned too: asking for something that can't run is an error, never silently ignored.
 */
export const discover = (ws: Workspace, paths: ReadonlyArray<string>): Effect.Effect<Discovered, ConfigError> =>
  Effect.gen(function*() {
    const root = ws.root.dir
    const patterns = new Map<Project, Array<RegExp>>()
    const excluded = (project: Project, p: string) => {
      let res = patterns.get(project)
      if (res === undefined) patterns.set(project, res = project.exclude.map(globToRegExp))
      const rel = posix(path.relative(project.dir, p))
      return res.some((re) => re.test(rel) || re.test(`${rel}/`))
    }
    const files = new Map<string, Project>()
    const searched = new Map<string, Project>()
    const missing: Array<string> = []
    const empty: Array<string> = []
    const reached = (project: Project) => {
      if (!searched.has(project.key)) searched.set(project.key, project)
    }

    // every path below is absolute
    const visit = (p: string, project: Project, exclusions: boolean): Effect.Effect<void, ConfigError> =>
      Effect.gen(function*() {
        if (exclusions && excluded(project, p)) return
        if (fs.statSync(p).isDirectory()) {
          const nested = p !== project.dir ? yield* ws.at(p) : undefined
          if (nested !== undefined) return yield* enter(nested)
          for (const e of fs.readdirSync(p).sort()) {
            if (!skipped(e)) yield* visit(path.join(p, e), project, exclusions)
          }
        } else if (p.endsWith(".test.ts")) files.set(p, project)
      })
    // a path given to search (on the command line, or a project's `paths`): opted in
    const named = (p: string, project: Project): Effect.Effect<void, ConfigError> =>
      Effect.gen(function*() {
        // what is below a named directory is excluded only if the directory itself isn't
        if (!excluded(project, p) && fs.statSync(p).isDirectory()) {
          for (const e of fs.readdirSync(p).sort()) {
            if (!skipped(e)) yield* visit(path.join(p, e), project, true)
          }
        } else yield* visit(p, project, false)
      })
    // a nested project reached by a search: its own `paths`, else all of it
    const enter = (project: Project): Effect.Effect<void, ConfigError> =>
      Effect.gen(function*() {
        reached(project)
        for (const rel of project.paths ?? ["."]) {
          const p = path.resolve(project.dir, rel)
          if (!fs.existsSync(p)) missing.push(path.relative(root, p) || ".")
          else yield* named(p, project)
        }
      })

    for (const given of paths.length ? paths : ["."]) {
      const p = path.resolve(root, given)
      if (!fs.existsSync(p)) {
        missing.push(given)
        continue
      }
      const project = yield* ws.of(p)
      reached(project)
      const before = files.size
      yield* named(p, project)
      if (files.size === before) empty.push(given)
    }
    // overlapping paths (`examples examples/a.test.ts`) find a file more than once: a Map keeps one
    return {
      files: [...files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([file, project]) => ({ file, project })),
      projects: [...searched.values()],
      missing,
      empty
    }
  })

// --- `etest config`

/** The values a run in `project` starts from, each with where it came from. */
export const describe = (ws: Workspace, project: Project = ws.root): Array<string> => {
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
    `slow: over ${ms(Coordinator.SLOW_MS)} (built-in; a slow test still passes, and is reported)`,
    `shared: ${ws.config.shared} layer${ws.config.shared === 1 ? "" : "s"}${
      ws.config.shared ? ` (${rootFile}, shared by the whole run)` : ""
    }${nested ? `; ${own.shared} for this project${own.shared ? ` (${projectFile})` : ""}` : ""}`
  ]
}
