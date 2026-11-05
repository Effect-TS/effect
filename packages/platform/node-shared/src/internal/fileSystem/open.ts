import * as Effect from "effect/Effect"
import { effectify } from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Error from "effect/PlatformError"
import * as NFS from "node:fs"
import { handleErrnoException } from "../utils.ts"
import { handleBadArgument, makeFileInfo, positionToNumber } from "./shared.ts"

const openFlagBits = (flag: FileSystem.OpenFlag): number => {
  const { O_APPEND, O_CREAT, O_EXCL, O_RDONLY, O_RDWR, O_TRUNC, O_WRONLY } = NFS.constants
  switch (flag) {
    case "r":
      return O_RDONLY
    case "r+":
      return O_RDWR
    case "w":
      return O_TRUNC | O_CREAT | O_WRONLY
    case "wx":
      return O_TRUNC | O_CREAT | O_WRONLY | O_EXCL
    case "w+":
      return O_TRUNC | O_CREAT | O_RDWR
    case "wx+":
      return O_TRUNC | O_CREAT | O_RDWR | O_EXCL
    case "a":
      return O_APPEND | O_CREAT | O_WRONLY
    case "ax":
      return O_APPEND | O_CREAT | O_WRONLY | O_EXCL
    case "a+":
      return O_APPEND | O_CREAT | O_RDWR
    case "ax+":
      return O_APPEND | O_CREAT | O_RDWR | O_EXCL
  }
}

// Reject unsupported platforms: libuv silently ignores unknown flags on Windows.
const noFollowFlags = (method: string, flag: FileSystem.OpenFlag) =>
  Effect.suspend(() => {
    const { O_NOFOLLOW } = NFS.constants
    if (process.platform === "win32" || typeof O_NOFOLLOW !== "number" || O_NOFOLLOW === 0) {
      return Effect.fail(Error.badArgument({
        module: "FileSystem",
        method,
        description: "noFollow is not supported on this platform"
      }))
    }
    return Effect.succeed(openFlagBits(flag) | O_NOFOLLOW)
  })

const openFactory = (method: string): FileSystem.Shape["open"] => {
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

  return (path, options) =>
    pipe(
      Effect.acquireRelease(
        options?.noFollow === true
          ? Effect.flatMap(noFollowFlags(method, options.flag ?? "r"), (flags) => nodeOpen(path, flags, options.mode))
          : nodeOpen(path, options?.flag ?? "r", options?.mode),
        (fd) => Effect.orDie(nodeClose(fd))
      ),
      Effect.map((fd) => makeFile(fd, options?.flag?.startsWith("a") ?? false))
    )
}

const negativePosition = (method: string) =>
  Error.badArgument({
    module: "FileSystem",
    method,
    description: "Cannot read before the start of the file"
  })

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
    readonly [FileSystem.FileTypeId]: typeof FileSystem.FileTypeId
    readonly fd: number
    private readonly append: boolean

    private position: bigint = BigInt(0)

    constructor(
      fd: number,
      append: boolean
    ) {
      this[FileSystem.FileTypeId] = FileSystem.FileTypeId
      this.fd = fd
      this.append = append
    }

    get stat() {
      return Effect.flatMap(nodeStat(this.fd, { bigint: true }), makeFileInfo)
    }

    get sync() {
      return nodeSync(this.fd)
    }

    seek(offset: bigint, from: FileSystem.SeekMode) {
      return Effect.suspend(() => {
        const position = from === "start" ? offset : this.position + offset
        if (position < BigInt(0)) {
          return Effect.fail(Error.badArgument({
            module: "FileSystem",
            method: "seek",
            description: "Cannot seek before the start of the file"
          }))
        }
        this.position = position
        return Effect.succeed(position)
      })
    }

    read(buffer: Uint8Array, options?: FileSystem.File.ReadOptions) {
      return Effect.suspend(() => {
        const explicit = options?.position
        if (explicit !== undefined) {
          return explicit < BigInt(0)
            ? Effect.fail(negativePosition("read"))
            : nodeRead(this.fd, { buffer, position: explicit })
        }
        const position = this.position
        return Effect.map(
          nodeRead(this.fd, { buffer, position }),
          (bytesRead) => {
            this.position = position + BigInt(bytesRead)
            return bytesRead
          }
        )
      })
    }

    readAlloc(size: number, options?: FileSystem.File.ReadOptions) {
      return Effect.suspend(() => {
        try {
          if (!Number.isInteger(size) || size < 0) {
            throw new RangeError("size must be a non-negative integer")
          }
          const explicit = options?.position
          if (explicit !== undefined && explicit < BigInt(0)) {
            return Effect.fail(negativePosition("readAlloc"))
          }
          const buffer = Buffer.allocUnsafeSlow(size)
          const position = explicit ?? this.position
          return Effect.map(
            nodeReadAlloc(this.fd, { buffer, position }),
            (bytesRead): Option.Option<Buffer> => {
              if (bytesRead === 0) {
                return Option.none()
              }

              if (explicit === undefined) {
                this.position = position + BigInt(bytesRead)
              }
              if (bytesRead === size) {
                return Option.some(buffer)
              }

              const dst = Buffer.allocUnsafeSlow(bytesRead)
              buffer.copy(dst, 0, 0, bytesRead)
              return Option.some(dst)
            }
          )
        } catch (cause) {
          return Effect.fail(handleBadArgument("readAlloc")(cause))
        }
      })
    }

    truncate(length?: number) {
      return Effect.map(nodeTruncate(this.fd, length || undefined), () => {
        if (!this.append) {
          const len = BigInt(length ?? 0)
          if (this.position > len) {
            this.position = len
          }
        }
      })
    }

    write(buffer: Uint8Array) {
      return Effect.suspend(() => {
        const position = this.position
        return Effect.flatMap(
          this.append ? Effect.succeed(undefined) : positionToNumber(position, "write"),
          (nodePosition) =>
            Effect.map(
              nodeWrite(this.fd, buffer, undefined, undefined, nodePosition),
              (bytesWritten) => {
                if (!this.append) {
                  this.position = position + BigInt(bytesWritten)
                }
                return bytesWritten
              }
            )
        )
      })
    }

    private writeAllChunk(buffer: Uint8Array): Effect.Effect<void, Error.PlatformError> {
      return Effect.suspend(() => {
        const position = this.position
        return Effect.flatMap(
          this.append ? Effect.succeed(undefined) : positionToNumber(position, "writeAll"),
          (nodePosition) =>
            Effect.flatMap(
              nodeWriteAll(this.fd, buffer, undefined, undefined, nodePosition),
              (bytesWritten) => {
                if (bytesWritten === 0) {
                  return Effect.fail(
                    Error.systemError({
                      module: "FileSystem",
                      method: "writeAll",
                      _tag: "WriteZero",
                      pathOrDescriptor: this.fd,
                      description: "write returned 0 bytes written"
                    })
                  )
                }

                if (!this.append) {
                  this.position = position + BigInt(bytesWritten)
                }

                return bytesWritten < buffer.length ? this.writeAllChunk(buffer.subarray(bytesWritten)) : Effect.void
              }
            )
        )
      })
    }

    writeAll(buffer: Uint8Array) {
      return buffer.length === 0 ? Effect.void : this.writeAllChunk(buffer)
    }
  }

  return (fd: number, append: boolean): FileSystem.File => new FileImpl(fd, append)
})()

const open = openFactory("open")

/** @internal */
export const layer = Layer.succeed(FileSystem.open, open)
