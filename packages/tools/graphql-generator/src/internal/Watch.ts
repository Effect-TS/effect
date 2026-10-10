/**
 * The `graphqlgen --watch` loop (EFF-1834 points 14 to 17).
 *
 * The loop runs over the event streams `options.watch` returns, so tests can
 * inject events and the CLI plugs in `FileSystem.watch`.
 *
 * @internal
 */
import * as Effect from "effect/Effect"
import type * as FileSystem from "effect/FileSystem"
import type * as Path from "effect/Path"
import type { PlatformError } from "effect/PlatformError"
import type * as Stream from "effect/Stream"
import type { ConfigLoadError } from "../main.ts"

export interface WatchOptions {
  /** The config file, as an absolute path. */
  readonly configPath: string
  /**
   * Watches a file, or a directory and everything under it, with
   * `FileSystem.watch` semantics: each event's `path` is relative to the
   * watched directory, or to a watched file's directory.
   *
   * The loop subscribes to the config file, the schema file and the static
   * prefix of each `documents` glob before it runs a cycle, and subscribes
   * again when a config edit changes those paths.
   */
  readonly watch: (path: string) => Stream.Stream<FileSystem.WatchEvent, PlatformError>
}

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
 * Fails with `ConfigLoadError` only when the config can't be loaded at
 * startup; otherwise it runs until interrupted.
 */
export const run = (
  _options: WatchOptions
): Effect.Effect<never, ConfigLoadError, FileSystem.FileSystem | Path.Path> =>
  Effect.die("graphqlgen --watch is not implemented yet")
