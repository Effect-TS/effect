/**
 * The `graphqlgen --watch` loop (EFF-1834 points 14 to 17).
 *
 * The loop runs over the event streams `options.watch` returns, so tests can
 * inject events and the CLI plugs in `FileSystem.watch`.
 *
 * @internal
 */
import * as Cause from "effect/Cause"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as FileSystem from "effect/FileSystem"
import * as Option from "effect/Option"
import * as Path from "effect/Path"
import * as PlatformError from "effect/PlatformError"
import * as Queue from "effect/Queue"
import * as Result from "effect/Result"
import * as Stream from "effect/Stream"
import type * as Config from "../Config.ts"
import * as Cli from "./Cli.ts"
import * as Generate from "./Generate.ts"
import * as Glob from "./Glob.ts"

/** How long the loop waits after the last relevant event before it regenerates. */
const debounce = "50 millis"

/**
 * Runs a cycle at startup, then again about 50 ms after the last relevant
 * event in a burst.
 *
 * - Relevant events touch the config file, the schema file, or a path that a
 *   `documents` glob matches. Generated files never match.
 * - A successful cycle writes only the files whose bytes changed, deletes
 *   stale outputs and logs one line to stdout:
 *   `regenerated <n> file(s), deleted <m>`, counting the files written and
 *   deleted (`regenerated 1 file, deleted 0`, `regenerated 3 files, deleted 1`).
 * - An error cycle prints its diagnostics to stderr, writes nothing and logs
 *   no `regenerated` line.
 * - The unmapped-scalars warning is printed only when its set of scalars
 *   changes.
 * - A config edit re-imports the config with `?t=<mtime>`. A config that
 *   fails to load or decode is reported on stderr and the previous one is
 *   kept.
 *
 * `options.configPath` is the config file, as an absolute path.
 *
 * `options.watch` watches a file, or a directory and everything under it,
 * with `FileSystem.watch` semantics: each event's `path` is relative to the
 * watched directory, or to a watched file's directory. The loop subscribes to
 * the config file, the schema file and the static prefix of each `documents`
 * glob before it runs a cycle, and again whenever those paths change. A
 * missing glob root is watched through its first missing directory, so
 * creating it, or deleting and recreating it, is seen.
 *
 * A watch stream that ends means its directory was deleted: the loop runs a
 * cycle, which subscribes again. A watch stream that fails is reported on
 * stderr, and the next cycle subscribes again.
 *
 * Fails with `ConfigLoadError` only when the config can't be loaded at
 * startup; otherwise it runs until interrupted.
 */
export const run = (
  options: {
    readonly configPath: string
    readonly watch: (path: string) => Stream.Stream<FileSystem.WatchEvent, PlatformError.PlatformError>
  }
): Effect.Effect<never, Cli.ConfigLoadError, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const configPath = path.resolve(options.configPath)
    const cwd = path.dirname(configPath)
    const cache = Generate.makeCache()

    /** The config file's mtime, used to spot edits and to bust the import cache. */
    const configVersion = fs.stat(configPath).pipe(
      Effect.map((info) => Option.getOrElse(Option.map(info.mtime, (date) => date.getTime()), () => 0)),
      Effect.orElseSucceed(() => undefined)
    )

    const initialVersion = yield* configVersion
    const initialConfig = yield* Cli.loadConfig(configPath, initialVersion)
    const state = {
      config: initialConfig,
      configVersion: initialVersion,
      schemaPath: path.resolve(cwd, initialConfig.schema),
      globs: initialConfig.documents.map(Glob.make),
      /** Files the last successful cycle generated or deleted; events for them are ignored. */
      outputs: new Set<string>(),
      /** The first missing directory of each missing glob root; its creation is relevant. */
      pending: new Set<string>(),
      /** The formatted warnings the last successful cycle printed or kept quiet about. */
      warnings: new Set<string>()
    }

    const useConfig = (config: Config.Config) => {
      state.config = config
      state.schemaPath = path.resolve(cwd, config.schema)
      state.globs = config.documents.map(Glob.make)
    }

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    const isRelevant = (absolute: string): boolean => {
      if (absolute === configPath || absolute === state.schemaPath || state.pending.has(absolute)) return true
      if (state.outputs.has(absolute)) return false
      const relative = path.relative(cwd, absolute).split(path.sep).join("/")
      const segments = relative.split("/")
      const inside = segments.slice(segments.findIndex((segment) => segment !== ".."))
      // The generator never reads documents under node_modules or dot-directories.
      if (inside.some((segment) => segment === "node_modules" || segment.startsWith("."))) return false
      return state.globs.some((glob) => glob.matches(relative))
    }

    const events = yield* Queue.unbounded<string>()

    interface Target {
      /** `pending` is the first missing directory on the way to a glob root. */
      readonly kind: "file" | "tree" | "pending"
      readonly path: string
      /** Event paths are relative to this directory. */
      readonly base: string
    }

    const exists = (file: string) => fs.exists(file).pipe(Effect.orElseSucceed(() => false))

    /** `file` itself when its directory exists, otherwise the first missing directory above it. */
    const firstMissing = Effect.fnUntraced(function*(file: string) {
      let missing = file
      while (true) {
        const parent = path.dirname(missing)
        if (parent === missing || (yield* exists(parent))) return missing
        missing = parent
      }
    })

    /**
     * The config file, the schema file and each `documents` glob root. Every
     * target's `base` directory exists, so a watch only ends when something
     * was deleted.
     */
    const targets = Effect.gen(function*() {
      const found = new Map<string, Target>()
      for (const file of [configPath, state.schemaPath]) {
        const watched = yield* firstMissing(file)
        found.set(watched, { kind: watched === file ? "file" : "pending", path: watched, base: path.dirname(watched) })
      }
      for (const glob of state.globs) {
        const protectedRoot = glob.root.split("/").some((segment) =>
          segment === "node_modules" || (segment.startsWith(".") && segment !== "." && segment !== "..")
        )
        if (protectedRoot) continue
        const directory = path.join(cwd, glob.root)
        if (found.get(directory)?.kind === "tree") continue
        if (yield* exists(directory)) {
          found.set(directory, { kind: "tree", path: directory, base: directory })
        } else {
          const missing = yield* firstMissing(directory)
          if (!found.has(missing)) found.set(missing, { kind: "pending", path: missing, base: path.dirname(missing) })
        }
      }
      return Array.from(found.values())
    })

    /** Set when a watch stream ended or failed, so the next `subscribe` starts over. */
    let stale = false

    const watchTarget = (target: Target) =>
      options.watch(target.path).pipe(
        Stream.runForEach((event) => {
          const absolute = path.resolve(target.base, event.path)
          return isRelevant(absolute) ? Queue.offer(events, absolute) : Effect.void
        }),
        Effect.matchEffect({
          onFailure: (error) =>
            Effect.andThen(
              Effect.sync(() => (stale = true)),
              Console.error(`error: could not watch ${Cli.displayPath(path, target.path)}: ${error.message}`)
            ),
          onSuccess: () => Effect.andThen(Effect.sync(() => (stale = true)), Queue.offer(events, target.path))
        })
      )

    let watching: { readonly key: string; readonly fiber: Fiber.Fiber<void> } | undefined
    /** Watches the current targets, replacing the previous watchers when they changed or one stopped. */
    const subscribe = Effect.gen(function*() {
      const current = yield* targets
      const key = current.map((target) => `${target.kind}:${target.path}`).join("\0")
      if (!stale && watching?.key === key) return
      if (watching !== undefined) yield* Fiber.interrupt(watching.fiber)
      stale = false
      state.pending = new Set(current.filter((target) => target.kind === "pending").map((target) => target.path))
      const fiber = yield* Effect.forEach(current, watchTarget, { concurrency: "unbounded", discard: true }).pipe(
        Effect.forkChild
      )
      watching = { key, fiber }
    })

    // -------------------------------------------------------------------------
    // Cycles
    // -------------------------------------------------------------------------

    const generate = Effect.gen(function*() {
      const generated = yield* Effect.result(Generate.generate(state.config, { cwd, cache }))
      if (Result.isFailure(generated)) {
        return yield* Console.error(`error: ${generated.failure.message}`)
      }
      const result = generated.success
      const warnings = new Set<string>()
      let errors = 0
      for (const diagnostic of result.diagnostics) {
        const formatted = Cli.formatDiagnostic(path, cwd, diagnostic)
        if (diagnostic.severity === "error") {
          errors++
          yield* Console.error(formatted)
        } else {
          warnings.add(formatted)
          if (!state.warnings.has(formatted)) yield* Console.error(formatted)
        }
      }
      if (errors > 0) {
        return yield* Console.error(Cli.errorSummary(errors))
      }
      state.warnings = warnings
      const written = yield* Effect.result(
        Cli.planChanges(result).pipe(Effect.tap(Cli.writeChanges))
      )
      if (Result.isFailure(written)) {
        return yield* Console.error(written.failure.message)
      }
      const changes = written.success
      state.outputs = new Set([...result.files.map((file) => file.path), ...result.deletes])
      const count = changes.creates.length + changes.updates.length
      yield* Console.log(`regenerated ${count} ${count === 1 ? "file" : "files"}, deleted ${changes.deletes.length}`)
    })

    /**
     * Reloads the config when its mtime changed, subscribes, then
     * regenerates. Subscribing first means a file created while the cycle
     * reads the documents is still seen. A config that fails to load is
     * reported and the previous one kept; the cycle still regenerates when
     * something besides the config changed.
     */
    const cycle = Effect.fnUntraced(function*(changed: ReadonlySet<string>) {
      const version = yield* configVersion
      if (version !== state.configVersion) {
        state.configVersion = version
        const loaded = yield* Effect.result(Cli.loadConfig(configPath, version))
        if (Result.isFailure(loaded)) {
          yield* Console.error(loaded.failure.message)
          if (!Array.from(changed).some((file) => file !== configPath)) return
        } else {
          useConfig(loaded.success)
        }
      }
      yield* subscribe
      yield* generate
    })

    yield* subscribe
    yield* generate

    const pending = new Set<string>()
    yield* Stream.fromQueue(events).pipe(
      Stream.tap((file) => Effect.sync(() => pending.add(file))),
      Stream.debounce(debounce),
      Stream.runForEach(() =>
        Effect.suspend(() => {
          const changed = new Set(pending)
          pending.clear()
          return cycle(changed)
        })
      )
    )
    return yield* Effect.never
  })

// -----------------------------------------------------------------------------
// FileSystem.watch
// -----------------------------------------------------------------------------

/** Directories the generator never reads documents from, so they aren't watched either. */
const isSkipped = (name: string): boolean => name.startsWith(".") || name === "node_modules"

/**
 * The `watch` option of {@link run} backed by `FileSystem.watch`, for the
 * CLI.
 *
 * A file is watched through its directory, so a file that doesn't exist yet,
 * or that an editor saves by renaming a new file over it, is still seen.
 *
 * A directory is watched one directory at a time rather than with
 * `recursive: true`: Node's recursive watcher on Linux keeps following the
 * old file after a rename-over save and misses every later edit. New
 * subdirectories are picked up as they appear, with a `Create` event for each
 * file already in them. `node_modules` and dot-directories are skipped.
 *
 * The stream ends when the watched directory is deleted, and fails when
 * watching fails for any other reason, e.g. when the system runs out of
 * inotify watches.
 */
export const fileSystemWatch = (fs: FileSystem.FileSystem, path: Path.Path) =>
(
  target: string
): Stream.Stream<FileSystem.WatchEvent, PlatformError.PlatformError> =>
  Stream.unwrap(Effect.gen(function*() {
    const isDirectory = yield* fs.stat(target).pipe(
      Effect.map((info) => info.type === "Directory"),
      Effect.orElseSucceed(() => false)
    )
    if (!isDirectory) {
      const name = path.basename(target)
      return watchDirectory(fs, path.dirname(target)).pipe(Stream.filter((event) => event.path === name))
    }
    return watchTree(fs, path, target)
  }))

/**
 * `FileSystem.watch` on one directory, ending when the directory is deleted.
 * Node doesn't end the watch then: it reports a rename of the directory's own
 * name and goes quiet. A failure while the directory still exists is passed
 * on, including a defect: Node throws `EACCES` and `ENOSPC` synchronously from
 * `fs.watch`.
 */
const watchDirectory = (
  fs: FileSystem.FileSystem,
  directory: string
): Stream.Stream<FileSystem.WatchEvent, PlatformError.PlatformError> => {
  const gone = fs.exists(directory).pipe(
    Effect.map((exists) => !exists),
    Effect.orElseSucceed(() => false)
  )
  return fs.watch(directory).pipe(
    Stream.takeUntilEffect((event) => event._tag === "Remove" ? gone : Effect.succeed(false)),
    Stream.catchCause((cause) => {
      if (Cause.hasInterruptsOnly(cause)) return Stream.failCause(cause)
      const failure = Cause.squash(cause)
      const error = PlatformError.isPlatformError(failure) ? failure : PlatformError.systemError({
        _tag: "Unknown",
        module: "FileSystem",
        method: "watch",
        pathOrDescriptor: directory,
        description: failure instanceof Error ? failure.message : String(failure),
        cause: failure
      })
      return Stream.unwrap(Effect.map(gone, (isGone) => isGone ? Stream.empty : Stream.fail(error)))
    })
  )
}

const watchTree = (
  fs: FileSystem.FileSystem,
  path: Path.Path,
  root: string
): Stream.Stream<FileSystem.WatchEvent, PlatformError.PlatformError> =>
  Stream.callback<FileSystem.WatchEvent, PlatformError.PlatformError>((queue) =>
    Effect.gen(function*() {
      const scope = yield* Effect.scope
      const watchers = new Map<string, Fiber.Fiber<void>>()
      const offer = (event: FileSystem.WatchEvent) =>
        Queue.offer(queue, { _tag: event._tag, path: path.relative(root, event.path) })

      /** Visits the subdirectories and files directly under `directory`. */
      const children = Effect.fnUntraced(function*(directory: string) {
        const entries = yield* fs.readDirectory(directory).pipe(Effect.orElseSucceed(() => []))
        const directories: Array<string> = []
        const files: Array<string> = []
        for (const entry of entries) {
          const absolute = path.join(directory, entry)
          const info = yield* fs.stat(absolute).pipe(Effect.option)
          if (Option.isNone(info)) continue
          if (info.value.type === "Directory") {
            if (!isSkipped(entry)) directories.push(absolute)
          } else {
            files.push(absolute)
          }
        }
        return { directories, files }
      })

      /**
       * Watches `directory` and everything under it; `announce` reports its
       * files as created. Deleting the root ends the stream; a watch that
       * fails takes the whole stream down with it.
       */
      const add = (directory: string, announce: boolean): Effect.Effect<void> =>
        Effect.gen(function*() {
          if (watchers.has(directory)) return
          const fiber = yield* watchDirectory(fs, directory).pipe(
            Stream.runForEach((event) => handle(directory, event)),
            Effect.matchEffect({
              onFailure: (error) => Queue.fail(queue, error),
              onSuccess: () => directory === root ? Queue.end(queue) : Effect.void
            }),
            Effect.asVoid,
            Effect.ensuring(Effect.sync(() => watchers.delete(directory))),
            Effect.forkIn(scope)
          )
          watchers.set(directory, fiber)
          const found = yield* children(directory)
          if (announce) {
            for (const file of found.files) yield* offer({ _tag: "Create", path: file })
          }
          for (const child of found.directories) yield* add(child, announce)
        })

      /** Stops watching `directory` and everything under it. */
      const remove = (directory: string) =>
        Effect.forEach(
          Array.from(watchers).filter(([watched]) => watched === directory || watched.startsWith(directory + path.sep)),
          ([, fiber]) => Fiber.interrupt(fiber),
          { discard: true }
        )

      const handle = (directory: string, event: FileSystem.WatchEvent): Effect.Effect<void> =>
        Effect.gen(function*() {
          const absolute = path.join(directory, event.path)
          yield* offer({ _tag: event._tag, path: absolute })
          if (event._tag === "Remove") return yield* remove(absolute)
          if (event._tag !== "Create" || isSkipped(path.basename(absolute))) return
          const info = yield* fs.stat(absolute).pipe(Effect.option)
          if (Option.isNone(info) || info.value.type !== "Directory") return
          // A directory deleted and created again may still have its old watcher.
          yield* remove(absolute)
          yield* add(absolute, true)
        })

      yield* add(root, false)
    })
  )
