/**
 * The Node implementation of the file system: one module, one layer per
 * operation as a top-level export, and `layer`, every operation merged.
 *
 * A composition root imports the layers for the operations its program
 * requires (`import { readFile, writeFile } from "./NodeFileSystem.ts"`, or
 * `NodeFileSystem.readFile` off the namespace) and the bundler drops the
 * other exports of this module: an unused top-level binding whose initializer
 * is a pure call. `Layer.succeed(…)` is a call, so what makes it pure to the
 * bundler is the annotation the package build adds to every top-level call
 * (`babel-plugin-annotate-pure-calls`), or a `@__PURE__` comment written by
 * hand in a module that no build annotates. The bundle check builds this module
 * both ways and reports the difference. Nothing else is needed: the helpers
 * below are plain functions, there is no module-level state, and `layer`
 * references every operation but is itself an unused pure binding in a root
 * that does not import it.
 *
 * Every implementation tags its errors with a `node/FileSystem/<op>` marker,
 * so the bundle check can see which implementations a bundle carries.
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import { createReadStream } from "node:fs"
import type * as nfs from "node:fs"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as Path from "node:path"
import * as FileSystem from "./FileSystem.ts"
import { FileSystemError } from "./FileSystem.ts"

/** Runs a Node file system call, tagging failures with the implementation that made them. */
const tryFs = <A>(operation: string, run: () => Promise<A>): Effect.Effect<A, FileSystemError> =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => new FileSystemError({ operation, cause })
  })

const toInfo = (stats: nfs.Stats): FileSystem.Info => ({
  type: stats.isFile() ? "File" : stats.isDirectory() ? "Directory" : stats.isSymbolicLink() ? "SymbolicLink" : "Other",
  size: stats.size,
  mtime: stats.mtime
})

const tempPath = (prefix: string | undefined) => Path.join(os.tmpdir(), prefix ?? "effect-")

/** The Node implementation of `FileSystem.access`, as a layer for its operation. */
export const access = Layer.succeed(
  FileSystem.access,
  (path, options) =>
    tryFs(
      "node/FileSystem/access",
      () => fs.access(path, (options?.readable ? fs.constants.R_OK : 0) | (options?.writable ? fs.constants.W_OK : 0))
    )
)

/** The Node implementation of `FileSystem.chmod`, as a layer for its operation. */
export const chmod = Layer.succeed(
  FileSystem.chmod,
  (path, mode) => tryFs("node/FileSystem/chmod", () => fs.chmod(path, mode))
)

/** The Node implementation of `FileSystem.chown`, as a layer for its operation. */
export const chown = Layer.succeed(
  FileSystem.chown,
  (path, uid, gid) => tryFs("node/FileSystem/chown", () => fs.chown(path, uid, gid))
)

/** The Node implementation of `FileSystem.copy`, as a layer for its operation. */
export const copy = Layer.succeed(
  FileSystem.copy,
  (from, to, options) =>
    tryFs("node/FileSystem/copy", () => fs.cp(from, to, { recursive: true, force: options?.overwrite ?? false }))
)

/** The Node implementation of `FileSystem.copyFile`, as a layer for its operation. */
export const copyFile = Layer.succeed(
  FileSystem.copyFile,
  (from, to) => tryFs("node/FileSystem/copyFile", () => fs.copyFile(from, to))
)

/** The Node implementation of `FileSystem.exists`, as a layer for its operation. */
export const exists = Layer.succeed(
  FileSystem.exists,
  (path) =>
    tryFs("node/FileSystem/exists", () =>
      fs.access(path).then(() => true, (error) => {
        if (error?.code === "ENOENT") return false
        throw error
      }))
)

/** The Node implementation of `FileSystem.glob`, as a layer for its operation. */
export const glob = Layer.succeed(
  FileSystem.glob,
  (pattern, options) =>
    Stream.fromAsyncIterable(
      fs.glob(pattern, { cwd: options?.cwd ?? process.cwd() }),
      (cause) => new FileSystemError({ operation: "node/FileSystem/glob", cause })
    )
)

/** The Node implementation of `FileSystem.link`, as a layer for its operation. */
export const link = Layer.succeed(
  FileSystem.link,
  (from, to) => tryFs("node/FileSystem/link", () => fs.link(from, to))
)

/** The Node implementation of `FileSystem.lstat`, as a layer for its operation. */
export const lstat = Layer.succeed(
  FileSystem.lstat,
  (path) => tryFs("node/FileSystem/lstat", () => fs.lstat(path)).pipe(Effect.map(toInfo))
)

/** The Node implementation of `FileSystem.makeDirectory`, as a layer for its operation. */
export const makeDirectory = Layer.succeed(
  FileSystem.makeDirectory,
  (path, options) =>
    tryFs("node/FileSystem/makeDirectory", () => fs.mkdir(path, { recursive: options?.recursive ?? false })).pipe(
      Effect.asVoid
    )
)

/** The Node implementation of `FileSystem.makeTempDirectory`, as a layer for its operation. */
export const makeTempDirectory = Layer.succeed(
  FileSystem.makeTempDirectory,
  (options) => tryFs("node/FileSystem/makeTempDirectory", () => fs.mkdtemp(tempPath(options?.prefix)))
)

/** The Node implementation of `FileSystem.makeTempDirectoryScoped`, as a layer for its operation. */
export const makeTempDirectoryScoped = Layer.succeed(
  FileSystem.makeTempDirectoryScoped,
  (options) =>
    Effect.acquireRelease(
      tryFs("node/FileSystem/makeTempDirectoryScoped", () => fs.mkdtemp(tempPath(options?.prefix))),
      (directory) => Effect.promise(() => fs.rm(directory, { recursive: true, force: true }))
    )
)

/** The Node implementation of `FileSystem.makeTempFile`, as a layer for its operation. */
export const makeTempFile = Layer.succeed(
  FileSystem.makeTempFile,
  (options) =>
    tryFs("node/FileSystem/makeTempFile", async () => {
      const directory = await fs.mkdtemp(tempPath(options?.prefix))
      const file = Path.join(directory, "file")
      await fs.writeFile(file, new Uint8Array())
      return file
    })
)

/** The Node implementation of `FileSystem.makeTempFileScoped`, as a layer for its operation. */
export const makeTempFileScoped = Layer.succeed(
  FileSystem.makeTempFileScoped,
  (options) =>
    Effect.acquireRelease(
      tryFs("node/FileSystem/makeTempFileScoped", async () => {
        const directory = await fs.mkdtemp(tempPath(options?.prefix))
        const file = Path.join(directory, "file")
        await fs.writeFile(file, new Uint8Array())
        return file
      }),
      (file) => Effect.promise(() => fs.rm(Path.dirname(file), { recursive: true, force: true }))
    )
)

/** The Node implementation of `FileSystem.readDirectory`, as a layer for its operation. */
export const readDirectory = Layer.succeed(
  FileSystem.readDirectory,
  (path) => tryFs("node/FileSystem/readDirectory", () => fs.readdir(path))
)

/** The Node implementation of `FileSystem.readDirectoryEntries`, as a layer for its operation. */
export const readDirectoryEntries = Layer.succeed(
  FileSystem.readDirectoryEntries,
  (path) =>
    tryFs("node/FileSystem/readDirectoryEntries", () => fs.readdir(path, { withFileTypes: true })).pipe(
      Effect.map((entries) =>
        entries.map((entry) => ({
          name: entry.name,
          type: entry.isFile()
            ? "File"
            : entry.isDirectory()
            ? "Directory"
            : entry.isSymbolicLink()
            ? "SymbolicLink"
            : "Other"
        } as const))
      )
    )
)

/** The Node implementation of `FileSystem.readFile`, as a layer for its operation. */
export const readFile = Layer.succeed(
  FileSystem.readFile,
  (path) =>
    tryFs("node/FileSystem/readFile", () => fs.readFile(path)).pipe(Effect.map((buffer) => new Uint8Array(buffer)))
)

/** The Node implementation of `FileSystem.readFileString`, as a layer for its operation. */
export const readFileString = Layer.succeed(
  FileSystem.readFileString,
  (path, encoding) => tryFs("node/FileSystem/readFileString", () => fs.readFile(path, { encoding: encoding ?? "utf8" }))
)

/** The Node implementation of `FileSystem.readLink`, as a layer for its operation. */
export const readLink = Layer.succeed(
  FileSystem.readLink,
  (path) => tryFs("node/FileSystem/readLink", () => fs.readlink(path))
)

/** The Node implementation of `FileSystem.realPath`, as a layer for its operation. */
export const realPath = Layer.succeed(
  FileSystem.realPath,
  (path) => tryFs("node/FileSystem/realPath", () => fs.realpath(path))
)

/** The Node implementation of `FileSystem.remove`, as a layer for its operation. */
export const remove = Layer.succeed(
  FileSystem.remove,
  (path, options) =>
    tryFs(
      "node/FileSystem/remove",
      () => fs.rm(path, { recursive: options?.recursive ?? false, force: options?.force ?? false })
    )
)

/** The Node implementation of `FileSystem.rename`, as a layer for its operation. */
export const rename = Layer.succeed(
  FileSystem.rename,
  (from, to) => tryFs("node/FileSystem/rename", () => fs.rename(from, to))
)

/** The Node implementation of `FileSystem.stat`, as a layer for its operation. */
export const stat = Layer.succeed(
  FileSystem.stat,
  (path) => tryFs("node/FileSystem/stat", () => fs.stat(path)).pipe(Effect.map(toInfo))
)

/** The Node implementation of `FileSystem.stream`, as a layer for its operation. */
export const stream = Layer.succeed(
  FileSystem.stream,
  (path, options) =>
    Stream.fromAsyncIterable(
      createReadStream(path, { highWaterMark: options?.chunkSize ?? 64 * 1024 }),
      (cause) => new FileSystemError({ operation: "node/FileSystem/stream", cause })
    ).pipe(Stream.map((chunk) => new Uint8Array(chunk as Buffer)))
)

/** The Node implementation of `FileSystem.symlink`, as a layer for its operation. */
export const symlink = Layer.succeed(
  FileSystem.symlink,
  (target, path) => tryFs("node/FileSystem/symlink", () => fs.symlink(target, path))
)

/** The Node implementation of `FileSystem.truncate`, as a layer for its operation. */
export const truncate = Layer.succeed(
  FileSystem.truncate,
  (path, length) => tryFs("node/FileSystem/truncate", () => fs.truncate(path, length))
)

/** The Node implementation of `FileSystem.utimes`, as a layer for its operation. */
export const utimes = Layer.succeed(
  FileSystem.utimes,
  (path, atime, mtime) => tryFs("node/FileSystem/utimes", () => fs.utimes(path, atime, mtime))
)

/** The Node implementation of `FileSystem.watch`, as a layer for its operation. */
export const watch = Layer.succeed(
  FileSystem.watch,
  (path) =>
    Stream.fromAsyncIterable(
      fs.watch(path),
      (cause) => new FileSystemError({ operation: "node/FileSystem/watch", cause })
    ).pipe(
      Stream.map((event) => ({
        kind: event.eventType === "rename" ? "Remove" : "Update",
        path: Path.join(path, String(event.filename ?? ""))
      } as const))
    )
)

/** The Node implementation of `FileSystem.writeFile`, as a layer for its operation. */
export const writeFile = Layer.succeed(
  FileSystem.writeFile,
  (path, data, options) => tryFs("node/FileSystem/writeFile", () => fs.writeFile(path, data, { mode: options?.mode }))
)

/** The Node implementation of `FileSystem.writeFileString`, as a layer for its operation. */
export const writeFileString = Layer.succeed(
  FileSystem.writeFileString,
  (path, data) => tryFs("node/FileSystem/writeFileString", () => fs.writeFile(path, data, "utf8"))
)

/**
 * Every operation of the Node file system in one layer: the coarse-grained
 * form. Providing it is the same as providing a record service today, and it
 * bundles every implementation. A program that only needs two operations
 * provides those two layers instead, and this binding, unused, is dropped
 * with the twenty-eight it references.
 *
 * The annotation is the point: merging the thirty operation layers is a
 * `Layer<FileSystem>`, the type a record provider has, because the identity
 * of the record service is the union of its operations' keys. No helper is
 * needed to go from the per-operation form to the whole-service form.
 */
export const layer: Layer.Layer<FileSystem.FileSystem> = Layer.mergeAll(
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
)
