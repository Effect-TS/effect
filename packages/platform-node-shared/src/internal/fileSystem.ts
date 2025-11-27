import { effectify } from "@effect/platform/Effectify"
import * as Error from "@effect/platform/Error"
import * as FileSystem from "@effect/platform/FileSystem"
import type * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"
import * as Crypto from "node:crypto"
import * as NFS from "node:fs"
import * as OS from "node:os"
import * as Path from "node:path"
import { handleErrnoException } from "./error.js"

const handleBadArgument = (method: string) => (cause: unknown) =>
  new Error.BadArgument({
    module: "FileSystem",
    method,
    cause
  })

// == access

const access = (() => {
  const nodeAccess = effectify(
    NFS.access,
    handleErrnoException("FileSystem", "access"),
    handleBadArgument("access")
  )
  return (path: string, options?: FileSystem.AccessFileOptions) => {
    let mode = NFS.constants.F_OK
    if (options?.readable) {
      mode |= NFS.constants.R_OK
    }
    if (options?.writable) {
      mode |= NFS.constants.W_OK
    }
    return nodeAccess(path, mode)
  }
})()

// == copy

const copy = (() => {
  const nodeCp = effectify(
    NFS.cp,
    handleErrnoException("FileSystem", "copy"),
    handleBadArgument("copy")
  )
  return (fromPath: string, toPath: string, options?: FileSystem.CopyOptions) =>
    nodeCp(fromPath, toPath, {
      force: options?.overwrite ?? false,
      preserveTimestamps: options?.preserveTimestamps ?? false,
      recursive: true
    })
})()

// == copyFile

const copyFile = (() => {
  const nodeCopyFile = effectify(
    NFS.copyFile,
    handleErrnoException("FileSystem", "copyFile"),
    handleBadArgument("copyFile")
  )
  return (fromPath: string, toPath: string) => nodeCopyFile(fromPath, toPath)
})()

// == chmod

const chmod = (() => {
  const nodeChmod = effectify(
    NFS.chmod,
    handleErrnoException("FileSystem", "chmod"),
    handleBadArgument("chmod")
  )
  return (path: string, mode: number) => nodeChmod(path, mode)
})()

// == chown

const chown = (() => {
  const nodeChown = effectify(
    NFS.chown,
    handleErrnoException("FileSystem", "chown"),
    handleBadArgument("chown")
  )
  return (path: string, uid: number, gid: number) => nodeChown(path, uid, gid)
})()

// == link

const link = (() => {
  const nodeLink = effectify(
    NFS.link,
    handleErrnoException("FileSystem", "link"),
    handleBadArgument("link")
  )
  return (existingPath: string, newPath: string) => nodeLink(existingPath, newPath)
})()

// == makeDirectory

const makeDirectory = (() => {
  const nodeMkdir = effectify(
    NFS.mkdir,
    handleErrnoException("FileSystem", "makeDirectory"),
    handleBadArgument("makeDirectory")
  )
  return (path: string, options?: FileSystem.MakeDirectoryOptions) =>
    nodeMkdir(path, {
      recursive: options?.recursive ?? false,
      mode: options?.mode
    })
})()

// == makeTempDirectory

const makeTempDirectoryFactory = (method: string) => {
  const nodeMkdtemp = effectify(
    NFS.mkdtemp,
    handleErrnoException("FileSystem", method),
    handleBadArgument(method)
  )
  return (options?: FileSystem.MakeTempDirectoryOptions) =>
    Effect.suspend(() => {
      const prefix = options?.prefix ?? ""
      const directory = typeof options?.directory === "string"
        ? Path.join(options.directory, ".")
        : OS.tmpdir()

      return nodeMkdtemp(prefix ? Path.join(directory, prefix) : directory + "/")
    })
}
const makeTempDirectory = makeTempDirectoryFactory("makeTempDirectory")

// == remove

const removeFactory = (method: string) => {
  const nodeRm = effectify(
    NFS.rm,
    handleErrnoException("FileSystem", method),
    handleBadArgument(method)
  )
  return (path: string, options?: FileSystem.RemoveOptions) =>
    nodeRm(
      path,
      { recursive: options?.recursive ?? false, force: options?.force ?? false }
    )
}
const remove = removeFactory("remove")

// == makeTempDirectoryScoped

const makeTempDirectoryScoped = (() => {
  const makeDirectory = makeTempDirectoryFactory("makeTempDirectoryScoped")
  const removeDirectory = removeFactory("makeTempDirectoryScoped")
  return (
    options?: FileSystem.MakeTempDirectoryOptions
  ) =>
    Effect.acquireRelease(
      makeDirectory(options),
      (directory) => Effect.orDie(removeDirectory(directory, { recursive: true }))
    )
})()

// == open

const openFactory = (method: string) => {
  const nodeOpen = effectify(
    NFS.open,
    handleErrnoException("FileSystem", method),
    handleBadArgument(method)
  )
  const nodeClose = effectify(
    NFS.close,
    handleErrnoException("FileSystem", method),
    handleBadArgument(method)
  )

  return (path: string, options?: FileSystem.OpenFileOptions) =>
    pipe(
      Effect.acquireRelease(
        nodeOpen(path, options?.flag ?? "r", options?.mode),
        (fd) => Effect.orDie(nodeClose(fd))
      ),
      Effect.map((fd) => makeFile(FileSystem.FileDescriptor(fd), options?.flag?.startsWith("a") ?? false))
    )
}
const open = openFactory("open")

const makeFile = (() => {
  const nodeReadFactory = (method: string) =>
    effectify(
      NFS.read,
      handleErrnoException("FileSystem", method),
      handleBadArgument(method)
    )
  const nodeRead = nodeReadFactory("read")
  const nodeReadAlloc = nodeReadFactory("readAlloc")
  const nodeStat = effectify(
    NFS.fstat,
    handleErrnoException("FileSystem", "stat"),
    handleBadArgument("stat")
  )
  const nodeTruncate = effectify(
    NFS.ftruncate,
    handleErrnoException("FileSystem", "truncate"),
    handleBadArgument("truncate")
  )

  const nodeSync = effectify(
    NFS.fsync,
    handleErrnoException("FileSystem", "sync"),
    handleBadArgument("sync")
  )

  const nodeWriteFactory = (method: string) =>
    effectify(
      NFS.write,
      handleErrnoException("FileSystem", method),
      handleBadArgument(method)
    )
  const nodeWrite = nodeWriteFactory("write")
  const nodeWriteAll = nodeWriteFactory("writeAll")

  class FileImpl implements FileSystem.File {
    readonly [FileSystem.FileTypeId]: FileSystem.FileTypeId

    private readonly semaphore = Effect.unsafeMakeSemaphore(1)
    private position: bigint = 0n

    constructor(
      readonly fd: FileSystem.File.Descriptor,
      private readonly append: boolean
    ) {
      this[FileSystem.FileTypeId] = FileSystem.FileTypeId
    }

    get stat() {
      return Effect.map(nodeStat(this.fd), makeFileInfo)
    }

    get sync() {
      return nodeSync(this.fd)
    }

    seek(offset: FileSystem.SizeInput, from: FileSystem.SeekMode) {
      const offsetSize = FileSystem.Size(offset)
      return this.semaphore.withPermits(1)(
        Effect.sync(() => {
          if (from === "start") {
            this.position = offsetSize
          } else if (from === "current") {
            this.position = this.position + offsetSize
          }

          return this.position
        })
      )
    }

    read(buffer: Uint8Array) {
      return this.semaphore.withPermits(1)(
        Effect.map(
          Effect.suspend(() =>
            nodeRead(this.fd, {
              buffer,
              position: this.position
            })
          ),
          (bytesRead) => {
            const sizeRead = FileSystem.Size(bytesRead)
            this.position = this.position + sizeRead
            return sizeRead
          }
        )
      )
    }

    readAlloc(size: FileSystem.SizeInput) {
      const sizeNumber = Number(size)
      return this.semaphore.withPermits(1)(Effect.flatMap(
        Effect.sync(() => Buffer.allocUnsafeSlow(sizeNumber)),
        (buffer) =>
          Effect.map(
            nodeReadAlloc(this.fd, {
              buffer,
              position: this.position
            }),
            (bytesRead): Option.Option<Buffer> => {
              if (bytesRead === 0) {
                return Option.none()
              }

              this.position = this.position + BigInt(bytesRead)
              if (bytesRead === sizeNumber) {
                return Option.some(buffer)
              }

              const dst = Buffer.allocUnsafeSlow(bytesRead)
              buffer.copy(dst, 0, 0, bytesRead)
              return Option.some(dst)
            }
          )
      ))
    }

    truncate(length?: FileSystem.SizeInput) {
      return this.semaphore.withPermits(1)(
        Effect.map(nodeTruncate(this.fd, length ? Number(length) : undefined), () => {
          if (!this.append) {
            const len = BigInt(length ?? 0)
            if (this.position > len) {
              this.position = len
            }
          }
        })
      )
    }

    write(buffer: Uint8Array) {
      return this.semaphore.withPermits(1)(
        Effect.map(
          Effect.suspend(() =>
            nodeWrite(this.fd, buffer, undefined, undefined, this.append ? undefined : Number(this.position))
          ),
          (bytesWritten) => {
            const sizeWritten = FileSystem.Size(bytesWritten)
            if (!this.append) {
              this.position = this.position + sizeWritten
            }

            return sizeWritten
          }
        )
      )
    }

    private writeAllChunk(buffer: Uint8Array): Effect.Effect<void, Error.PlatformError> {
      return Effect.flatMap(
        Effect.suspend(() =>
          nodeWriteAll(this.fd, buffer, undefined, undefined, this.append ? undefined : Number(this.position))
        ),
        (bytesWritten) => {
          if (bytesWritten === 0) {
            return Effect.fail(
              new Error.SystemError({
                module: "FileSystem",
                method: "writeAll",
                reason: "WriteZero",
                pathOrDescriptor: this.fd,
                description: "write returned 0 bytes written"
              })
            )
          }

          if (!this.append) {
            this.position = this.position + BigInt(bytesWritten)
          }

          return bytesWritten < buffer.length ? this.writeAllChunk(buffer.subarray(bytesWritten)) : Effect.void
        }
      )
    }

    writeAll(buffer: Uint8Array) {
      return this.semaphore.withPermits(1)(this.writeAllChunk(buffer))
    }
  }

  return (fd: FileSystem.File.Descriptor, append: boolean): FileSystem.File => new FileImpl(fd, append)
})()

// == makeTempFile

const makeTempFileFactory = (method: string) => {
  const makeDirectory = makeTempDirectoryFactory(method)
  const open = openFactory(method)
  const randomHexString = (bytes: number) => Effect.sync(() => Crypto.randomBytes(bytes).toString("hex"))
  return (options?: FileSystem.MakeTempFileOptions) =>
    pipe(
      Effect.zip(makeDirectory(options), randomHexString(6)),
      Effect.map(([directory, random]) => Path.join(directory, random + (options?.suffix ?? ""))),
      Effect.tap((path) => Effect.scoped(open(path, { flag: "w+" })))
    )
}
const makeTempFile = makeTempFileFactory("makeTempFile")

// == makeTempFileScoped

const makeTempFileScoped = (() => {
  const makeFile = makeTempFileFactory("makeTempFileScoped")
  const removeDirectory = removeFactory("makeTempFileScoped")
  return (options?: FileSystem.MakeTempFileOptions) =>
    Effect.acquireRelease(
      makeFile(options),
      (file) => Effect.orDie(removeDirectory(Path.dirname(file), { recursive: true }))
    )
})()

// == readDirectory

const readDirectory = (path: string, options?: FileSystem.ReadDirectoryOptions) =>
  Effect.tryPromise({
    try: () => NFS.promises.readdir(path, options),
    catch: (err) => handleErrnoException("FileSystem", "readDirectory")(err as any, [path])
  })

// == readFile

const readFile = (path: string) =>
  Effect.async<Uint8Array, Error.PlatformError>((resume, signal) => {
    try {
      NFS.readFile(path, { signal }, (err, data) => {
        if (err) {
          resume(Effect.fail(handleErrnoException("FileSystem", "readFile")(err, [path])))
        } else {
          resume(Effect.succeed(data))
        }
      })
    } catch (err) {
      resume(Effect.fail(handleBadArgument("readFile")(err)))
    }
  })

// == readLink

const readLink = (() => {
  const nodeReadLink = effectify(
    NFS.readlink,
    handleErrnoException("FileSystem", "readLink"),
    handleBadArgument("readLink")
  )
  return (path: string) => nodeReadLink(path)
})()

// == realPath

const realPath = (() => {
  const nodeRealPath = effectify(
    NFS.realpath,
    handleErrnoException("FileSystem", "realPath"),
    handleBadArgument("realPath")
  )
  return (path: string) => nodeRealPath(path)
})()

// == rename

const rename = (() => {
  const nodeRename = effectify(
    NFS.rename,
    handleErrnoException("FileSystem", "rename"),
    handleBadArgument("rename")
  )
  return (oldPath: string, newPath: string) => nodeRename(oldPath, newPath)
})()

// == stat

const makeFileInfo = (stat: NFS.Stats): FileSystem.File.Info => ({
  type: stat.isFile() ?
    "File" :
    stat.isDirectory() ?
    "Directory" :
    stat.isSymbolicLink() ?
    "SymbolicLink" :
    stat.isBlockDevice() ?
    "BlockDevice" :
    stat.isCharacterDevice() ?
    "CharacterDevice" :
    stat.isFIFO() ?
    "FIFO" :
    stat.isSocket() ?
    "Socket" :
    "Unknown",
  mtime: Option.fromNullable(stat.mtime),
  atime: Option.fromNullable(stat.atime),
  birthtime: Option.fromNullable(stat.birthtime),
  dev: stat.dev,
  rdev: Option.fromNullable(stat.rdev),
  ino: Option.fromNullable(stat.ino),
  mode: stat.mode,
  nlink: Option.fromNullable(stat.nlink),
  uid: Option.fromNullable(stat.uid),
  gid: Option.fromNullable(stat.gid),
  size: FileSystem.Size(stat.size),
  blksize: Option.map(Option.fromNullable(stat.blksize), FileSystem.Size),
  blocks: Option.fromNullable(stat.blocks)
})
const stat = (() => {
  const nodeStat = effectify(
    NFS.stat,
    handleErrnoException("FileSystem", "stat"),
    handleBadArgument("stat")
  )
  return (path: string) => Effect.map(nodeStat(path), makeFileInfo)
})()

// == symlink

const symlink = (() => {
  const nodeSymlink = effectify(
    NFS.symlink,
    handleErrnoException("FileSystem", "symlink"),
    handleBadArgument("symlink")
  )
  return (target: string, path: string) => nodeSymlink(target, path)
})()

// == truncate

const truncate = (() => {
  const nodeTruncate = effectify(
    NFS.truncate,
    handleErrnoException("FileSystem", "truncate"),
    handleBadArgument("truncate")
  )
  return (path: string, length?: FileSystem.SizeInput) =>
    nodeTruncate(path, length !== undefined ? Number(length) : undefined)
})()

// == utimes

const utimes = (() => {
  const nodeUtimes = effectify(
    NFS.utimes,
    handleErrnoException("FileSystem", "utime"),
    handleBadArgument("utime")
  )
  return (path: string, atime: number | Date, mtime: number | Date) => nodeUtimes(path, atime, mtime)
})()

// == watch

const watchNode = (path: string, options?: FileSystem.WatchOptions) =>
  Stream.asyncScoped<FileSystem.WatchEvent, Error.PlatformError>((emit) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const watcher = NFS.watch(path, { recursive: options?.recursive }, (event, path) => {
          if (!path) return
          switch (event) {
            case "rename": {
              emit.fromEffect(Effect.matchEffect(stat(path), {
                onSuccess: (_) => Effect.succeed(FileSystem.WatchEventCreate({ path })),
                onFailure: (err) =>
                  err._tag === "SystemError" && err.reason === "NotFound"
                    ? Effect.succeed(FileSystem.WatchEventRemove({ path }))
                    : Effect.fail(err)
              }))
              return
            }
            case "change": {
              emit.single(FileSystem.WatchEventUpdate({ path }))
              return
            }
          }
        })
        watcher.on("error", (error) => {
          emit.fail(
            new Error.SystemError({
              module: "FileSystem",
              reason: "Unknown",
              method: "watch",
              pathOrDescriptor: path,
              cause: error
            })
          )
        })
        watcher.on("close", () => {
          emit.end()
        })
        return watcher
      }),
      (watcher) => Effect.sync(() => watcher.close())
    )
  )

const watch = (
  backend: Option.Option<Context.Tag.Service<FileSystem.WatchBackend>>,
  path: string,
  options?: FileSystem.WatchOptions
) =>
  stat(path).pipe(
    Effect.map((stat) =>
      backend.pipe(
        Option.flatMap((_) => _.register(path, stat, options)),
        Option.getOrElse(() => watchNode(path, options))
      )
    ),
    Stream.unwrap
  )

// == writeFile

const writeFile = (path: string, data: Uint8Array, options?: FileSystem.WriteFileOptions) =>
  Effect.async<void, Error.PlatformError>((resume, signal) => {
    try {
      NFS.writeFile(path, data, {
        signal,
        flag: options?.flag,
        mode: options?.mode
      }, (err) => {
        if (err) {
          resume(Effect.fail(handleErrnoException("FileSystem", "writeFile")(err, [path])))
        } else {
          resume(Effect.void)
        }
      })
    } catch (err) {
      resume(Effect.fail(handleBadArgument("writeFile")(err)))
    }
  })

const makeFileSystem = Effect.map(Effect.serviceOption(FileSystem.WatchBackend), (backend) =>
  FileSystem.make({
    access,
    chmod,
    chown,
    copy,
    copyFile,
    link,
    makeDirectory,
    makeTempDirectory,
    makeTempDirectoryScoped,
    makeTempFile,
    makeTempFileScoped,
    open,
    readDirectory,
    readFile,
    readLink,
    realPath,
    remove,
    rename,
    stat,
    symlink,
    truncate,
    utimes,
    watch(path, options) {
      return watch(backend, path, options)
    },
    writeFile
  }))

/** @internal */
export const layer = Layer.effect(FileSystem.FileSystem, makeFileSystem)
