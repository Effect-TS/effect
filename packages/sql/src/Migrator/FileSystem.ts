/**
 * @since 1.0.0
 */
import { FileSystem } from "@effect/platform/FileSystem"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import type { Loader, ResolvedMigration } from "../Migrator.js"
import { MigrationError } from "../Migrator.js"

/**
 * @since 1.0.0
 * @category loaders
 */
export const fromFileSystem = (directory: string): Loader<FileSystem> =>
  FileSystem.pipe(
    Effect.flatMap((FS) => FS.readDirectory(directory)),
    Effect.mapError((error) => new MigrationError({ reason: "failed", message: error.message })),
    Effect.map((files): ReadonlyArray<ResolvedMigration> =>
      files
        .map((file) => Option.fromNullable(file.match(/^(?:.*\/)?(\d+)_([^.]+)\.(js|ts)$/)))
        .flatMap(
          Option.match({
            onNone: () => [],
            onSome: ([basename, id, name]): ReadonlyArray<ResolvedMigration> =>
              [
                [
                  Number(id),
                  name,
                  Effect.promise(
                    () =>
                      import(
                        /* @vite-ignore */
                        /* webpackIgnore: true */
                        `${directory}/${basename}`
                      )
                  )
                ]
              ] as const
          })
        )
        .sort(([a], [b]) => a - b)
    )
  )
