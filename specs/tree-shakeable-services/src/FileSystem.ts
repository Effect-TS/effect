/**
 * The contract of a file system, one operation per export.
 *
 * This module is the "service" from the consumer's point of view: a program
 * writes `FileSystem.readFile(path)` after `import * as FileSystem`. It holds
 * keys only, no implementations, so importing it costs nothing a bundler
 * cannot drop.
 *
 * Each operation is declared the way `effect` declares every key: the type on
 * the declaration, the key as the one argument. The `@__PURE__` annotations
 * are for esbuild, which does not read the `@__NO_SIDE_EFFECTS__` annotation
 * on the constructors across modules; Rolldown and Rollup drop unused keys
 * without them, and the published `effect` build adds them. The bundle check
 * measures all three cases.
 *
 * The operation names and signatures follow `effect/FileSystem` in v4 so the
 * example is representative of a real service (30 operations, three of which
 * return Streams and two of which need a Scope). Operations returning a
 * Stream are defined with `Stream.Operation`; the rest with
 * `Context.Operation`.
 *
 * `FileSystem`, at the end, is the record service: one key whose members are
 * the operations above, stored one slot each. `yield* FileSystem` gives the
 * record of implementations and `Layer<FileSystem>` provides every operation.
 * `ReadOnly` is a record over three of the same members: the subset a reader
 * names as its one requirement.
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

export const access: Context.Operation<
  "effect/FileSystem/access",
  (
    path: string,
    options?: { readonly writable?: boolean; readonly readable?: boolean }
  ) => Effect.Effect<void, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/access")

export const chmod: Context.Operation<
  "effect/FileSystem/chmod",
  (path: string, mode: number) => Effect.Effect<void, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/chmod")

export const chown: Context.Operation<
  "effect/FileSystem/chown",
  (path: string, uid: number, gid: number) => Effect.Effect<void, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/chown")

export const copy: Context.Operation<
  "effect/FileSystem/copy",
  (from: string, to: string, options?: { readonly overwrite?: boolean }) => Effect.Effect<void, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/copy")

export const copyFile: Context.Operation<
  "effect/FileSystem/copyFile",
  (from: string, to: string) => Effect.Effect<void, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/copyFile")

export const exists: Context.Operation<
  "effect/FileSystem/exists",
  (path: string) => Effect.Effect<boolean, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/exists")

export const glob: Stream.Operation<
  "effect/FileSystem/glob",
  (pattern: string, options?: { readonly cwd?: string }) => Stream.Stream<string, FileSystemError>
> = /* @__PURE__ */ Stream.Operation("effect/FileSystem/glob")

export const link: Context.Operation<
  "effect/FileSystem/link",
  (from: string, to: string) => Effect.Effect<void, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/link")

export const lstat: Context.Operation<
  "effect/FileSystem/lstat",
  (path: string) => Effect.Effect<Info, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/lstat")

export const makeDirectory: Context.Operation<
  "effect/FileSystem/makeDirectory",
  (path: string, options?: { readonly recursive?: boolean }) => Effect.Effect<void, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/makeDirectory")

export const makeTempDirectory: Context.Operation<
  "effect/FileSystem/makeTempDirectory",
  (options?: { readonly prefix?: string }) => Effect.Effect<string, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/makeTempDirectory")

export const makeTempDirectoryScoped: Context.Operation<
  "effect/FileSystem/makeTempDirectoryScoped",
  (options?: { readonly prefix?: string }) => Effect.Effect<string, FileSystemError, Scope.Scope>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/makeTempDirectoryScoped")

export const makeTempFile: Context.Operation<
  "effect/FileSystem/makeTempFile",
  (options?: { readonly prefix?: string }) => Effect.Effect<string, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/makeTempFile")

export const makeTempFileScoped: Context.Operation<
  "effect/FileSystem/makeTempFileScoped",
  (options?: { readonly prefix?: string }) => Effect.Effect<string, FileSystemError, Scope.Scope>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/makeTempFileScoped")

export const readDirectory: Context.Operation<
  "effect/FileSystem/readDirectory",
  (path: string) => Effect.Effect<ReadonlyArray<string>, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/readDirectory")

export const readDirectoryEntries: Context.Operation<
  "effect/FileSystem/readDirectoryEntries",
  (path: string) => Effect.Effect<ReadonlyArray<DirectoryEntry>, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/readDirectoryEntries")

export const readFile: Context.Operation<
  "effect/FileSystem/readFile",
  (path: string) => Effect.Effect<Uint8Array, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/readFile")

export const readFileString: Context.Operation<
  "effect/FileSystem/readFileString",
  (path: string, encoding?: BufferEncoding) => Effect.Effect<string, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/readFileString")

export const readLink: Context.Operation<
  "effect/FileSystem/readLink",
  (path: string) => Effect.Effect<string, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/readLink")

export const realPath: Context.Operation<
  "effect/FileSystem/realPath",
  (path: string) => Effect.Effect<string, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/realPath")

export const remove: Context.Operation<
  "effect/FileSystem/remove",
  (
    path: string,
    options?: { readonly recursive?: boolean; readonly force?: boolean }
  ) => Effect.Effect<void, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/remove")

export const rename: Context.Operation<
  "effect/FileSystem/rename",
  (from: string, to: string) => Effect.Effect<void, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/rename")

export const stat: Context.Operation<
  "effect/FileSystem/stat",
  (path: string) => Effect.Effect<Info, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/stat")

export const stream: Stream.Operation<
  "effect/FileSystem/stream",
  (path: string, options?: { readonly chunkSize?: number }) => Stream.Stream<Uint8Array, FileSystemError>
> = /* @__PURE__ */ Stream.Operation("effect/FileSystem/stream")

export const symlink: Context.Operation<
  "effect/FileSystem/symlink",
  (target: string, path: string) => Effect.Effect<void, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/symlink")

export const truncate: Context.Operation<
  "effect/FileSystem/truncate",
  (path: string, length?: number) => Effect.Effect<void, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/truncate")

export const utimes: Context.Operation<
  "effect/FileSystem/utimes",
  (path: string, atime: Date, mtime: Date) => Effect.Effect<void, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/utimes")

export const watch: Stream.Operation<
  "effect/FileSystem/watch",
  (path: string) => Stream.Stream<WatchEvent, FileSystemError>
> = /* @__PURE__ */ Stream.Operation("effect/FileSystem/watch")

export const writeFile: Context.Operation<
  "effect/FileSystem/writeFile",
  (path: string, data: Uint8Array, options?: { readonly mode?: number }) => Effect.Effect<void, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/writeFile")

export const writeFileString: Context.Operation<
  "effect/FileSystem/writeFileString",
  (path: string, data: string) => Effect.Effect<void, FileSystemError>
> = /* @__PURE__ */ Context.Operation("effect/FileSystem/writeFileString")

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
 * stored one slot per operation: `Layer.succeed(FileSystem, record)` provides
 * all thirty operations, `yield* FileSystem` reads all thirty back as a
 * record, and `Effect.provideService(readFile.service, fake)` on top of either
 * replaces one of them.
 */
export const FileSystem: Context.Operations<FileSystem, Shape> = /* @__PURE__ */ Context.Operations(
  "effect/FileSystem",
  members
)

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
export const ReadOnly: Context.Operations<ReadOnly, ReadOnlyShape> = /* @__PURE__ */ Context.Operations(
  "effect/FileSystem/ReadOnly",
  readOnlyMembers
)
