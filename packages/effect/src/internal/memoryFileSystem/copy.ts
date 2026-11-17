/** @internal */
import * as Effect from "../../Effect.ts"
import type * as FileSystem from "../../FileSystem.ts"
import * as Result from "../../Result.ts"
import * as Vfs from "../../virtual-file-system/VirtualFileSystem.ts"
import { argumentError, textPath, toPlatformError } from "./support.ts"

export const makeCopyOperations = (caller: Vfs.VirtualFileSystem) => {
  const copyFile: FileSystem.FileSystem["copyFile"] = Effect.fnUntraced(function*(source, destination) {
    return yield* Effect.scoped(Effect.gen(function*() {
      const original = yield* caller.stat(source)
      const existing = yield* Effect.result(caller.stat(destination))
      if (Result.isSuccess(existing) && Vfs.equalsObjectReference(existing.success.reference, original.reference)) {
        return
      }
      if (Result.isFailure(existing) && existing.failure._tag !== "NotFound") return yield* existing.failure
      const operation = yield* caller.acquireOperation()
      const lease = yield* operation.files.readForCopy(source, { followFinalSymlink: true })
      if (lease.value.kind !== "file") return yield* argumentError("copyFile", "source must be a regular file")
      yield* caller.writeFile(destination, lease.value.read.value, {
        create: "ifmissing",
        placement: "replace",
        mode: original.metadata.mode,
        finalMode: original.metadata.mode
      })
    })).pipe(Effect.mapError((error) => toPlatformError(error, "copyFile", source)))
  })

  const copy: FileSystem.FileSystem["copy"] = Effect.fnUntraced(function*(source, destination, options) {
    return yield* Effect.scoped(Effect.gen(function*() {
      const original = yield* caller.linkStat(source)
      const existing = yield* Effect.result(caller.linkStat(destination))
      if (Result.isFailure(existing) && existing.failure._tag !== "NotFound") return yield* existing.failure
      if (Result.isSuccess(existing)) {
        if (Vfs.equalsObjectReference(existing.success.reference, original.reference)) {
          return yield* argumentError("copy", "source and destination must differ")
        }
        if (!options?.overwrite) return yield* new Vfs.AlreadyExists({ operation: "copy", reason: "occupiedEntry" })
      }
      if (original.kind === "directory") {
        const canonical = yield* textPath(yield* caller.realPath(source), "copy", source)
        const trimmed = destination.replace(/\/+$/, "") || "/"
        const slash = trimmed.lastIndexOf("/")
        const parent = slash < 0 ? "." : slash === 0 ? "/" : trimmed.slice(0, slash)
        const resolved = yield* textPath(yield* caller.realPath(parent), "copy", destination)
        if (canonical === "/" || resolved === canonical || resolved.startsWith(`${canonical}/`)) {
          return yield* argumentError("copy", "destination is inside the source")
        }
      }
      const operation = yield* caller.acquireOperation()
      const directories: Array<{ reference: Vfs.ObjectReference; metadata: Vfs.Metadata; created: boolean }> = []
      const aliases = new Map<bigint, Vfs.ObjectReference>()
      const pending: Array<{ source: Vfs.EntryTarget; destination: Vfs.EntryTarget; root: boolean }> = [{
        source,
        destination,
        root: true
      }]
      let claimed: Vfs.ObjectReference | undefined
      let complete = false
      yield* Effect.addFinalizer(() => {
        if (complete) return Effect.void
        return Effect.gen(function*() {
          for (const directory of directories) {
            if (directory.created) {
              yield* caller.setAttributes(directory.reference, { mode: directory.metadata.mode | 0o700 }).pipe(
                Effect.ignore
              )
            }
          }
          if (claimed !== undefined) {
            const result = yield* Effect.result(
              caller.removeRecursive(destination, { entry: { expected: "present", object: claimed } })
            )
            if (
              Result.isFailure(result) && result.failure._tag !== "NotFound" &&
              result.failure._tag !== "ConditionFailed" && result.failure._tag !== "NamespaceChanged"
            ) return yield* result.failure
          }
          for (const directory of directories) {
            if (directory.created) {
              yield* caller.setAttributes(directory.reference, { mode: directory.metadata.mode }).pipe(Effect.ignore)
            }
          }
        }).pipe(Effect.orDie)
      })
      while (pending.length > 0) {
        const next = pending.pop()!
        const observed = yield* caller.linkStat(next.source)
        const metadata = observed.metadata
        if (observed.kind === "directory") {
          const listing = yield* caller.readDirents(next.source)
          const reference = yield* Effect.uninterruptible(Effect.gen(function*() {
            const made = yield* Effect.result(caller.makeDirectory(next.destination, { mode: metadata.mode | 0o700 }))
            let reference: Vfs.ObjectReference
            const created = Result.isSuccess(made)
            if (Result.isSuccess(made)) {
              reference = made.success.reference
              if (next.root && !options?.overwrite) claimed = reference
            } else {
              if (!options?.overwrite || made.failure._tag !== "AlreadyExists") return yield* made.failure
              const target = yield* caller.linkStat(next.destination)
              if (target.kind !== "directory") {
                return yield* new Vfs.InvalidResource({ operation: "copy", reason: "wrongKind" })
              }
              reference = target.reference
            }
            directories.push({ reference, metadata, created })
            return reference
          }))
          const from = yield* caller.openDirectory(observed.reference)
          const to = yield* caller.openDirectory(reference)
          for (let index = listing.entries.length - 1; index >= 0; index--) {
            const name = listing.entries[index].name
            pending.push({ source: { directory: from, name }, destination: { directory: to, name }, root: false })
          }
          continue
        }
        const alias = aliases.get(metadata.objectNumber)
        if (alias !== undefined) {
          const target = yield* Effect.result(caller.linkStat(next.destination))
          if (Result.isSuccess(target)) {
            if (!options?.overwrite) return yield* new Vfs.AlreadyExists({ operation: "copy", reason: "occupiedEntry" })
            yield* caller.unlink(next.destination, { entry: { expected: "present", object: target.success.reference } })
          } else if (target.failure._tag !== "NotFound") return yield* target.failure
          yield* caller.makeHardLink({ reference: alias }, next.destination)
          continue
        }
        const lease = yield* operation.files.readForCopy(next.source)
        const read = lease.value.read
        const times = options?.preserveTimestamps
          ? { atime: read.accessTimeBeforeRead, mtime: read.object.metadata.mtime }
          : undefined
        const written = yield* Effect.uninterruptible(Effect.gen(function*() {
          const written = lease.value.kind === "file"
            ? yield* operation.files.publishCopiedFile(next.destination, lease.value.read.value, {
              overwrite: options?.overwrite,
              mode: read.object.metadata.mode,
              preserveTimes: times
            })
            : yield* operation.files.publishCopiedSymlink(next.destination, lease.value.read.value, {
              overwrite: options?.overwrite,
              preserveTimes: times
            })
          if (next.root && !options?.overwrite) claimed = written.reference
          return written
        }))
        yield* lease.release
        if (written.metadata.mode !== read.object.metadata.mode) {
          yield* caller.setAttributes(written.reference, { mode: read.object.metadata.mode })
        }
        if (metadata.nlink > BigInt(1)) aliases.set(read.object.metadata.objectNumber, written.reference)
      }
      yield* Effect.uninterruptible(Effect.gen(function*() {
        for (let index = directories.length - 1; index >= 0; index--) {
          const directory = directories[index]
          if (directory.created) yield* caller.setAttributes(directory.reference, { mode: directory.metadata.mode })
          if (options?.preserveTimestamps) {
            yield* caller.setAttributes(directory.reference, {
              atime: directory.metadata.atime,
              mtime: directory.metadata.mtime
            })
          }
        }
        complete = true
      }))
    })).pipe(Effect.mapError((error) => toPlatformError(error, "copy", source)))
  })
  return { copy, copyFile }
}
