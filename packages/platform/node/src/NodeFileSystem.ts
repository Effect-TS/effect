/**
 * Node.js `FileSystem` layer for programs that perform real filesystem I/O.
 *
 * The exported `layer` satisfies the platform-independent `FileSystem` service
 * with Node-backed operations for files, directories, metadata, permissions,
 * links, temporary paths, and path watching. Effects still call the service from
 * `effect/FileSystem`; this module only chooses the Node implementation. Each
 * operation also has its own layer, so a program can provide only the
 * operations it calls.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import type { FileSystem } from "effect/FileSystem"
import type * as Layer from "effect/Layer"

/**
 * Provides the `FileSystem` service backed by Node filesystem APIs.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<FileSystem> = NodeFileSystem.layer

/**
 * Layer that provides `FileSystem.access` alone: it checks access to a path with Node's `fs.access`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const access: Layer.Layer<"effect/FileSystem/access"> = NodeFileSystem.access

/**
 * Layer that provides `FileSystem.chmod` alone: it changes a path's permissions with Node's `fs.chmod`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const chmod: Layer.Layer<"effect/FileSystem/chmod"> = NodeFileSystem.chmod

/**
 * Layer that provides `FileSystem.chown` alone: it changes a path's owner and group with Node's `fs.chown`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const chown: Layer.Layer<"effect/FileSystem/chown"> = NodeFileSystem.chown

/**
 * Layer that provides `FileSystem.copy` alone: it copies a file or directory recursively with Node's `fs.cp`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const copy: Layer.Layer<"effect/FileSystem/copy"> = NodeFileSystem.copy

/**
 * Layer that provides `FileSystem.copyFile` alone: it copies a file with Node's `fs.copyFile`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const copyFile: Layer.Layer<"effect/FileSystem/copyFile"> = NodeFileSystem.copyFile

/**
 * Layer that provides `FileSystem.exists` alone: it checks whether a path exists, derived from this module's `access`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const exists: Layer.Layer<"effect/FileSystem/exists"> = NodeFileSystem.exists

/**
 * Layer that provides `FileSystem.glob` alone: it matches paths against a glob pattern, derived from this module's `readDirectoryEntries`, `stat` and `readLink`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const glob: Layer.Layer<"effect/FileSystem/glob"> = NodeFileSystem.glob

/**
 * Layer that provides `FileSystem.link` alone: it creates a hard link with Node's `fs.link`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const link: Layer.Layer<"effect/FileSystem/link"> = NodeFileSystem.link

/**
 * Layer that provides `FileSystem.lstat` alone: it reads a path's metadata without following symbolic links, with Node's `fs.lstat`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const lstat: Layer.Layer<"effect/FileSystem/lstat"> = NodeFileSystem.lstat

/**
 * Layer that provides `FileSystem.makeDirectory` alone: it creates a directory with Node's `fs.mkdir`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const makeDirectory: Layer.Layer<"effect/FileSystem/makeDirectory"> = NodeFileSystem.makeDirectory

/**
 * Layer that provides `FileSystem.makeTempDirectory` alone: it creates a temporary directory with Node's `fs.mkdtemp`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const makeTempDirectory: Layer.Layer<"effect/FileSystem/makeTempDirectory"> = NodeFileSystem.makeTempDirectory

/**
 * Layer that provides `FileSystem.makeTempDirectoryScoped` alone: it creates a temporary directory with Node's `fs.mkdtemp` and removes it when the scope closes.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const makeTempDirectoryScoped: Layer.Layer<"effect/FileSystem/makeTempDirectoryScoped"> =
  NodeFileSystem.makeTempDirectoryScoped

/**
 * Layer that provides `FileSystem.makeTempFile` alone: it creates an empty file in a new temporary directory.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const makeTempFile: Layer.Layer<"effect/FileSystem/makeTempFile"> = NodeFileSystem.makeTempFile

/**
 * Layer that provides `FileSystem.makeTempFileScoped` alone: it creates an empty file in a new temporary directory and removes the directory when the scope closes.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const makeTempFileScoped: Layer.Layer<"effect/FileSystem/makeTempFileScoped"> = NodeFileSystem.makeTempFileScoped

/**
 * Layer that provides `FileSystem.open` alone: it opens a file handle with Node's `fs.open` and closes it when the scope closes.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const open: Layer.Layer<"effect/FileSystem/open"> = NodeFileSystem.open

/**
 * Layer that provides `FileSystem.readDirectory` alone: it lists a directory with Node's `fs.promises.readdir`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const readDirectory: Layer.Layer<"effect/FileSystem/readDirectory"> = NodeFileSystem.readDirectory

/**
 * Layer that provides `FileSystem.readDirectoryEntries` alone: it lists a directory with entry types, with Node's `fs.promises.readdir`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const readDirectoryEntries: Layer.Layer<"effect/FileSystem/readDirectoryEntries"> =
  NodeFileSystem.readDirectoryEntries

/**
 * Layer that provides `FileSystem.readFile` alone: it reads a whole file with Node's `fs.readFile`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const readFile: Layer.Layer<"effect/FileSystem/readFile"> = NodeFileSystem.readFile

/**
 * Layer that provides `FileSystem.readFileString` alone: it reads a file as text, derived from this module's `readFile`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const readFileString: Layer.Layer<"effect/FileSystem/readFileString"> = NodeFileSystem.readFileString

/**
 * Layer that provides `FileSystem.readLink` alone: it reads a symbolic link's target with Node's `fs.readlink`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const readLink: Layer.Layer<"effect/FileSystem/readLink"> = NodeFileSystem.readLink

/**
 * Layer that provides `FileSystem.realPath` alone: it resolves a path to its canonical form with Node's `fs.realpath`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const realPath: Layer.Layer<"effect/FileSystem/realPath"> = NodeFileSystem.realPath

/**
 * Layer that provides `FileSystem.remove` alone: it removes a file or directory with Node's `fs.rm`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const remove: Layer.Layer<"effect/FileSystem/remove"> = NodeFileSystem.remove

/**
 * Layer that provides `FileSystem.rename` alone: it renames a path with Node's `fs.rename`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const rename: Layer.Layer<"effect/FileSystem/rename"> = NodeFileSystem.rename

/**
 * Layer that provides `FileSystem.sink` alone: it writes a stream of bytes to a file, derived from this module's `open`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const sink: Layer.Layer<"effect/FileSystem/sink"> = NodeFileSystem.sink

/**
 * Layer that provides `FileSystem.stat` alone: it reads a path's metadata with Node's `fs.stat`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const stat: Layer.Layer<"effect/FileSystem/stat"> = NodeFileSystem.stat

/**
 * Layer that provides `FileSystem.stream` alone: it reads a file as a stream of chunks, derived from this module's `open`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const stream: Layer.Layer<"effect/FileSystem/stream"> = NodeFileSystem.stream

/**
 * Layer that provides `FileSystem.symlink` alone: it creates a symbolic link with Node's `fs.symlink`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const symlink: Layer.Layer<"effect/FileSystem/symlink"> = NodeFileSystem.symlink

/**
 * Layer that provides `FileSystem.truncate` alone: it truncates a file with Node's `fs.truncate`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const truncate: Layer.Layer<"effect/FileSystem/truncate"> = NodeFileSystem.truncate

/**
 * Layer that provides `FileSystem.utimes` alone: it changes a path's access and modification times with Node's `fs.utimes`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const utimes: Layer.Layer<"effect/FileSystem/utimes"> = NodeFileSystem.utimes

/**
 * Layer that provides `FileSystem.watch` alone: it watches a path with Node's `fs.watch`, or with a provided `FileSystem.WatchBackend`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const watch: Layer.Layer<"effect/FileSystem/watch"> = NodeFileSystem.watch

/**
 * Layer that provides `FileSystem.writeFile` alone: it writes a whole file with Node's `fs.writeFile`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const writeFile: Layer.Layer<"effect/FileSystem/writeFile"> = NodeFileSystem.writeFile

/**
 * Layer that provides `FileSystem.writeFileString` alone: it writes text to a file, derived from this module's `writeFile`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const writeFileString: Layer.Layer<"effect/FileSystem/writeFileString"> = NodeFileSystem.writeFileString
