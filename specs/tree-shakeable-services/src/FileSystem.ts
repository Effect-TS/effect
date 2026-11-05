/**
 * The contract of a file system, one operation per export.
 *
 * This module is the "service" from the consumer's point of view: a program
 * writes `FileSystem.readFile(path)` after `import * as FileSystem`. It holds
 * keys only, no implementations, so importing it costs nothing a bundler
 * cannot drop, and a key the bundler keeps costs a few bytes.
 *
 * The record's interface is declared first, as a record service declares it
 * today; each operation then takes its shape from one member and is declared
 * once, the key as the one call argument. There are no purity annotations in
 * this file; the
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

/**
 * The record of implementations, as `yield* FileSystem` returns it and as
 * `Layer.succeed(FileSystem, record)` takes it: the interface a record service
 * declares today. Each operation below takes its shape from one member, so a
 * member's type is written once, and diagnostics about the record print
 * `Shape` and name the members it lacks.
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

export const access = Context.Operation<Shape["access"]>()("effect/FileSystem/access")

export const chmod = Context.Operation<Shape["chmod"]>()("effect/FileSystem/chmod")

export const chown = Context.Operation<Shape["chown"]>()("effect/FileSystem/chown")

export const copy = Context.Operation<Shape["copy"]>()("effect/FileSystem/copy")

export const copyFile = Context.Operation<Shape["copyFile"]>()("effect/FileSystem/copyFile")

export const exists = Context.Operation<Shape["exists"]>()("effect/FileSystem/exists")

export const glob = Stream.Operation<Shape["glob"]>()("effect/FileSystem/glob")

export const link = Context.Operation<Shape["link"]>()("effect/FileSystem/link")

export const lstat = Context.Operation<Shape["lstat"]>()("effect/FileSystem/lstat")

export const makeDirectory = Context.Operation<Shape["makeDirectory"]>()("effect/FileSystem/makeDirectory")

export const makeTempDirectory = Context.Operation<Shape["makeTempDirectory"]>()("effect/FileSystem/makeTempDirectory")

export const makeTempDirectoryScoped = Context.Operation<Shape["makeTempDirectoryScoped"]>()(
  "effect/FileSystem/makeTempDirectoryScoped"
)

export const makeTempFile = Context.Operation<Shape["makeTempFile"]>()("effect/FileSystem/makeTempFile")

export const makeTempFileScoped = Context.Operation<Shape["makeTempFileScoped"]>()(
  "effect/FileSystem/makeTempFileScoped"
)

export const readDirectory = Context.Operation<Shape["readDirectory"]>()("effect/FileSystem/readDirectory")

export const readDirectoryEntries = Context.Operation<Shape["readDirectoryEntries"]>()(
  "effect/FileSystem/readDirectoryEntries"
)

export const readFile = Context.Operation<Shape["readFile"]>()("effect/FileSystem/readFile")

export const readFileString = Context.Operation<Shape["readFileString"]>()("effect/FileSystem/readFileString")

export const readLink = Context.Operation<Shape["readLink"]>()("effect/FileSystem/readLink")

export const realPath = Context.Operation<Shape["realPath"]>()("effect/FileSystem/realPath")

export const remove = Context.Operation<Shape["remove"]>()("effect/FileSystem/remove")

export const rename = Context.Operation<Shape["rename"]>()("effect/FileSystem/rename")

export const stat = Context.Operation<Shape["stat"]>()("effect/FileSystem/stat")

export const stream = Stream.Operation<Shape["stream"]>()("effect/FileSystem/stream")

export const symlink = Context.Operation<Shape["symlink"]>()("effect/FileSystem/symlink")

export const truncate = Context.Operation<Shape["truncate"]>()("effect/FileSystem/truncate")

export const utimes = Context.Operation<Shape["utimes"]>()("effect/FileSystem/utimes")

export const watch = Stream.Operation<Shape["watch"]>()("effect/FileSystem/watch")

export const writeFile = Context.Operation<Shape["writeFile"]>()("effect/FileSystem/writeFile")

export const writeFileString = Context.Operation<Shape["writeFileString"]>()("effect/FileSystem/writeFileString")

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
 * The file system as one record service. It is an ordinary `Context.Service`
 * stored one slot per operation beside the record: `Layer.succeed(FileSystem,
 * record)` provides all thirty operations, `yield* FileSystem` reads the
 * record back, and `Effect.provideService(readFile, fake)` on top of either
 * replaces one of them.
 */
export const FileSystem = Context.Operations<FileSystem, Shape>()("effect/FileSystem", members)

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
 * The record of a read-only file system's implementations: three members of
 * `Shape`, declared directly so diagnostics name them.
 */
export interface ReadOnlyShape {
  readonly exists: Shape["exists"]
  readonly readFile: Shape["readFile"]
  readonly stat: Shape["stat"]
}

/**
 * The read-only file system as a record service.
 */
export const ReadOnly = Context.Operations<ReadOnly, ReadOnlyShape>()("effect/FileSystem/ReadOnly", readOnlyMembers)
