/**
 * Loads SQL migrations by reading a directory.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Effect from "../Effect.ts"
import { FileSystem } from "../FileSystem.ts"
import * as Option from "../Option.ts"
import { Path } from "../Path.ts"
import { type Loader, MigrationError, type ResolvedMigration } from "./Migrator.ts"

// separate file on purpose. metro parses a dynamic import even when you only
// import fromRecord, and that blew up react native.

/**
 * Creates a migration loader that reads a directory with `FileSystem`, imports
 * files named `<id>_<name>.js`, `<id>_<name>.ts`,
 * `<id>_<name>.mjs`, or `<id>_<name>.mts`, and sorts migrations by id.
 *
 * **Details**
 *
 * Requires a `Path` service appropriate for the migration directory's path
 * syntax. On Windows, prefer a platform-aware implementation such as
 * `NodePath.layer`; the core `Path.layer` uses POSIX semantics and does not
 * preserve Windows drive-letter paths.
 *
 * @stability unstable
 * @category loaders
 * @since 4.0.0
 */
export const fromFileSystem: (directory: string) => Loader<FileSystem | Path> = Effect.fnUntraced(function*(directory) {
  const Fs = yield* FileSystem
  const path = yield* Path
  const files = yield* Effect.mapError(
    Fs.readDirectory(directory),
    (cause) =>
      new MigrationError({
        kind: "Failed",
        cause,
        message: "Failed to read migrations directory"
      })
  )
  return files
    .map((file) => Option.fromNullishOr(file.match(/^(?:.*\/)?(\d+)_([^.]+)\.(js|ts|mjs|mts)$/)))
    .flatMap(
      Option.match({
        onNone: () => [],
        onSome: ([basename, id, name]): ReadonlyArray<ResolvedMigration> =>
          [
            [
              Number(id),
              name,
              // windows paths need a file url or the loader rejects them.
              // orDie so a bad url shows up as an import error later.
              Effect.flatMap(Effect.orDie(path.toFileUrl(path.join(directory, basename))), (url) =>
                Effect.promise(() =>
                  import(
                    /* @vite-ignore */
                    /* webpackIgnore: true */
                    url.href
                  )
                ))
            ]
          ] as const
      })
    )
    .sort(([a], [b]) => a - b)
})
