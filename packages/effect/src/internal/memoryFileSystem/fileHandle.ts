/** @internal */
import * as Effect from "../../Effect.ts"
import * as FileSystem from "../../FileSystem.ts"
import * as Option from "../../Option.ts"
import * as Predicate from "../../Predicate.ts"
import * as Semaphore from "../../Semaphore.ts"
import type * as Vfs from "../../virtual-file-system/VirtualFileSystem.ts"
import { argumentError, info, openOptions, resourceError, sizeInput, toPlatformError } from "./support.ts"

/** @internal */
export const makeOpen = (caller: Vfs.VirtualFileSystem): FileSystem.FileSystem["open"] => {
  let nextDescriptor = 3

  return Effect.fnUntraced(function*(path, options) {
    const chosen = yield* openOptions(options?.flag ?? "r", options?.mode, "open")

    const handle = yield* caller.open(path, { ...chosen, noFollow: options?.noFollow }).pipe(
      Effect.mapError((error) => toPlatformError(error, "open", path))
    )

    const fd = nextDescriptor++
    let position = BigInt(0)
    let closed = false
    const gate = Semaphore.makeUnsafe(1)
    const locked = <A, E, R>(effect: Effect.Effect<A, E, R>) => gate.withPermit(Effect.uninterruptible(effect))
    yield* Effect.addFinalizer(() =>
      locked(Effect.sync(() => {
        closed = true
      }))
    )

    const read = Effect.fnUntraced(function*(length: number, method: string, explicitPosition?: bigint) {
      if (closed) return yield* resourceError(method, fd)

      const offset = explicitPosition ?? position

      if (explicitPosition !== undefined && (!Predicate.isBigInt(explicitPosition) || explicitPosition < BigInt(0))) {
        return yield* argumentError(method, "position must be a non-negative bigint")
      }

      if (
        explicitPosition === undefined && length > 0 && (offset < BigInt(0) || offset > BigInt(Number.MAX_SAFE_INTEGER))
      ) {
        return yield* resourceError(method, fd, "Invalid file position")
      }

      const bytes = yield* handle.readAlloc(length, {
        position: length === 0 && explicitPosition === undefined ? BigInt(0) : offset
      }).pipe(
        Effect.mapError((error) => toPlatformError(error, method, fd))
      )

      if (explicitPosition === undefined) position += BigInt(bytes.length)

      return bytes
    })

    const write = Effect.fnUntraced(function*(input: Uint8Array, method: string) {
      // Copy the view so writes accept ArrayBuffer- and SharedArrayBuffer-backed input.
      const bytes = new Uint8Array(input)

      return yield* locked(Effect.gen(function*() {
        if (closed) return yield* resourceError(method, fd)

        if (bytes.length > 0 && (position < BigInt(0) || position > BigInt(Number.MAX_SAFE_INTEGER))) {
          return yield* resourceError(method, fd, "Invalid file position")
        }

        yield* (chosen.append
          ? handle.write(bytes)
          : handle.write(bytes, { position: bytes.length === 0 ? BigInt(0) : position })).pipe(
            Effect.mapError((error) => toPlatformError(error, method, fd))
          )
        if (!chosen.append) position += BigInt(bytes.length)
        return bytes.length
      }))
    })

    return {
      [FileSystem.FileTypeId]: FileSystem.FileTypeId,
      stat: handle.stat().pipe(
        Effect.mapError((error) => toPlatformError(error, "stat", fd)),
        Effect.flatMap((value) => info(value.metadata, caller.instanceNumber, "stat", fd))
      ),
      sync: Effect.asVoid(handle.stat()).pipe(Effect.mapError((error) => toPlatformError(error, "sync", fd))),
      seek: Effect.fnUntraced(function*(offset, from) {
        return yield* locked(Effect.gen(function*() {
          if (closed) return BigInt(0)
          const next = from === "start" ? offset : position + offset

          if (next < BigInt(0)) {
            return yield* argumentError("seek", "Cannot seek before the start of the file")
          }

          position = next

          return next
        }))
      }),
      read: Effect.fnUntraced(function*(buffer, options) {
        return yield* locked(Effect.gen(function*() {
          const bytes = yield* read(buffer.length, "read", options?.position)
          buffer.set(bytes)

          return bytes.length
        }))
      }),
      readAlloc: Effect.fnUntraced(function*(size, options) {
        const length = yield* sizeInput(size, "readAlloc")

        return yield* locked(
          Effect.map(
            read(Number(length), "readAlloc", options?.position),
            (bytes) => bytes.length === 0 ? Option.none() : Option.some(bytes)
          )
        )
      }),
      truncate: Effect.fnUntraced(function*(length) {
        const size = yield* sizeInput(length, "truncate", 0)

        return yield* locked(Effect.gen(function*() {
          yield* handle.truncate(size).pipe(Effect.mapError((error) => toPlatformError(error, "truncate", fd)))

          if (!chosen.append && position > size) position = size
        }))
      }),
      write: (buffer) => write(buffer, "write"),
      writeAll: (buffer) => Effect.asVoid(write(buffer, "writeAll"))
    } satisfies FileSystem.File
  })
}
