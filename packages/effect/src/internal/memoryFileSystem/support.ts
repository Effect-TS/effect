/** @internal */
import * as BytePath from "../../BytePath.ts"
import * as DateTime from "../../DateTime.ts"
import * as Effect from "../../Effect.ts"
import type * as FileSystem from "../../FileSystem.ts"
import * as Option from "../../Option.ts"
import * as PlatformError from "../../PlatformError.ts"
import type * as Vfs from "../../virtual-file-system/VirtualFileSystem.ts"

export const argumentError = (method: string, description: string) =>
  PlatformError.badArgument({ module: "FileSystem", method, description })

export const resourceError = (method: string, pathOrDescriptor: string | number, description?: string) =>
  PlatformError.systemError({ module: "FileSystem", method, pathOrDescriptor, _tag: "BadResource", description })

export const toPlatformError = (
  error: Vfs.VirtualFileSystemError | PlatformError.PlatformError,
  method: string,
  pathOrDescriptor: string | number
): PlatformError.PlatformError => {
  if (PlatformError.isPlatformError(error)) return error
  if (error._tag === "InvalidInput") {
    return PlatformError.badArgument({
      module: "FileSystem",
      method,
      description: `${error.field}: ${error.reason}`,
      cause: error
    })
  }
  const tags = {
    NotFound: "NotFound",
    AlreadyExists: "AlreadyExists",
    AccessDenied: "PermissionDenied",
    InvalidResource: "BadResource",
    ConditionFailed: "Busy",
    NamespaceChanged: "Busy",
    LimitExceeded: "Unknown",
    Busy: "Busy",
    ReentrantOperation: "Busy",
    CapabilityUnavailable: "Unknown",
    InvalidRestore: "InvalidData",
    Unrepresentable: "InvalidData"
  } satisfies Record<Exclude<Vfs.VirtualFileSystemError["_tag"], "InvalidInput">, PlatformError.SystemErrorTag>
  return PlatformError.systemError({
    module: "FileSystem",
    method,
    pathOrDescriptor,
    _tag: error._tag === "Busy" && error.reason === "nonemptyDirectory" ?
      "Unknown"
      : error._tag === "LimitExceeded" && ["path", "expandedPath", "name"].includes(error.domain)
      ? "InvalidData"
      : tags[error._tag],
    description: error._tag === "AccessDenied" && error.reason === "ownership" ? "NotPermitted (EPERM)" : error._tag,
    cause: error
  })
}

export const fileType = { file: "File", directory: "Directory", symlink: "SymbolicLink" } as const
const modeType = { file: 0o100000, directory: 0o040000, symlink: 0o120000 } as const

export const info = Effect.fnUntraced(
  function*(
    metadata: Vfs.Metadata,
    dev: bigint,
    method: string,
    path: string | number
  ): Effect.fn.Return<FileSystem.File.Info, PlatformError.PlatformError> {
    const date = (field: "atime" | "mtime" | "birthtime") =>
      Effect.fromResult(DateTime.unixNanoToDate(metadata[field], { precision: "truncate" })).pipe(
        Effect.map(Option.some),
        Effect.mapError(() =>
          PlatformError.systemError({
            module: "FileSystem",
            method,
            pathOrDescriptor: path,
            _tag: "InvalidData",
            description: `${field} is outside the JavaScript Date range`
          })
        )
      )
    return {
      type: fileType[metadata.kind],
      ino: Option.some(metadata.objectNumber),
      dev,
      mode: modeType[metadata.kind] | metadata.mode,
      uid: Option.some(metadata.uid),
      gid: Option.some(metadata.gid),
      nlink: Option.some(metadata.nlink),
      rdev: Option.some(BigInt(0)),
      size: metadata.size,
      blksize: Option.none(),
      blocks: Option.none(),
      atime: yield* date("atime"),
      mtime: yield* date("mtime"),
      birthtime: yield* date("birthtime")
    }
  }
)

export const textPath = (path: BytePath.BytePath, method: string, context: string | number) =>
  Effect.fromResult(BytePath.toString(path)).pipe(
    Effect.mapError((cause) =>
      PlatformError.systemError({
        module: "FileSystem",
        method,
        pathOrDescriptor: context,
        _tag: "InvalidData",
        description: "UnrepresentableName",
        cause
      })
    )
  )

export const validateMode = (mode: number | undefined, method: string) =>
  mode === undefined || (Number.isInteger(mode) && mode >= 0 && mode <= 0xffffffff)
    ? Effect.void :
    Effect.fail(argumentError(method, "mode must be an unsigned 32-bit integer"))

export const sizeInput = (size: number | undefined, method: string, defaultValue?: number) => {
  const value = size ?? defaultValue
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? Effect.succeed(BigInt(value)) :
    Effect.fail(argumentError(method, "size must be a non-negative safe integer"))
}

export const openOptions = Effect.fnUntraced(
  function*(flag: FileSystem.OpenFlag, mode: number | undefined, method: string) {
    if (!["r", "r+", "w", "wx", "w+", "wx+", "a", "ax", "a+", "ax+"].includes(flag)) {
      return yield* argumentError(method, "Unsupported open flag")
    }
    yield* validateMode(mode, method)
    const create = flag.startsWith("w") || flag.startsWith("a")
    return {
      access: flag === "r" ? "read" : flag.endsWith("+") ? "readwrite" : "write",
      create: create ? flag.includes("x") ? "exclusive" : "ifmissing" : "existing",
      mode: (mode ?? 0o644) & 0o7777,
      append: flag.startsWith("a"),
      truncate: flag.startsWith("w")
    } satisfies Vfs.OpenOptions
  }
)
