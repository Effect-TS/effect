/**
 * The contract of a file system, one operation per export.
 *
 * This module is the "service" from the consumer's point of view: a program
 * writes `FileSystem.readFile(path)` after `import * as FileSystem`. It holds
 * keys only, no implementations, so importing it costs nothing a bundler
 * cannot drop, and a key the bundler keeps costs a few bytes.
 *
 * Each operation is declared once: the shape as the type argument, the key as
 * the one call argument. There are no purity annotations in this file; the
 * bundle check measures what that costs (nothing a program notices) and what
 * annotations, or the published build's `annotate-pure-calls` pass, recover.
 *
 * The operation names and signatures follow `effect/FileSystem` in v4 so the
 * example is representative of a real service (30 operations, three of which
 * return Streams and two of which need a Scope). Operations returning a
 * Stream are defined with `Stream.Operation`; the rest with
 * `Context.Operation`.
 *
 * `FileSystem`, at the end, is the record service: one key whose members are
 * the operations above, stored one slot each beside the record. `yield*
 * FileSystem` gives the record of implementations and `Layer<FileSystem>`
 * provides every operation. `ReadOnly` is a record over three of the same
 * members: the subset a reader names as its one requirement.
 */
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import type * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"

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

export const access = Context.Operation<
  (
    path: string,
    options?: { readonly writable?: boolean; readonly readable?: boolean }
  ) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/access")

export const chmod = Context.Operation<
  (path: string, mode: number) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/chmod")

export const chown = Context.Operation<
  (path: string, uid: number, gid: number) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/chown")

export const copy = Context.Operation<
  (from: string, to: string, options?: { readonly overwrite?: boolean }) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/copy")

export const copyFile = Context.Operation<
  (from: string, to: string) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/copyFile")

export const exists = Context.Operation<
  (path: string) => Effect.Effect<boolean, FileSystemError>
>()("effect/FileSystem/exists")

export const glob = Stream.Operation<
  (pattern: string, options?: { readonly cwd?: string }) => Stream.Stream<string, FileSystemError>
>()("effect/FileSystem/glob")

export const link = Context.Operation<
  (from: string, to: string) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/link")

export const lstat = Context.Operation<
  (path: string) => Effect.Effect<Info, FileSystemError>
>()("effect/FileSystem/lstat")

export const makeDirectory = Context.Operation<
  (path: string, options?: { readonly recursive?: boolean }) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/makeDirectory")

export const makeTempDirectory = Context.Operation<
  (options?: { readonly prefix?: string }) => Effect.Effect<string, FileSystemError>
>()("effect/FileSystem/makeTempDirectory")

export const makeTempDirectoryScoped = Context.Operation<
  (options?: { readonly prefix?: string }) => Effect.Effect<string, FileSystemError, Scope.Scope>
>()("effect/FileSystem/makeTempDirectoryScoped")

export const makeTempFile = Context.Operation<
  (options?: { readonly prefix?: string }) => Effect.Effect<string, FileSystemError>
>()("effect/FileSystem/makeTempFile")

export const makeTempFileScoped = Context.Operation<
  (options?: { readonly prefix?: string }) => Effect.Effect<string, FileSystemError, Scope.Scope>
>()("effect/FileSystem/makeTempFileScoped")

export const readDirectory = Context.Operation<
  (path: string) => Effect.Effect<ReadonlyArray<string>, FileSystemError>
>()("effect/FileSystem/readDirectory")

export const readDirectoryEntries = Context.Operation<
  (path: string) => Effect.Effect<ReadonlyArray<DirectoryEntry>, FileSystemError>
>()("effect/FileSystem/readDirectoryEntries")

export const readFile = Context.Operation<
  (path: string) => Effect.Effect<Uint8Array, FileSystemError>
>()("effect/FileSystem/readFile")

export const readFileString = Context.Operation<
  (path: string, encoding?: BufferEncoding) => Effect.Effect<string, FileSystemError>
>()("effect/FileSystem/readFileString")

export const readLink = Context.Operation<
  (path: string) => Effect.Effect<string, FileSystemError>
>()("effect/FileSystem/readLink")

export const realPath = Context.Operation<
  (path: string) => Effect.Effect<string, FileSystemError>
>()("effect/FileSystem/realPath")

export const remove = Context.Operation<
  (
    path: string,
    options?: { readonly recursive?: boolean; readonly force?: boolean }
  ) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/remove")

export const rename = Context.Operation<
  (from: string, to: string) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/rename")

export const stat = Context.Operation<
  (path: string) => Effect.Effect<Info, FileSystemError>
>()("effect/FileSystem/stat")

export const stream = Stream.Operation<
  (path: string, options?: { readonly chunkSize?: number }) => Stream.Stream<Uint8Array, FileSystemError>
>()("effect/FileSystem/stream")

export const symlink = Context.Operation<
  (target: string, path: string) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/symlink")

export const truncate = Context.Operation<
  (path: string, length?: number) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/truncate")

export const utimes = Context.Operation<
  (path: string, atime: Date, mtime: Date) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/utimes")

export const watch = Stream.Operation<
  (path: string) => Stream.Stream<WatchEvent, FileSystemError>
>()("effect/FileSystem/watch")

export const writeFile = Context.Operation<
  (path: string, data: Uint8Array, options?: { readonly mode?: number }) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/writeFile")

export const writeFileString = Context.Operation<
  (path: string, data: string) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/writeFileString")

const members = {
  access,
  chmod,
  chown,
  copy,
  copyFile,
  exists,
  glob,
  link,
  lstat,
  makeDirectory,
  makeTempDirectory,
  makeTempDirectoryScoped,
  makeTempFile,
  makeTempFileScoped,
  readDirectory,
  readDirectoryEntries,
  readFile,
  readFileString,
  readLink,
  realPath,
  remove,
  rename,
  stat,
  stream,
  symlink,
  truncate,
  utimes,
  watch,
  writeFile,
  writeFileString
}

/**
 * The identity of the whole file system: the union of its members' keys.
 * A program annotated with this requires every operation; a layer typed with
 * it provides every operation.
 */
export type FileSystem = Context.Operations.Identifier<typeof members>

/**
 * The record of implementations, as `yield* FileSystem` returns it and as
 * `Layer.succeed(FileSystem, record)` takes it. An interface rather than a
 * type alias so that diagnostics print `Shape` instead of the thirty members.
 */
export interface Shape extends Context.Operations.Shape<typeof members> {}

/**
 * The file system as one record service. It is an ordinary `Context.Service`
 * stored one slot per operation beside the record: `Layer.succeed(FileSystem,
 * record)` provides all thirty operations, `yield* FileSystem` reads the
 * record back, and `Effect.provideService(readFile, fake)` on top of either
 * replaces one of them.
 */
export const FileSystem: Context.Operations<FileSystem, Shape> = Context.Operations("effect/FileSystem", members)

const readOnlyMembers = { exists, readFile, stat }

/**
 * The read-only subset: a record service over three of the members above.
 * Nothing distinguishes it from `FileSystem` except which members it lists,
 * so a `Layer<FileSystem>` satisfies it, the three member layers merged
 * satisfy it, and it satisfies each of its members, all by plain
 * assignability. A reader annotates its requirement with this one name.
 */
export type ReadOnly = Context.Operations.Identifier<typeof readOnlyMembers>

/**
 * The record of a read-only file system's implementations.
 */
export interface ReadOnlyShape extends Context.Operations.Shape<typeof readOnlyMembers> {}

/**
 * The read-only file system as a record service.
 */
export const ReadOnly: Context.Operations<ReadOnly, ReadOnlyShape> = Context.Operations(
  "effect/FileSystem/ReadOnly",
  readOnlyMembers
)
