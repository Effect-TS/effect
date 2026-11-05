/**
 * The operations of the file system contract, one per export and nothing
 * else: the module `FileSystem.ts` imports as a namespace to get the member
 * list of its record service, so the list is never written by hand, and
 * derives `Shape`, the record of implementations, from it.
 *
 * Each operation declares its shape once, here, and its key is the one call
 * argument. Operations returning a Stream are defined with `Stream.Operation`;
 * the rest with `Context.Operation`. There are no purity annotations in this
 * file; the bundle check measures what that costs (nothing a program notices)
 * and what annotations, or the published build's `annotate-pure-calls` pass,
 * recover.
 */
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import type { DirectoryEntry, FileSystemError, Info, WatchEvent } from "./Shape.ts"

export const access = Context.Operation<
  (
    path: string,
    options?: { readonly writable?: boolean; readonly readable?: boolean }
  ) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/access")

export const chmod = Context.Operation<(path: string, mode: number) => Effect.Effect<void, FileSystemError>>()(
  "effect/FileSystem/chmod"
)

export const chown = Context.Operation<
  (path: string, uid: number, gid: number) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/chown")

export const copy = Context.Operation<
  (
    from: string,
    to: string,
    options?: { readonly overwrite?: boolean }
  ) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/copy")

export const copyFile = Context.Operation<(from: string, to: string) => Effect.Effect<void, FileSystemError>>()(
  "effect/FileSystem/copyFile"
)

export const exists = Context.Operation<(path: string) => Effect.Effect<boolean, FileSystemError>>()(
  "effect/FileSystem/exists"
)

export const glob = Stream.Operation<
  (pattern: string, options?: { readonly cwd?: string }) => Stream.Stream<string, FileSystemError>
>()("effect/FileSystem/glob")

export const link = Context.Operation<(from: string, to: string) => Effect.Effect<void, FileSystemError>>()(
  "effect/FileSystem/link"
)

export const lstat = Context.Operation<(path: string) => Effect.Effect<Info, FileSystemError>>()(
  "effect/FileSystem/lstat"
)

export const makeDirectory = Context.Operation<
  (
    path: string,
    options?: { readonly recursive?: boolean }
  ) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/makeDirectory")

export const makeTempDirectory = Context.Operation<
  (options?: { readonly prefix?: string }) => Effect.Effect<string, FileSystemError>
>()("effect/FileSystem/makeTempDirectory")

export const makeTempDirectoryScoped = Context.Operation<
  (
    options?: { readonly prefix?: string }
  ) => Effect.Effect<string, FileSystemError, Scope.Scope>
>()(
  "effect/FileSystem/makeTempDirectoryScoped"
)

export const makeTempFile = Context.Operation<
  (options?: { readonly prefix?: string }) => Effect.Effect<string, FileSystemError>
>()("effect/FileSystem/makeTempFile")

export const makeTempFileScoped = Context.Operation<
  (
    options?: { readonly prefix?: string }
  ) => Effect.Effect<string, FileSystemError, Scope.Scope>
>()(
  "effect/FileSystem/makeTempFileScoped"
)

export const readDirectory = Context.Operation<
  (path: string) => Effect.Effect<ReadonlyArray<string>, FileSystemError>
>()("effect/FileSystem/readDirectory")

export const readDirectoryEntries = Context.Operation<
  (path: string) => Effect.Effect<ReadonlyArray<DirectoryEntry>, FileSystemError>
>()(
  "effect/FileSystem/readDirectoryEntries"
)

export const readFile = Context.Operation<(path: string) => Effect.Effect<Uint8Array, FileSystemError>>()(
  "effect/FileSystem/readFile"
)

export const readFileString = Context.Operation<
  (path: string, encoding?: BufferEncoding) => Effect.Effect<string, FileSystemError>
>()("effect/FileSystem/readFileString")

export const readLink = Context.Operation<(path: string) => Effect.Effect<string, FileSystemError>>()(
  "effect/FileSystem/readLink"
)

export const realPath = Context.Operation<(path: string) => Effect.Effect<string, FileSystemError>>()(
  "effect/FileSystem/realPath"
)

export const remove = Context.Operation<
  (
    path: string,
    options?: { readonly recursive?: boolean; readonly force?: boolean }
  ) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/remove")

export const rename = Context.Operation<(from: string, to: string) => Effect.Effect<void, FileSystemError>>()(
  "effect/FileSystem/rename"
)

export const stat = Context.Operation<(path: string) => Effect.Effect<Info, FileSystemError>>()(
  "effect/FileSystem/stat"
)

export const stream = Stream.Operation<
  (
    path: string,
    options?: { readonly chunkSize?: number }
  ) => Stream.Stream<Uint8Array, FileSystemError>
>()("effect/FileSystem/stream")

export const symlink = Context.Operation<(target: string, path: string) => Effect.Effect<void, FileSystemError>>()(
  "effect/FileSystem/symlink"
)

export const truncate = Context.Operation<(path: string, length?: number) => Effect.Effect<void, FileSystemError>>()(
  "effect/FileSystem/truncate"
)

export const utimes = Context.Operation<
  (path: string, atime: Date, mtime: Date) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/utimes")

export const watch = Stream.Operation<(path: string) => Stream.Stream<WatchEvent, FileSystemError>>()(
  "effect/FileSystem/watch"
)

export const writeFile = Context.Operation<
  (
    path: string,
    data: Uint8Array,
    options?: { readonly mode?: number }
  ) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/writeFile")

export const writeFileString = Context.Operation<
  (path: string, data: string) => Effect.Effect<void, FileSystemError>
>()("effect/FileSystem/writeFileString")
