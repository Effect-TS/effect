// Reading config files: an `etest.config.ts` is imported and its default export decoded with the
// `Test.Config` Schema into plain values (`Loaded`). A config that doesn't load or doesn't decode
// is a `ConfigError` with the reason; an unknown key is an error, never silently ignored. What
// the values mean for a run (projects, cascading defaults) is Workspace.ts.
import * as Data from "effect/Data"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as fs from "node:fs"
import * as path from "node:path"
import { pathToFileURL } from "node:url"
import * as Test from "../Test.ts"

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

/** A decoded config's values, as the workspace uses them. */
const loaded = (file: string, config: typeof Test.Config.Type): Loaded => ({
  file,
  paths: config.paths,
  exclude: config.exclude ?? [],
  workers: config.workers,
  defaults: {
    timeoutMs: config.defaults?.timeout !== undefined ? Duration.toMillis(config.defaults.timeout) : undefined,
    retries: config.defaults?.retries
  },
  shared: config.shared?.length ?? 0
})

/** No config: every value unset. */
export const none: Loaded = {
  file: undefined,
  paths: undefined,
  exclude: [],
  workers: undefined,
  defaults: {},
  shared: 0
}

/**
 * Loads one config file (absolute) and decodes its default export with `Test.Config`, naming it
 * in errors relative to `shownFrom`. It is imported afresh whenever the file changed, so a
 * long-running `etest serve` sees edits (modules the config imports are not re-imported;
 * executors are fresh every run).
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
    Effect.flatMap((mod) =>
      Test.decodeConfig(mod.default).pipe(
        Effect.mapError((error) => new ConfigError({ message: `${shown}: ${error.message}` }))
      )
    ),
    Effect.map((config) => loaded(file, config))
  )
}
