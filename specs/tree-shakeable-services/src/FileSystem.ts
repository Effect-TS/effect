/**
 * The contract of a file system, one operation per export.
 *
 * This module is the "service" from the consumer's point of view: a program
 * writes `FileSystem.readFile(path)` after `import * as FileSystem`. It holds
 * keys only, no implementations, so importing it costs nothing a bundler
 * cannot drop. The `@__PURE__` annotations let a bundler remove the keys of
 * operations a program never references; without them each unused key stays
 * as a few bytes of key object, and the implementations are still absent.
 *
 * The operation names and signatures follow `effect/FileSystem` in v4 so the
 * example is representative of a real service (30 operations, three of which
 * return Streams and two of which need a Scope). Operations returning a
 * Stream are defined with `Stream.Operation`; the rest with
 * `Context.Operation`.
 *
 * The group at the end, `FileSystem`, is the record service: one key whose
 * members are the operations above, stored one slot each. `yield* FileSystem`
 * gives the record of implementations and `Layer<FileSystem>` provides every
 * operation.
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

export const access = /* @__PURE__ */ Context.Operation<
  (
    path: string,
    options?: { readonly writable?: boolean; readonly readable?: boolean }
  ) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/access")

export const chmod = /* @__PURE__ */ Context.Operation<
  (path: string, mode: number) => Effect.Effect<void, FileSystemError>
>()(
  "effect/FileSystem/chmod"
)

export const chown = /* @__PURE__ */ Context.Operation<
  (path: string, uid: number, gid: number) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/chown")

export const copy = /* @__PURE__ */ Context.Operation<
  (from: string, to: string, options?: { readonly overwrite?: boolean }) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/copy")

export const copyFile = /* @__PURE__ */ Context.Operation<
  (from: string, to: string) => Effect.Effect<void, FileSystemError>
>()(
  "effect/FileSystem/copyFile"
)

export const exists = /* @__PURE__ */ Context.Operation<(path: string) => Effect.Effect<boolean, FileSystemError>>()(
  "effect/FileSystem/exists"
)

export const glob = /* @__PURE__ */ Stream.Operation<
  (pattern: string, options?: { readonly cwd?: string }) => Stream.Stream<string, FileSystemError>
>()("effect/FileSystem/glob")

export const link = /* @__PURE__ */ Context.Operation<
  (from: string, to: string) => Effect.Effect<void, FileSystemError>
>()(
  "effect/FileSystem/link"
)

export const lstat = /* @__PURE__ */ Context.Operation<(path: string) => Effect.Effect<Info, FileSystemError>>()(
  "effect/FileSystem/lstat"
)

export const makeDirectory = /* @__PURE__ */ Context.Operation<
  (path: string, options?: { readonly recursive?: boolean }) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/makeDirectory")

export const makeTempDirectory = /* @__PURE__ */ Context.Operation<
  (options?: { readonly prefix?: string }) => Effect.Effect<string, FileSystemError>
>()("effect/FileSystem/makeTempDirectory")

export const makeTempDirectoryScoped = /* @__PURE__ */ Context.Operation<
  (options?: { readonly prefix?: string }) => Effect.Effect<string, FileSystemError, Scope.Scope>
>()("effect/FileSystem/makeTempDirectoryScoped")

export const makeTempFile = /* @__PURE__ */ Context.Operation<
  (options?: { readonly prefix?: string }) => Effect.Effect<string, FileSystemError>
>()("effect/FileSystem/makeTempFile")

export const makeTempFileScoped = /* @__PURE__ */ Context.Operation<
  (options?: { readonly prefix?: string }) => Effect.Effect<string, FileSystemError, Scope.Scope>
>()("effect/FileSystem/makeTempFileScoped")

export const readDirectory = /* @__PURE__ */ Context.Operation<
  (path: string) => Effect.Effect<ReadonlyArray<string>, FileSystemError>
>()("effect/FileSystem/readDirectory")

export const readDirectoryEntries = /* @__PURE__ */ Context.Operation<
  (path: string) => Effect.Effect<ReadonlyArray<DirectoryEntry>, FileSystemError>
>()("effect/FileSystem/readDirectoryEntries")

export const readFile = /* @__PURE__ */ Context.Operation<
  (path: string) => Effect.Effect<Uint8Array, FileSystemError>
>()(
  "effect/FileSystem/readFile"
)

export const readFileString = /* @__PURE__ */ Context.Operation<
  (path: string, encoding?: BufferEncoding) => Effect.Effect<string, FileSystemError>
>()("effect/FileSystem/readFileString")

export const readLink = /* @__PURE__ */ Context.Operation<(path: string) => Effect.Effect<string, FileSystemError>>()(
  "effect/FileSystem/readLink"
)

export const realPath = /* @__PURE__ */ Context.Operation<(path: string) => Effect.Effect<string, FileSystemError>>()(
  "effect/FileSystem/realPath"
)

export const remove = /* @__PURE__ */ Context.Operation<
  (
    path: string,
    options?: { readonly recursive?: boolean; readonly force?: boolean }
  ) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/remove")

export const rename = /* @__PURE__ */ Context.Operation<
  (from: string, to: string) => Effect.Effect<void, FileSystemError>
>()(
  "effect/FileSystem/rename"
)

export const stat = /* @__PURE__ */ Context.Operation<(path: string) => Effect.Effect<Info, FileSystemError>>()(
  "effect/FileSystem/stat"
)

export const stream = /* @__PURE__ */ Stream.Operation<
  (path: string, options?: { readonly chunkSize?: number }) => Stream.Stream<Uint8Array, FileSystemError>
>()("effect/FileSystem/stream")

export const symlink = /* @__PURE__ */ Context.Operation<
  (target: string, path: string) => Effect.Effect<void, FileSystemError>
>()(
  "effect/FileSystem/symlink"
)

export const truncate = /* @__PURE__ */ Context.Operation<
  (path: string, length?: number) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/truncate")

export const utimes = /* @__PURE__ */ Context.Operation<
  (path: string, atime: Date, mtime: Date) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/utimes")

export const watch = /* @__PURE__ */ Stream.Operation<(path: string) => Stream.Stream<WatchEvent, FileSystemError>>()(
  "effect/FileSystem/watch"
)

export const writeFile = /* @__PURE__ */ Context.Operation<
  (path: string, data: Uint8Array, options?: { readonly mode?: number }) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/writeFile")

export const writeFileString = /* @__PURE__ */ Context.Operation<
  (path: string, data: string) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/writeFileString")

const operations = {
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
 * The identity of the whole file system: the union of its operations' keys.
 * A program annotated with this requires every operation; a layer typed with
 * it provides every operation.
 */
export type FileSystem = Context.Operations.Identifier<typeof operations>

/**
 * The file system as one record service. It is an ordinary `Context.Service`
 * stored one slot per operation: `Layer.succeed(FileSystem, record)` provides
 * all thirty operations, `yield* FileSystem` reads all thirty back as a
 * record, and `Effect.provideService(readFile.service, fake)` on top of either
 * replaces one of them.
 */
export const FileSystem = /* @__PURE__ */ Context.Operations<FileSystem>()("effect/FileSystem", operations)

/**
 * The record of implementations, as `yield* FileSystem` returns it.
 */
export type Shape = Context.Service.Shape<typeof FileSystem>
