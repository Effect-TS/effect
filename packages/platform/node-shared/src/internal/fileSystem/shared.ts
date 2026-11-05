import * as BI from "effect/BigInt"
import * as ByteSize from "effect/ByteSize"
import * as Effect from "effect/Effect"
import { effectify } from "effect/Effect"
import type * as FileSystem from "effect/FileSystem"
import * as Option from "effect/Option"
import * as Error from "effect/PlatformError"
import * as Crypto from "node:crypto"
import * as NFS from "node:fs"
import * as OS from "node:os"
import * as Path from "node:path"
import { handleErrnoException } from "../utils.ts"

/** @internal */
export const handleBadArgument = (method: string) => (err: unknown) =>
  Error.badArgument({
    module: "FileSystem",
    method,
    description: (err as Error).message ?? String(err)
  })

const bigintToNumber = (value: bigint, field: string): number => {
  const number = Number(value)
  if (!Number.isSafeInteger(number)) {
    throw new RangeError(`${field} exceeds the safe integer range: ${value}`)
  }
  return number
}

const bigintToNumberOption = (value: bigint | undefined): Option.Option<number> =>
  Option.flatMap(Option.fromNullishOr(value), BI.toNumber)

// Node fills bigint stats from a BigInt64Array, so unsigned 64-bit values such
// as dev_t and ino_t at or above 2^63 are reported as negative.
const toUint64 = (value: bigint): bigint => BigInt.asUintN(64, value)

const toUint64Option = (value: bigint | undefined): Option.Option<bigint> =>
  Option.map(Option.fromNullishOr(value), toUint64)

// fs.write ignores bigint positions.
/** @internal */
export const positionToNumber = (position: bigint, method: string) =>
  Effect.try({
    try: () => bigintToNumber(position, "position"),
    catch: handleBadArgument(method)
  })

// == makeTempDirectory

/** @internal */
export const makeTempDirectoryFactory = (method: string): FileSystem.Shape["makeTempDirectory"] => {
  const nodeMkdtemp = effectify(
    NFS.mkdtemp,
    handleErrnoException("FileSystem", method),
    handleBadArgument(method)
  )
  return (options) =>
    Effect.suspend(() => {
      const prefix = options?.prefix ?? ""
      const directory = typeof options?.directory === "string"
        ? Path.join(options.directory, ".")
        : OS.tmpdir()

      return nodeMkdtemp(prefix ? Path.join(directory, prefix) : directory + "/")
    })
}

// == remove

/** @internal */
export const removeFactory = (method: string): FileSystem.Shape["remove"] => {
  const nodeRm = effectify(
    NFS.rm,
    handleErrnoException("FileSystem", method),
    handleBadArgument(method)
  )
  return (path, options) =>
    nodeRm(
      path,
      { recursive: options?.recursive ?? false, force: options?.force ?? false }
    )
}

// == makeTempFile

/** @internal */
export const makeTempFileFactory = (method: string): FileSystem.Shape["makeTempFile"] => {
  const makeDirectory = makeTempDirectoryFactory(method)
  return Effect.fnUntraced(function*(options) {
    const directory = yield* makeDirectory(options)
    const random = Crypto.randomBytes(6).toString("hex")
    const name = Path.join(directory, options?.suffix ? `${random}${options.suffix}` : random)
    yield* writeFile(name, new Uint8Array(0))
    return name
  })
}

// == stat

/** @internal */
export const fileType = (stat: NFS.BigIntStats | NFS.Dirent): FileSystem.File.Type =>
  stat.isFile() ?
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
    "Unknown"

/** @internal */
export const makeFileInfo = (
  stat: NFS.BigIntStats,
  method = "stat"
): Effect.Effect<FileSystem.File.Info, Error.PlatformError> =>
  Effect.try({
    try: (): FileSystem.File.Info => ({
      type: fileType(stat),
      mtime: Option.fromNullishOr(stat.mtime),
      atime: Option.fromNullishOr(stat.atime),
      birthtime: Option.fromNullishOr(stat.birthtime),
      dev: toUint64(stat.dev),
      rdev: toUint64Option(stat.rdev),
      ino: toUint64Option(stat.ino),
      mode: bigintToNumber(stat.mode, "mode"),
      nlink: toUint64Option(stat.nlink),
      uid: bigintToNumberOption(stat.uid),
      gid: bigintToNumberOption(stat.gid),
      size: ByteSize.bytes(stat.size),
      blksize: stat.blksize !== undefined ? Option.some(ByteSize.bytes(stat.blksize)) : Option.none(),
      blocks: Option.fromNullishOr(stat.blocks)
    }),
    catch: handleBadArgument(method)
  })

/** @internal */
export const statFactory = (method: string, nodeStatFn: typeof NFS.stat) => {
  const nodeStat = effectify(
    nodeStatFn,
    handleErrnoException("FileSystem", method),
    handleBadArgument(method)
  )
  return (path: string) => Effect.flatMap(nodeStat(path, { bigint: true }), (stat) => makeFileInfo(stat, method))
}

// == writeFile

/** @internal */
export const writeFile: FileSystem.Shape["writeFile"] = (path, data, options) =>
  Effect.callback<void, Error.PlatformError>((resume, signal) => {
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
