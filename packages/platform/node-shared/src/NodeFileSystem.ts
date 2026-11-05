/**
 * Shared Node-compatible implementation of Effect's `FileSystem` service.
 *
 * This module adapts Node's `node:fs`, `node:os`, and `node:path` APIs into
 * `FileSystem` layers for Effect programs running on Node-compatible runtimes.
 * Platform packages use it to provide file and directory I/O, permissions,
 * links, metadata, temporary files and directories, and file watching through
 * the shared `FileSystem` service.
 *
 * Each operation of `effect/FileSystem` has its own layer here, named after
 * the operation, so a program that calls `FileSystem.readFile` and
 * `FileSystem.writeFile` can provide `NodeFileSystem.readFile` and
 * `NodeFileSystem.writeFile` and bundle only those two implementations.
 * `layer` provides every operation.
 *
 * @stability unstable
 * @since 4.0.0
 */
import type * as FileSystem from "effect/FileSystem"
import type * as Layer from "effect/Layer"
import * as Access from "./internal/fileSystem/access.ts"
import * as Chmod from "./internal/fileSystem/chmod.ts"
import * as Chown from "./internal/fileSystem/chown.ts"
import * as Copy from "./internal/fileSystem/copy.ts"
import * as CopyFile from "./internal/fileSystem/copyFile.ts"
import * as Exists from "./internal/fileSystem/exists.ts"
import * as Glob from "./internal/fileSystem/glob.ts"
import * as All from "./internal/fileSystem/layer.ts"
import * as Link from "./internal/fileSystem/link.ts"
import * as Lstat from "./internal/fileSystem/lstat.ts"
import * as MakeDirectory from "./internal/fileSystem/makeDirectory.ts"
import * as MakeTempDirectory from "./internal/fileSystem/makeTempDirectory.ts"
import * as MakeTempDirectoryScoped from "./internal/fileSystem/makeTempDirectoryScoped.ts"
import * as MakeTempFile from "./internal/fileSystem/makeTempFile.ts"
import * as MakeTempFileScoped from "./internal/fileSystem/makeTempFileScoped.ts"
import * as Open from "./internal/fileSystem/open.ts"
import * as ReadDirectory from "./internal/fileSystem/readDirectory.ts"
import * as ReadDirectoryEntries from "./internal/fileSystem/readDirectoryEntries.ts"
import * as ReadFile from "./internal/fileSystem/readFile.ts"
import * as ReadFileString from "./internal/fileSystem/readFileString.ts"
import * as ReadLink from "./internal/fileSystem/readLink.ts"
import * as RealPath from "./internal/fileSystem/realPath.ts"
import * as Remove from "./internal/fileSystem/remove.ts"
import * as Rename from "./internal/fileSystem/rename.ts"
import * as Sink from "./internal/fileSystem/sink.ts"
import * as Stat from "./internal/fileSystem/stat.ts"
import * as Stream from "./internal/fileSystem/stream.ts"
import * as Symlink from "./internal/fileSystem/symlink.ts"
import * as Truncate from "./internal/fileSystem/truncate.ts"
import * as Utimes from "./internal/fileSystem/utimes.ts"
import * as Watch from "./internal/fileSystem/watch.ts"
import * as WriteFile from "./internal/fileSystem/writeFile.ts"
import * as WriteFileString from "./internal/fileSystem/writeFileString.ts"

/**
 * Provides the `FileSystem` service backed by Node filesystem APIs, including
 * file operations, directory operations, links, metadata, and file watching.
 *
 * **Details**
 *
 * This is the merge of every operation layer in this module, so it bundles
 * every implementation. A program that calls a few operations can provide
 * their layers instead.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<FileSystem.FileSystem> = All.layer

/**
 * Layer that provides `FileSystem.access` alone: it checks access to a path with Node's `fs.access`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const access: Layer.Layer<"effect/FileSystem/access"> = Access.layer

/**
 * Layer that provides `FileSystem.chmod` alone: it changes a path's permissions with Node's `fs.chmod`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const chmod: Layer.Layer<"effect/FileSystem/chmod"> = Chmod.layer

/**
 * Layer that provides `FileSystem.chown` alone: it changes a path's owner and group with Node's `fs.chown`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const chown: Layer.Layer<"effect/FileSystem/chown"> = Chown.layer

/**
 * Layer that provides `FileSystem.copy` alone: it copies a file or directory recursively with Node's `fs.cp`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const copy: Layer.Layer<"effect/FileSystem/copy"> = Copy.layer

/**
 * Layer that provides `FileSystem.copyFile` alone: it copies a file with Node's `fs.copyFile`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const copyFile: Layer.Layer<"effect/FileSystem/copyFile"> = CopyFile.layer

/**
 * Layer that provides `FileSystem.exists` alone: it checks whether a path exists, derived from this module's `access`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const exists: Layer.Layer<"effect/FileSystem/exists"> = Exists.layer

/**
 * Layer that provides `FileSystem.glob` alone: it matches paths against a glob pattern, derived from this module's `readDirectoryEntries`, `stat` and `readLink`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const glob: Layer.Layer<"effect/FileSystem/glob"> = Glob.layer

/**
 * Layer that provides `FileSystem.link` alone: it creates a hard link with Node's `fs.link`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const link: Layer.Layer<"effect/FileSystem/link"> = Link.layer

/**
 * Layer that provides `FileSystem.lstat` alone: it reads a path's metadata without following symbolic links, with Node's `fs.lstat`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const lstat: Layer.Layer<"effect/FileSystem/lstat"> = Lstat.layer

/**
 * Layer that provides `FileSystem.makeDirectory` alone: it creates a directory with Node's `fs.mkdir`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const makeDirectory: Layer.Layer<"effect/FileSystem/makeDirectory"> = MakeDirectory.layer

/**
 * Layer that provides `FileSystem.makeTempDirectory` alone: it creates a temporary directory with Node's `fs.mkdtemp`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const makeTempDirectory: Layer.Layer<"effect/FileSystem/makeTempDirectory"> = MakeTempDirectory.layer

/**
 * Layer that provides `FileSystem.makeTempDirectoryScoped` alone: it creates a temporary directory with Node's `fs.mkdtemp` and removes it when the scope closes.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const makeTempDirectoryScoped: Layer.Layer<"effect/FileSystem/makeTempDirectoryScoped"> =
  MakeTempDirectoryScoped.layer

/**
 * Layer that provides `FileSystem.makeTempFile` alone: it creates an empty file in a new temporary directory.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const makeTempFile: Layer.Layer<"effect/FileSystem/makeTempFile"> = MakeTempFile.layer

/**
 * Layer that provides `FileSystem.makeTempFileScoped` alone: it creates an empty file in a new temporary directory and removes the directory when the scope closes.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const makeTempFileScoped: Layer.Layer<"effect/FileSystem/makeTempFileScoped"> = MakeTempFileScoped.layer

/**
 * Layer that provides `FileSystem.open` alone: it opens a file handle with Node's `fs.open` and closes it when the scope closes.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const open: Layer.Layer<"effect/FileSystem/open"> = Open.layer

/**
 * Layer that provides `FileSystem.readDirectory` alone: it lists a directory with Node's `fs.promises.readdir`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const readDirectory: Layer.Layer<"effect/FileSystem/readDirectory"> = ReadDirectory.layer

/**
 * Layer that provides `FileSystem.readDirectoryEntries` alone: it lists a directory with entry types, with Node's `fs.promises.readdir`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const readDirectoryEntries: Layer.Layer<"effect/FileSystem/readDirectoryEntries"> = ReadDirectoryEntries.layer

/**
 * Layer that provides `FileSystem.readFile` alone: it reads a whole file with Node's `fs.readFile`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const readFile: Layer.Layer<"effect/FileSystem/readFile"> = ReadFile.layer

/**
 * Layer that provides `FileSystem.readFileString` alone: it reads a file as text, derived from this module's `readFile`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const readFileString: Layer.Layer<"effect/FileSystem/readFileString"> = ReadFileString.layer

/**
 * Layer that provides `FileSystem.readLink` alone: it reads a symbolic link's target with Node's `fs.readlink`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const readLink: Layer.Layer<"effect/FileSystem/readLink"> = ReadLink.layer

/**
 * Layer that provides `FileSystem.realPath` alone: it resolves a path to its canonical form with Node's `fs.realpath`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const realPath: Layer.Layer<"effect/FileSystem/realPath"> = RealPath.layer

/**
 * Layer that provides `FileSystem.remove` alone: it removes a file or directory with Node's `fs.rm`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const remove: Layer.Layer<"effect/FileSystem/remove"> = Remove.layer

/**
 * Layer that provides `FileSystem.rename` alone: it renames a path with Node's `fs.rename`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const rename: Layer.Layer<"effect/FileSystem/rename"> = Rename.layer

/**
 * Layer that provides `FileSystem.sink` alone: it writes a stream of bytes to a file, derived from this module's `open`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const sink: Layer.Layer<"effect/FileSystem/sink"> = Sink.layer

/**
 * Layer that provides `FileSystem.stat` alone: it reads a path's metadata with Node's `fs.stat`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const stat: Layer.Layer<"effect/FileSystem/stat"> = Stat.layer

/**
 * Layer that provides `FileSystem.stream` alone: it reads a file as a stream of chunks, derived from this module's `open`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const stream: Layer.Layer<"effect/FileSystem/stream"> = Stream.layer

/**
 * Layer that provides `FileSystem.symlink` alone: it creates a symbolic link with Node's `fs.symlink`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const symlink: Layer.Layer<"effect/FileSystem/symlink"> = Symlink.layer

/**
 * Layer that provides `FileSystem.truncate` alone: it truncates a file with Node's `fs.truncate`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const truncate: Layer.Layer<"effect/FileSystem/truncate"> = Truncate.layer

/**
 * Layer that provides `FileSystem.utimes` alone: it changes a path's access and modification times with Node's `fs.utimes`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const utimes: Layer.Layer<"effect/FileSystem/utimes"> = Utimes.layer

/**
 * Layer that provides `FileSystem.watch` alone: it watches a path with Node's `fs.watch`, or with a provided `FileSystem.WatchBackend`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const watch: Layer.Layer<"effect/FileSystem/watch"> = Watch.layer

/**
 * Layer that provides `FileSystem.writeFile` alone: it writes a whole file with Node's `fs.writeFile`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const writeFile: Layer.Layer<"effect/FileSystem/writeFile"> = WriteFile.layer

/**
 * Layer that provides `FileSystem.writeFileString` alone: it writes text to a file, derived from this module's `writeFile`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const writeFileString: Layer.Layer<"effect/FileSystem/writeFileString"> = WriteFileString.layer
