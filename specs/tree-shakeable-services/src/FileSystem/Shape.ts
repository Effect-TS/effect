/**
 * The types of the file system contract: its error, its data, and `Shape`, the
 * record of implementations as `yield* FileSystem` returns it and as
 * `Layer.succeed(FileSystem, record)` takes it. Each operation in
 * `./operations.ts` takes its shape from one member, so a member's type is
 * written once, and diagnostics about the record print `Shape` and name the
 * members it lacks.
 */
import * as Data from "effect/Data"
import type * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import type * as Stream from "effect/Stream"

export class FileSystemError extends Data.TaggedError("FileSystemError")<{
  readonly operation: string
  readonly cause: unknown
}> {}

export interface Info {
  readonly type: "File" | "Directory" | "SymbolicLink" | "Other"
  readonly size: number
  readonly mtime: Date
}

export interface DirectoryEntry {
  readonly name: string
  readonly type: Info["type"]
}

export interface WatchEvent {
  readonly kind: "Create" | "Update" | "Remove"
  readonly path: string
}

/**
 * The record of implementations: the interface a record service declares today.
 */
export interface Shape {
  readonly access: (
    path: string,
    options?: { readonly writable?: boolean; readonly readable?: boolean }
  ) => Effect.Effect<void, FileSystemError>
  readonly chmod: (path: string, mode: number) => Effect.Effect<void, FileSystemError>
  readonly chown: (path: string, uid: number, gid: number) => Effect.Effect<void, FileSystemError>
  readonly copy: (
    from: string,
    to: string,
    options?: { readonly overwrite?: boolean }
  ) => Effect.Effect<void, FileSystemError>
  readonly copyFile: (from: string, to: string) => Effect.Effect<void, FileSystemError>
  readonly exists: (path: string) => Effect.Effect<boolean, FileSystemError>
  readonly glob: (pattern: string, options?: { readonly cwd?: string }) => Stream.Stream<string, FileSystemError>
  readonly link: (from: string, to: string) => Effect.Effect<void, FileSystemError>
  readonly lstat: (path: string) => Effect.Effect<Info, FileSystemError>
  readonly makeDirectory: (
    path: string,
    options?: { readonly recursive?: boolean }
  ) => Effect.Effect<void, FileSystemError>
  readonly makeTempDirectory: (options?: { readonly prefix?: string }) => Effect.Effect<string, FileSystemError>
  readonly makeTempDirectoryScoped: (
    options?: { readonly prefix?: string }
  ) => Effect.Effect<string, FileSystemError, Scope.Scope>
  readonly makeTempFile: (options?: { readonly prefix?: string }) => Effect.Effect<string, FileSystemError>
  readonly makeTempFileScoped: (
    options?: { readonly prefix?: string }
  ) => Effect.Effect<string, FileSystemError, Scope.Scope>
  readonly readDirectory: (path: string) => Effect.Effect<ReadonlyArray<string>, FileSystemError>
  readonly readDirectoryEntries: (path: string) => Effect.Effect<ReadonlyArray<DirectoryEntry>, FileSystemError>
  readonly readFile: (path: string) => Effect.Effect<Uint8Array, FileSystemError>
  readonly readFileString: (path: string, encoding?: BufferEncoding) => Effect.Effect<string, FileSystemError>
  readonly readLink: (path: string) => Effect.Effect<string, FileSystemError>
  readonly realPath: (path: string) => Effect.Effect<string, FileSystemError>
  readonly remove: (
    path: string,
    options?: { readonly recursive?: boolean; readonly force?: boolean }
  ) => Effect.Effect<void, FileSystemError>
  readonly rename: (from: string, to: string) => Effect.Effect<void, FileSystemError>
  readonly stat: (path: string) => Effect.Effect<Info, FileSystemError>
  readonly stream: (
    path: string,
    options?: { readonly chunkSize?: number }
  ) => Stream.Stream<Uint8Array, FileSystemError>
  readonly symlink: (target: string, path: string) => Effect.Effect<void, FileSystemError>
  readonly truncate: (path: string, length?: number) => Effect.Effect<void, FileSystemError>
  readonly utimes: (path: string, atime: Date, mtime: Date) => Effect.Effect<void, FileSystemError>
  readonly watch: (path: string) => Stream.Stream<WatchEvent, FileSystemError>
  readonly writeFile: (
    path: string,
    data: Uint8Array,
    options?: { readonly mode?: number }
  ) => Effect.Effect<void, FileSystemError>
  readonly writeFileString: (path: string, data: string) => Effect.Effect<void, FileSystemError>
}
