/** @internal */
import * as DateTime from "../DateTime.ts"
import * as Effect from "../Effect.ts"
import * as FileSystem from "../FileSystem.ts"
import * as Layer from "../Layer.ts"
import * as PlatformError from "../PlatformError.ts"
import * as Result from "../Result.ts"
import * as Stream from "../Stream.ts"
import * as Vfs from "../virtual-file-system/VirtualFileSystem.ts"
import { makeCopyOperations } from "./memoryFileSystem/copy.ts"
import { makeOpen } from "./memoryFileSystem/fileHandle.ts"
import {
  argumentError,
  fileType,
  info,
  openOptions,
  resourceError,
  sizeInput,
  textPath,
  toPlatformError,
  validateMode
} from "./memoryFileSystem/support.ts"

export const isWatchOverflow = (error: PlatformError.PlatformError): boolean =>
  error.reason._tag === "Unknown" && error.reason.module === "FileSystem" && error.reason.method === "watch" &&
  error.reason.description === "WatchOverflow"

export const fromCaller = (caller: Vfs.VirtualFileSystem): FileSystem.FileSystem => {
  let nextTemporary = 1
  const mapped = <A, E extends Vfs.VirtualFileSystemError | PlatformError.PlatformError, R>(
    self: Effect.Effect<A, E, R>,
    method: string,
    path: string
  ) => Effect.mapError(self, (error) => toPlatformError(error, method, path))
  const stat = (path: string, follow: boolean) =>
    mapped(follow ? caller.stat(path) : caller.linkStat(path), follow ? "stat" : "lstat", path).pipe(
      Effect.flatMap((object) => info(object.metadata, caller.instanceNumber, follow ? "stat" : "lstat", path))
    )
  const temp = Effect.fnUntraced(
    function*(
      kind: "file" | "directory",
      options?: {
        readonly directory?: string | undefined
        readonly prefix?: string | undefined
        readonly suffix?: string | undefined
      }
    ) {
      const method = kind === "file" ? "makeTempFile" : "makeTempDirectory"
      for (const value of [options?.prefix ?? "", options?.suffix ?? ""]) {
        if (value.includes("/") || value.includes("\0")) {
          return yield* argumentError(method, "temporary fragments cannot contain separators")
        }
      }
      const parent = yield* mapped(caller.realPath(options?.directory ?? "/tmp"), method, options?.directory ?? "/tmp")
        .pipe(
          Effect.flatMap((value) => textPath(value, method, options?.directory ?? "/tmp"))
        )
      while (true) {
        const directory = `${parent === "/" ? "" : parent}/${options?.prefix ?? ""}${
          (nextTemporary++).toString(36).padStart(8, "0")
        }`
        const result = yield* Effect.result(caller.makeDirectoryEntry(directory, { mode: 0o700 }))
        if (Result.isFailure(result)) {
          if (result.failure._tag === "AlreadyExists") continue
          return yield* toPlatformError(result.failure, method, directory)
        }
        const reference = result.success.object.reference
        if (kind === "directory") return { path: directory, directory, reference }
        const path = `${directory}/${(nextTemporary++).toString(36).padStart(8, "0")}${options?.suffix ?? ""}`
        yield* mapped(caller.createFile(path, { mode: 0o600 }), method, path).pipe(
          Effect.onError(() => cleanup({ directory, reference }))
        )
        return { path, directory, reference }
      }
    }
  )
  const cleanup = Effect.fnUntraced(function*(temporary: { directory: string; reference: Vfs.ObjectReference }) {
    const result = yield* Effect.result(
      caller.removeRecursive(temporary.directory, { entry: { expected: "present", object: temporary.reference } })
    )
    if (
      Result.isFailure(result) &&
      !["NotFound", "ConditionFailed", "NamespaceChanged", "AccessDenied"].includes(result.failure._tag) &&
      !(result.failure._tag === "InvalidResource" && ["closed", "closing", "stale"].includes(result.failure.reason))
    ) {
      return yield* Effect.die(toPlatformError(result.failure, "remove", temporary.directory))
    }
  })
  return FileSystem.make({
    ...makeCopyOperations(caller),
    open: makeOpen(caller),
    access: (path, options) =>
      mapped(caller.access(path, { read: options?.readable, write: options?.writable }), "access", path),
    stat: (path) => stat(path, true),
    lstat: (path) => stat(path, false),
    chmod: Effect.fnUntraced(function*(path, mode) {
      yield* validateMode(mode, "chmod")
      yield* mapped(caller.setAttributes(path, { mode: mode & 0o7777 }), "chmod", path)
    }),
    chown: Effect.fnUntraced(function*(path, uid, gid) {
      if (![uid, gid].every((id) => Number.isInteger(id) && id >= 0 && id <= 0xffffffff)) {
        return yield* argumentError("chown", "owner IDs must be unsigned 32-bit integers")
      }
      yield* mapped(caller.setAttributes(path, { uid, gid }), "chown", path)
    }),
    utimes: Effect.fnUntraced(function*(path, atime, mtime) {
      const time = (value: number | Date) => {
        const millis = typeof value === "number" ? value * 1000 : value.getTime()
        if (!Number.isFinite(millis) || Math.abs(millis) > 8.64e15) {
          return Effect.fail(argumentError("utimes", "timestamps must be valid dates"))
        }
        return Effect.succeed(DateTime.unixNanoFromNanoseconds(BigInt(Math.trunc(millis)) * BigInt(1000000)))
      }
      yield* mapped(
        caller.setAttributes(path, { atime: yield* time(atime), mtime: yield* time(mtime) }),
        "utimes",
        path
      )
    }),
    makeDirectory: Effect.fnUntraced(function*(path, options) {
      yield* validateMode(options?.mode, "makeDirectory")
      yield* mapped(
        caller.makeDirectory(path, { mode: (options?.mode ?? 0o755) & 0o7777, recursive: options?.recursive }).pipe(
          Effect.catchTag(
            "InvalidResource",
            Effect.fnUntraced(function*(error) {
              if (error.reason === "wrongKind" && Result.isSuccess(yield* Effect.result(caller.linkStat(path)))) {
                return yield* new Vfs.AlreadyExists({ operation: "makeDirectory", reason: "occupiedEntry" })
              }
              return yield* error
            })
          )
        ),
        "makeDirectory",
        path
      )
    }),
    readDirectory: (path, options) =>
      options?.recursive
        ? Stream.runCollect(
          caller.walk(path).pipe(
            Stream.filter((entry) => !entry.root),
            Stream.mapEffect((entry) => textPath(entry.path, "readDirectory", path)),
            Stream.mapError((error) => toPlatformError(error, "readDirectory", path))
          )
        ).pipe(Effect.map((names) => Array.from(names).sort()))
        : mapped(caller.readDirectory(path), "readDirectory", path).pipe(
          Effect.flatMap((listing) => Effect.forEach(listing.names, (name) => textPath(name, "readDirectory", path))),
          Effect.map((names) => names.sort())
        ),
    readDirectoryEntries: (path) =>
      mapped(caller.readDirents(path), "readDirectoryEntries", path).pipe(
        Effect.flatMap((listing) =>
          Effect.forEach(listing.entries, (entry) =>
            textPath(entry.name, "readDirectoryEntries", path).pipe(
              Effect.map((name) => ({ name, type: fileType[entry.kind] }))
            ))
        )
      ),
    readFile: (path) => mapped(caller.readFile(path), "readFile", path),
    writeFile: Effect.fnUntraced(function*(path, input, options) {
      const chosen = yield* openOptions(options?.flag ?? "w", options?.mode, "writeFile")
      if (chosen.access === "read") return yield* resourceError("writeFile", path, "file is opened for reading")
      yield* mapped(
        caller.writeFile(path, new Uint8Array(input), {
          access: chosen.access,
          create: chosen.create,
          mode: chosen.mode,
          placement: chosen.append ? "append" : chosen.truncate ? "replace" : "start"
        }),
        "writeFile",
        path
      )
    }),
    readLink: (path) =>
      mapped(caller.readLink(path), "readLink", path).pipe(
        Effect.flatMap((target) => textPath(target, "readLink", path))
      ),
    realPath: (path) =>
      mapped(caller.realPath(path), "realPath", path).pipe(
        Effect.flatMap((target) => textPath(target, "realPath", path))
      ),
    rename: Effect.fnUntraced(function*(source, destination) {
      const from = yield* mapped(caller.linkStat(source), "rename", source)
      const target = from.kind === "directory" && destination.endsWith("/")
        ? destination.replace(/\/+$/, "") || "/"
        : destination
      yield* mapped(caller.rename(source, target), "rename", source)
    }),
    link: (source, destination) =>
      Effect.asVoid(mapped(caller.makeHardLink({ entry: source }, destination), "link", source)),
    symlink: (target, path) => Effect.asVoid(mapped(caller.makeSymlink(path, target), "symlink", path)),
    truncate: Effect.fnUntraced(function*(path, length) {
      yield* mapped(caller.truncate(path, yield* sizeInput(length, "truncate", 0)), "truncate", path)
    }),
    remove: Effect.fnUntraced(function*(path, options) {
      const name = path.split("/").reverse().find((part) => part.length > 0)
      if (name === undefined || name === "." || name === "..") {
        return yield* resourceError("remove", path, "Cannot remove root or dot entries")
      }
      const removing = options?.recursive ? caller.removeRecursive(path) : Effect.gen(function*() {
        const node = yield* caller.linkStat(path)
        yield* node.kind === "directory" ? caller.removeDirectory(path) : caller.unlink(path)
      })
      yield* mapped(
        options?.force ? removing.pipe(Effect.catchTag("NotFound", () => Effect.void)) : removing,
        "remove",
        path
      )
    }),
    makeTempDirectory: (options) => temp("directory", options).pipe(Effect.map((value) => value.path)),
    makeTempFile: (options) => temp("file", options).pipe(Effect.map((value) => value.path)),
    makeTempDirectoryScoped: (options) =>
      Effect.acquireRelease(temp("directory", options), cleanup).pipe(Effect.map((value) => value.path)),
    makeTempFileScoped: (options) =>
      Effect.acquireRelease(temp("file", options), cleanup).pipe(Effect.map((value) => value.path)),
    watch: (path, options) =>
      Stream.unwrap(Effect.gen(function*() {
        const stream = yield* mapped(
          caller.watch(path, { recursive: options?.recursive === true, alias: "resolved" }),
          "watch",
          path
        )
        yield* Effect.sync(() => options?.onReady?.())
        return stream.pipe(
          Stream.mapError((error) => toPlatformError(error, "watch", path)),
          Stream.mapEffect((event) =>
            event._tag === "Rescan"
              ? Effect.fail(
                PlatformError.systemError({
                  module: "FileSystem",
                  method: "watch",
                  pathOrDescriptor: path,
                  _tag: "Unknown",
                  description: "WatchOverflow"
                })
              )
              : textPath(event.path, "watch", path).pipe(
                Effect.map((path): FileSystem.WatchEvent => ({ _tag: event._tag, path }))
              )
          )
        )
      }))
  })
}

export const make = Effect.gen(function*() {
  const owner = yield* Vfs.make({ accessTime: "relatime", groupInheritance: "parent" })
  const caller = yield* owner.authorize({ credentials: { uid: 0, gid: 0, privileged: true }, umask: 0 })
  yield* caller.makeDirectory("/tmp", { mode: 0o1777 })
  return fromCaller(caller)
}).pipe(Effect.orDie)

export const layer = Layer.effect(FileSystem.FileSystem, make)
