import { assert, describe, it } from "@effect/vitest"
import { BytePath, Cause, Clock, DateTime, Effect, Exit, Result, Schema, Stream } from "effect"
import type * as Scope from "effect/Scope"
import { TestClock } from "effect/testing"
import * as VFS from "effect/virtual-file-system/VirtualFileSystem"

const credentials = { uid: 0, gid: 0 }
const withClock = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.flatMap(
    Clock.Clock,
    (clock) => effect.pipe(Effect.provideService<Clock.Clock, Clock.Clock>(Clock.Clock, clock))
  )
const text = (path: BytePath.BytePath) => Result.getOrThrow(BytePath.toString(path))
const transientFailure = (error: VFS.OperationError): void => {
  assert.strictEqual(error._tag, "LimitExceeded")
  if (error._tag === "LimitExceeded") assert.strictEqual(error.domain, "transient")
}
const pressure = Effect.fnUntraced(function*(caller: VFS.VirtualFileSystem, available: number) {
  const operation = yield* caller.acquireOperation()
  const hold = yield* operation.budget.reservePayload(64 - available)
  return { operation, hold, reserved: BigInt(64 - available) }
})
const time = DateTime.unixNanoFromNanoseconds(-1n)
const semantic = (objectNumber: bigint, mode: number): VFS.SemanticMetadata => ({
  objectNumber,
  mode,
  uid: 0,
  gid: 0,
  atime: time,
  mtime: time,
  ctime: time,
  birthtime: time
})
const records = (data: Uint8Array): ReadonlyArray<VFS.CaptureRecord> => [
  { _tag: "root", id: 1n, metadata: semantic(1n, 0o755) },
  {
    _tag: "file",
    id: 2n,
    parentId: 1n,
    name: Result.getOrThrow(BytePath.fromString("f")),
    data,
    metadata: semantic(2n, 0o644)
  }
]
const create = (caller: VFS.VirtualFileSystem) => Effect.asVoid(caller.createFile("/f"))
const write = (caller: VFS.VirtualFileSystem) => caller.writeFile("/f", new Uint8Array([1, 2]))
interface Boundary {
  readonly field: keyof VFS.LimitOptions
  readonly required: number
  readonly prepare?: (caller: VFS.VirtualFileSystem) => Effect.Effect<unknown, VFS.OperationError>
  readonly run: (caller: VFS.VirtualFileSystem) => Effect.Effect<unknown, VFS.OperationError, Scope.Scope>
}
const boundaries: ReadonlyArray<Boundary> = [
  { field: "objects", required: 2, run: create },
  { field: "entries", required: 1, run: create },
  {
    field: "handles",
    required: 1,
    prepare: create,
    run: (caller) => Effect.flatMap(caller.open("/f"), (handle) => handle.close())
  },
  { field: "nameBytes", required: 2, run: (caller) => caller.createFile("/ff") },
  { field: "pathBytes", required: 2, run: create },
  { field: "expandedPathBytes", required: 2, prepare: create, run: (caller) => caller.stat("/f") },
  {
    field: "symlinkFollows",
    required: 1,
    prepare: (caller) => Effect.andThen(create(caller), caller.makeSymlink("/l", "f")),
    run: (caller) => caller.stat("/l")
  },
  { field: "fileBytes", required: 2, run: write },
  { field: "contentBytes", required: 2, run: write },
  { field: "ioBytes", required: 2, run: write }
]

describe("VirtualFileSystem finite limits", () => {
  it.effect("should reject a current oversized input before copying when its address getter grows the backing buffer", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make({ limits: { ioBytes: 2, transientBytes: 3 } })
      const caller = yield* owner.authorize({ credentials })
      const file = yield* caller.createFile("/f")
      yield* caller.writeFile(file.reference, new Uint8Array([1]))
      const before = yield* caller.stat(file.reference)
      const usage = yield* owner.usage
      const backing = new ArrayBuffer(1, { maxByteLength: 4 })
      const input = new Uint8Array(backing)
      input[0] = 8
      const target = {
        directory: "/",
        get name() {
          backing.resize(4)
          return "f"
        }
      }
      const error = yield* Effect.flip(caller.writeFile(target, input))
      assert.strictEqual(error._tag, "LimitExceeded")
      if (error._tag === "LimitExceeded") {
        assert.strictEqual(error.domain, "io")
        assert.strictEqual(error.stage, "admission")
      }
      assert.deepStrictEqual(yield* caller.stat(file.reference), before)
      assert.deepStrictEqual(yield* owner.usage, usage)
      assert.deepStrictEqual(yield* caller.readFile(file.reference), new Uint8Array([1]))
    }).pipe(withClock))

  it.effect("should return a typed range failure without publication when a truncate length cannot be represented", () =>
    Effect.gen(function*() {
      const length = BigInt(Number.MAX_SAFE_INTEGER) + 1n
      const owner = yield* VFS.make({
        limits: { synchronous: true, fileBytes: length, contentBytes: length, transientBytes: length * 2n }
      })
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", new Uint8Array([7]))
      const before = yield* caller.stat("/file")
      const sync = yield* caller.acquireSync
      assert.strictEqual((yield* Effect.flip(caller.truncate("/file", length)))._tag, "InvalidInput")
      const result = sync.truncate("/file", length)
      assert.isTrue(Result.isFailure(result))
      if (Result.isFailure(result)) assert.strictEqual(result.failure._tag, "InvalidInput")
      assert.deepStrictEqual(yield* caller.stat("/file"), before)
      assert.deepStrictEqual(yield* caller.readFile("/file"), new Uint8Array([7]))
      assert.strictEqual((yield* owner.usage).reservedTransientBytes, 0n)
    }).pipe(withClock))

  for (const boundary of boundaries) {
    it.effect(`should enforce ${boundary.field} independently when capacity is below or at the required amount`, () =>
      Effect.gen(function*() {
        for (const value of [boundary.required - 1, boundary.required]) {
          const owner = yield* VFS.make({ limits: { [boundary.field]: value } })
          const caller = yield* owner.authorize({ credentials })
          if (boundary.prepare) yield* boundary.prepare(caller)
          const before = yield* caller.stat("/")
          const usage = yield* owner.usage
          const result = yield* Effect.result(boundary.run(caller))
          if (value < boundary.required) {
            assert.isTrue(Result.isFailure(result))
            if (Result.isFailure(result)) {
              assert.strictEqual(
                result.failure._tag,
                boundary.field === "symlinkFollows" ? "InvalidResource" : "LimitExceeded"
              )
            }
            assert.isTrue(VFS.equalsObjectRevision(before.revision, (yield* caller.stat("/")).revision))
            assert.deepStrictEqual(yield* owner.usage, usage)
          } else assert.isTrue(Result.isSuccess(result))
          assert.strictEqual((yield* owner.usage).operations, 0)
          assert.strictEqual((yield* owner.usage).reservedTransientBytes, 0n)
        }
      }).pipe(withClock))
  }

  it.effect("should share one symlink-follow budget when an address resolves intermediate and final links", () =>
    Effect.gen(function*() {
      for (const symlinkFollows of [3, 4]) {
        const owner = yield* VFS.make({ limits: { symlinkFollows } })
        const caller = yield* owner.authorize({ credentials })
        yield* caller.makeDirectory("/dir")
        yield* caller.makeDirectory("/dir2")
        yield* caller.writeFile("/dir2/end", new Uint8Array([8]))
        yield* caller.makeSymlink("/mid", "dir")
        yield* caller.makeSymlink("/mid2", "dir2")
        yield* caller.makeSymlink("/dir/leaf", "../mid2/end")
        yield* caller.makeSymlink("/link", "mid/leaf")
        if (symlinkFollows < 4) {
          const error = yield* Effect.flip(caller.open("/link"))
          assert.strictEqual(error._tag, "InvalidResource")
          if (error._tag === "InvalidResource") assert.strictEqual(error.reason, "symlinkLimit")
          assert.strictEqual((yield* owner.usage).handles, 0)
        } else {
          const handle = yield* caller.open("/link")
          assert.deepStrictEqual(yield* handle.readAlloc(1), new Uint8Array([8]))
        }
      }
    }).pipe(withClock))

  it.effect("should reject malformed limit and usage counts when public schemas require finite coherent values", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const usage = yield* owner.usage
      assert.isTrue(Schema.is(VFS.Limits)(owner.limits))
      assert.isTrue(Schema.is(VFS.Usage)(usage))
      assert.isFalse(Schema.is(VFS.Limits)({ ...owner.limits, operations: Number.NaN }))
      assert.isFalse(Schema.is(VFS.Limits)({ ...owner.limits, nameBytes: 0n }))
      assert.isFalse(Schema.is(VFS.Usage)({ ...usage, callers: 0.5 }))
      assert.isFalse(Schema.is(VFS.Usage)({ ...usage, unreachableRetainedObjects: usage.liveObjects + 1 }))
    }).pipe(withClock))

  it.effect("should keep inspection and cleanup available when resource and payload capacity is full", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make({ limits: { callers: 2, handles: 1, operations: 1, transientBytes: 16 } })
      const caller = yield* owner.authorize({ credentials })
      const handle = yield* caller.open("/f", { access: "readwrite", create: "ifmissing" })
      const operation = yield* caller.acquireOperation()
      yield* operation.budget.reservePayload(16)
      const saturated = yield* owner.usage
      assert.strictEqual(saturated.callers, 2)
      assert.strictEqual(saturated.handles, 1)
      assert.strictEqual(saturated.operations, 1)
      assert.strictEqual(saturated.reservedTransientBytes, owner.limits.transientBytes)
      assert.strictEqual((yield* Effect.flip(owner.authorize({ credentials })))._tag, "LimitExceeded")
      assert.strictEqual((yield* Effect.flip(caller.stat("/")))._tag, "LimitExceeded")
      assert.deepStrictEqual(yield* owner.usage, saturated)
      yield* handle.close()
      assert.strictEqual((yield* owner.usage).handles, 0)
      yield* operation.close
      const after = yield* owner.usage
      assert.strictEqual(after.callers, 1)
      assert.strictEqual(after.operations, 0)
      assert.strictEqual(after.reservedTransientBytes, 0n)
      assert.strictEqual((yield* caller.stat("/f")).metadata.size, 0n)
    }).pipe(withClock))

  it.effect("should reserve the complete write payload before publication when transient capacity reaches its boundary", () =>
    Effect.gen(function*() {
      for (const transientBytes of [6, 7]) {
        const owner = yield* VFS.make({ limits: { transientBytes } })
        const caller = yield* owner.authorize({ credentials })
        const before = yield* caller.stat("/")
        const usage = yield* owner.usage
        const result = yield* Effect.result(write(caller))
        if (transientBytes < 7) {
          assert.isTrue(Result.isFailure(result))
          if (Result.isFailure(result)) transientFailure(result.failure)
          assert.strictEqual((yield* Effect.flip(caller.stat("/f")))._tag, "NotFound")
          assert.isTrue(VFS.equalsObjectRevision(before.revision, (yield* caller.stat("/")).revision))
          assert.deepStrictEqual(yield* owner.usage, usage)
        } else {
          assert.isTrue(Result.isSuccess(result))
          assert.deepStrictEqual(yield* caller.readFile("/f"), new Uint8Array([1, 2]))
          assert.strictEqual((yield* owner.usage).contentBytes, 2n)
        }
        assert.strictEqual((yield* owner.usage).reservedTransientBytes, 0n)
      }
    }).pipe(withClock))

  for (const placement of ["replace", "start", "append"] as const) {
    it.effect(`should reserve the complete ${placement} candidate when a write competes with an external hold`, () =>
      Effect.gen(function*() {
        const required = placement === "replace" ? 6 : placement === "start" ? 7 : 9
        for (const available of [required - 1, required]) {
          const owner = yield* VFS.make({ limits: { transientBytes: 64 } })
          const caller = yield* owner.authorize({ credentials })
          yield* caller.writeFile("/f", new Uint8Array([1, 2, 3]))
          const before = yield* caller.stat("/f")
          const { hold, operation, reserved } = yield* pressure(caller, available)
          yield* TestClock.adjust("1 second")
          const write = operation.files.writeFile("/f", new Uint8Array([9, 8]), { create: "existing", placement })
          if (available < required) {
            transientFailure(yield* Effect.flip(write))
            const after = yield* caller.stat("/f")
            assert.deepStrictEqual(after.metadata, before.metadata)
            assert.isTrue(VFS.equalsObjectRevision(after.revision, before.revision))
          } else {
            yield* write
            assert.isFalse(VFS.equalsObjectRevision((yield* caller.stat("/f")).revision, before.revision))
          }
          assert.strictEqual((yield* owner.usage).reservedTransientBytes, reserved)
          yield* hold.release
          yield* operation.close
          assert.strictEqual((yield* owner.usage).reservedTransientBytes, 0n)
          assert.deepStrictEqual(
            yield* caller.readFile("/f"),
            available < required ?
              new Uint8Array([1, 2, 3]) :
              placement === "replace"
              ? new Uint8Array([9, 8])
              : placement === "start"
              ? new Uint8Array([9, 8, 3])
              : new Uint8Array([1, 2, 3, 9, 8])
          )
        }
      }).pipe(withClock))
  }

  it.effect("should retain truncation state and zero-fill regrowth when the complete candidate exhausts capacity", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make({ limits: { transientBytes: 12 } })
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/f", new Uint8Array([1, 2, 3, 4]))
      const reference = yield* caller.lookup("/f")
      const operation = yield* caller.acquireOperation()
      const hold = yield* operation.budget.reservePayload(9)
      yield* caller.truncate(reference, 3)
      const before = yield* caller.stat(reference)
      transientFailure(yield* Effect.flip(caller.truncate(reference, 4)))
      assert.isTrue(VFS.equalsObjectRevision(before.revision, (yield* caller.stat(reference)).revision))
      assert.strictEqual((yield* owner.usage).reservedTransientBytes, 9n)
      yield* hold.release
      yield* caller.truncate(reference, 4)
      assert.deepStrictEqual(yield* caller.readFile(reference), new Uint8Array([1, 2, 3, 0]))
      assert.strictEqual((yield* owner.usage).contentBytes, 4n)
    }).pipe(withClock))

  it.effect("should count zero-filled gaps once per object when hard links share content capacity", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make({ limits: { contentBytes: 4, fileBytes: 8 } })
      const caller = yield* owner.authorize({ credentials })
      const handle = yield* caller.open("/f", { access: "readwrite", create: "ifmissing" })
      yield* handle.write(new Uint8Array([9]), { position: 3n })
      yield* caller.makeHardLink({ entry: "/f" }, "/alias")
      assert.deepStrictEqual(yield* caller.readFile("/alias"), new Uint8Array([0, 0, 0, 9]))
      const before = yield* handle.stat()
      const position = yield* handle.position()
      const error = yield* Effect.flip(handle.write(new Uint8Array([8]), { position: 4n }))
      assert.strictEqual(error._tag, "LimitExceeded")
      if (error._tag === "LimitExceeded") assert.strictEqual(error.domain, "content")
      assert.isTrue(VFS.equalsObjectRevision(before.revision, (yield* handle.stat()).revision))
      assert.strictEqual(yield* handle.position(), position)
      assert.strictEqual((yield* owner.usage).contentBytes, 4n)
      assert.strictEqual((yield* owner.usage).entries, 2)
    }).pipe(withClock))

  it.effect("should reserve the requested read count without moving the cursor when EOF output is smaller", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make({ limits: { transientBytes: 4, ioBytes: 4 } })
      const caller = yield* owner.authorize({ credentials })
      const handle = yield* caller.open("/f", { access: "readwrite", create: "ifmissing" })
      yield* handle.seek({ from: "start", offset: 100n })
      const before = yield* handle.stat()
      const operation = yield* caller.acquireOperation()
      const hold = yield* operation.budget.reservePayload(1)
      yield* TestClock.adjust("1 second")
      transientFailure(yield* Effect.flip(handle.readAlloc(4)))
      assert.strictEqual(yield* handle.position(), 100n)
      assert.isTrue(VFS.equalsObjectRevision(before.revision, (yield* handle.stat()).revision))
      assert.strictEqual((yield* owner.usage).reservedTransientBytes, 1n)
      yield* hold.release
      assert.deepStrictEqual(yield* handle.readAlloc(4), new Uint8Array(0))
      assert.strictEqual(yield* handle.position(), 100n)
      assert.isTrue((yield* handle.stat()).metadata.atime > before.metadata.atime)
    }).pipe(withClock))

  it.effect("should charge the created name and returned receipt separately when directory publication reaches its payload limit", () =>
    Effect.gen(function*() {
      const name = "x".repeat(255)
      for (const transientBytes of [765, 766]) {
        const owner = yield* VFS.make({ limits: { transientBytes } })
        const caller = yield* owner.authorize({ credentials })
        const before = yield* caller.stat("/")
        const result = yield* Effect.result(caller.makeDirectoryEntry(`/${name}`))
        if (transientBytes < 766) {
          assert.isTrue(Result.isFailure(result))
          assert.isTrue(VFS.equalsObjectRevision(before.revision, (yield* caller.stat("/")).revision))
          assert.strictEqual((yield* owner.usage).entries, 0)
        } else {
          assert.isTrue(Result.isSuccess(result))
          if (Result.isSuccess(result)) assert.strictEqual(text(result.success.name), name)
        }
        assert.strictEqual((yield* owner.usage).reservedTransientBytes, 0n)
      }
    }).pipe(withClock))
})

describe("VirtualFileSystem complete read payloads", () => {
  it.effect("should reserve the literal target output atomically when readLink competes with external payload", () =>
    Effect.gen(function*() {
      for (const available of [8, 9]) {
        const owner = yield* VFS.make({ limits: { transientBytes: 64 } })
        const caller = yield* owner.authorize({ credentials })
        yield* caller.makeSymlink("/l", "é/😀")
        const before = yield* caller.linkStat("/l")
        const { hold, operation, reserved } = yield* pressure(caller, available)
        yield* TestClock.adjust("1 second")
        if (available < 9) {
          transientFailure(yield* Effect.flip(caller.readLink("/l")))
          assert.deepStrictEqual((yield* caller.linkStat("/l")).metadata, before.metadata)
        } else {
          assert.strictEqual(text(yield* caller.readLink("/l")), "é/😀")
          assert.isTrue((yield* caller.linkStat("/l")).metadata.atime > before.metadata.atime)
        }
        assert.strictEqual((yield* owner.usage).reservedTransientBytes, reserved)
        yield* hold.release
        yield* operation.close
      }
    }).pipe(withClock))

  it.effect("should reserve the complete canonical path when resolving through a shorter symlink", () =>
    Effect.gen(function*() {
      for (const available of [9, 10]) {
        const owner = yield* VFS.make({ limits: { transientBytes: 64 } })
        const caller = yield* owner.authorize({ credentials })
        yield* caller.makeDirectory("/é")
        yield* caller.createFile("/é/😀")
        yield* caller.makeSymlink("/l", "é/😀")
        const before = yield* caller.linkStat("/l")
        const { hold, operation, reserved } = yield* pressure(caller, available)
        if (available < 10) transientFailure(yield* Effect.flip(caller.realPath("/l")))
        else assert.strictEqual(text(yield* caller.realPath("/l")), "/é/😀")
        assert.deepStrictEqual((yield* caller.linkStat("/l")).metadata, before.metadata)
        assert.strictEqual((yield* owner.usage).reservedTransientBytes, reserved)
        yield* hold.release
        yield* operation.close
      }
    }).pipe(withClock))

  for (const kind of ["minimal", "rich"] as const) {
    it.effect(`should publish a complete ${kind} listing when all exact names fit the transient budget`, () =>
      Effect.gen(function*() {
        for (const available of [7, 8]) {
          const owner = yield* VFS.make({ limits: { transientBytes: 64 } })
          const caller = yield* owner.authorize({ credentials })
          yield* caller.makeDirectory("/d")
          yield* caller.createFile("/d/é")
          yield* caller.createFile("/d/😀")
          const before = yield* caller.stat("/d")
          const { hold, operation, reserved } = yield* pressure(caller, available)
          yield* TestClock.adjust("1 second")
          const read = kind === "minimal" ?
            Effect.map(caller.readDirectory("/d"), (listing) => listing.names.map(text)) :
            Effect.map(caller.readDirectoryEntries("/d"), (listing) => listing.entries.map((entry) => text(entry.name)))
          if (available < 8) {
            transientFailure(yield* Effect.flip(read))
            assert.deepStrictEqual((yield* caller.stat("/d")).metadata, before.metadata)
          } else {
            assert.deepStrictEqual(yield* read, ["é", "😀"])
            assert.isTrue((yield* caller.stat("/d")).metadata.atime > before.metadata.atime)
          }
          assert.strictEqual((yield* owner.usage).reservedTransientBytes, reserved)
          yield* hold.release
          yield* operation.close
        }
      }).pipe(withClock))
  }

  it.effect("should retain independent byte and string holds when preparing a budget-aware text read", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make({ limits: { transientBytes: 8 } })
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/f", new Uint8Array([65]))
      const before = yield* caller.stat("/f")
      const operation = yield* caller.acquireOperation()
      const staging = yield* operation.budget.reservePayload(6)
      yield* TestClock.adjust("1 second")
      transientFailure(yield* Effect.flip(operation.files.readForText(before.reference)))
      assert.strictEqual((yield* caller.stat(before.reference)).metadata.atime, before.metadata.atime)
      assert.strictEqual((yield* owner.usage).reservedTransientBytes, 6n)
      yield* staging.release
      const read = yield* operation.files.readForText(before.reference)
      assert.deepStrictEqual(read.bytes.value, new Uint8Array([65]))
      assert.strictEqual((yield* owner.usage).reservedTransientBytes, 3n)
      yield* read.bytes.release
      assert.strictEqual((yield* owner.usage).reservedTransientBytes, 2n)
      yield* read.bytes.release
      yield* read.output.release
      assert.strictEqual((yield* owner.usage).reservedTransientBytes, 0n)
      assert.isTrue((yield* caller.stat(before.reference)).metadata.atime > before.metadata.atime)
    }).pipe(withClock))

  it.effect("should count complete alias reads cumulatively when their payload holds have been released", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/f", new Uint8Array([1, 2, 3]))
      yield* caller.makeHardLink({ entry: "/f" }, "/alias")
      const operation = yield* caller.acquireOperation({ maxCopyBytes: 5 })
      const first = yield* operation.files.readForCopy("/f")
      assert.strictEqual((yield* owner.usage).reservedTransientBytes, 3n)
      yield* first.release
      const error = yield* Effect.flip(operation.files.readForCopy("/alias"))
      assert.strictEqual(error._tag, "LimitExceeded")
      if (error._tag === "LimitExceeded") assert.strictEqual(error.domain, "copyBytes")
      assert.strictEqual((yield* owner.usage).reservedTransientBytes, 0n)
      const another = yield* caller.acquireOperation({ maxCopyBytes: 6 })
      const a = yield* another.files.readForCopy("/f")
      const b = yield* another.files.readForCopy("/alias")
      assert.strictEqual((yield* owner.usage).reservedTransientBytes, 6n)
      if (a.value.kind === "file") a.value.read.value[0] = 99
      assert.deepStrictEqual(yield* caller.readFile("/f"), new Uint8Array([1, 2, 3]))
      if (b.value.kind === "file") assert.deepStrictEqual(b.value.read.value, new Uint8Array([1, 2, 3]))
      yield* another.close
      assert.strictEqual((yield* owner.usage).reservedTransientBytes, 0n)
    }).pipe(withClock))

  it.effect("should retain source payload alongside destination charges when publishing a copied file", () =>
    Effect.gen(function*() {
      for (const reserved of [53, 52]) {
        const owner = yield* VFS.make({ limits: { transientBytes: 64 } })
        const caller = yield* owner.authorize({ credentials })
        yield* caller.writeFile("/s", new Uint8Array([1, 2, 3]))
        const operation = yield* caller.acquireOperation()
        const manual = yield* operation.budget.reservePayload(reserved)
        const source = yield* operation.files.readForCopy("/s")
        assert.strictEqual(source.value.kind, "file")
        if (source.value.kind !== "file") return
        assert.strictEqual((yield* owner.usage).reservedTransientBytes, BigInt(reserved + 3))
        const write = operation.files.publishCopiedFile("/c", source.value.read.value)
        if (reserved === 53) {
          transientFailure(yield* Effect.flip(write))
          assert.strictEqual((yield* Effect.flip(caller.stat("/c")))._tag, "NotFound")
        } else yield* write
        assert.strictEqual((yield* owner.usage).reservedTransientBytes, BigInt(reserved + 3))
        yield* manual.release
        yield* source.release
        if (reserved === 52) assert.deepStrictEqual(yield* caller.readFile("/c"), new Uint8Array([1, 2, 3]))
        yield* operation.close
        assert.strictEqual((yield* owner.usage).reservedTransientBytes, 0n)
      }
    }).pipe(withClock))

  it.effect("should observe literal symlink bytes unless following is requested when preparing a copy read", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/f", new Uint8Array([4, 5]))
      yield* caller.makeSymlink("/link", "f")
      const prior = yield* caller.linkStat("/link")
      yield* TestClock.adjust("1 second")
      const operation = yield* caller.acquireOperation()
      const literal = yield* operation.files.readForCopy("/link")
      assert.strictEqual(literal.value.kind, "symlink")
      if (literal.value.kind === "symlink") {
        assert.strictEqual(text(literal.value.read.value), "f")
        assert.strictEqual(literal.value.read.object.kind, "symlink")
        assert.strictEqual(literal.value.read.accessTimeBeforeRead, prior.metadata.atime)
      }
      const followed = yield* operation.files.readForCopy("/link", { followFinalSymlink: true })
      assert.strictEqual(followed.value.kind, "file")
      if (followed.value.kind === "file") assert.deepStrictEqual(followed.value.read.value, new Uint8Array([4, 5]))
      yield* literal.release
      yield* followed.release
    }).pipe(withClock))

  it.effect("should release undelivered read holds while retaining manual holds and consumed work when the captured Clock defects", () =>
    Effect.gen(function*() {
      const clock = yield* Clock.Clock
      const defect = new Error("read clock defect")
      let fail = false
      const supplied: Clock.Clock = {
        ...clock,
        currentTimeNanosUnsafe: () => {
          if (fail) throw defect
          return clock.currentTimeNanosUnsafe()
        }
      }
      const owner = yield* VFS.make().pipe(Effect.provideService(Clock.Clock, supplied))
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/f", new Uint8Array([1]))
      const before = yield* caller.stat("/f")
      const operation = yield* caller.acquireOperation({ maxCopyBytes: 1 })
      const manual = yield* operation.budget.reservePayload(5)
      fail = true
      for (
        const read of [
          Effect.asVoid(operation.files.readForText(before.reference)),
          Effect.asVoid(operation.files.readForCopy("/f"))
        ]
      ) {
        const exit = yield* Effect.exit(read)
        assert.isTrue(Exit.isFailure(exit))
        if (Exit.isFailure(exit)) {
          assert.isTrue(exit.cause.reasons.some((reason) => Cause.isDieReason(reason) && reason.defect === defect))
        }
        assert.strictEqual((yield* owner.usage).reservedTransientBytes, 5n)
      }
      fail = false
      assert.isTrue(VFS.equalsObjectRevision((yield* caller.stat("/f")).revision, before.revision))
      const error = yield* Effect.flip(operation.files.readForCopy("/f"))
      assert.strictEqual(error._tag, "LimitExceeded")
      if (error._tag === "LimitExceeded") assert.strictEqual(error.domain, "copyBytes")
      yield* manual.release
      yield* operation.close
      assert.strictEqual((yield* owner.usage).reservedTransientBytes, 0n)
    }).pipe(withClock))
})

describe("VirtualFileSystem capture accounting", () => {
  it.effect("should release capture reservations when an external payload hold prevents graph materialization", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make({ limits: { transientBytes: 16 } })
      const caller = yield* owner.authorize({ credentials })
      yield* write(caller)
      const operation = yield* caller.acquireOperation()
      const hold = yield* operation.budget.reservePayload(14)
      transientFailure(yield* Effect.flip(owner.capture()))
      assert.strictEqual((yield* owner.usage).reservedTransientBytes, 14n)
      yield* hold.release
      const capture = yield* owner.capture()
      assert.strictEqual((yield* Stream.runCollect(capture.records())).length, 2)
      assert.strictEqual((yield* owner.usage).reservedTransientBytes, 0n)
    }).pipe(withClock))

  it.effect("should apply independent per-traversal output budgets when reading the same capture repeatedly", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* write(caller)
      const capture = yield* owner.capture()
      for (const [field, required] of [["records", 2], ["payloadBytes", 3], ["stagingBytes", 3]] as const) {
        assert.strictEqual(
          (yield* Effect.flip(Stream.runCollect(capture.records({ [field]: required - 1 }))))._tag,
          "LimitExceeded"
        )
        assert.strictEqual((yield* Stream.runCollect(capture.records({ [field]: required }))).length, 2)
        assert.strictEqual((yield* Stream.runCollect(capture.records({ [field]: required }))).length, 2)
      }
      assert.strictEqual(
        (yield* Stream.runCollect(capture.records({ records: 1, stagingBytes: 0 }).pipe(Stream.take(1)))).length,
        1
      )
    }).pipe(withClock))

  it.effect("should enforce independent restore capacities when raw input and the candidate graph coexist", () =>
    Effect.gen(function*() {
      const source = Stream.fromIterable(records(new Uint8Array([7, 8])))
      const exact = yield* VFS.restore(source, {
        limits: {
          objects: 2,
          entries: 1,
          contentBytes: 2,
          fileBytes: 2,
          restoreRecords: 2,
          restorePayloadBytes: 3,
          transientBytes: 6
        }
      })
      assert.strictEqual((yield* exact.usage).reservedTransientBytes, 0n)
      for (
        const limits of [
          { objects: 1 },
          { entries: 0 },
          { contentBytes: 1 },
          { fileBytes: 1 },
          { restoreRecords: 1 },
          { restorePayloadBytes: 2 },
          { transientBytes: 5 }
        ]
      ) assert.strictEqual((yield* Effect.flip(VFS.restore(source, { limits })))._tag, "LimitExceeded")
    }).pipe(withClock))

  it.effect("should use attached view bytes for file and content limits when the supplied length property is misleading", () =>
    Effect.gen(function*() {
      for (const field of ["fileBytes", "contentBytes"] as const) {
        const data = new Uint8Array([1, 2, 3])
        Object.defineProperty(data, "length", { value: 0 })
        const source = Stream.fromIterable(records(data))
        const error = yield* Effect.flip(VFS.restore(source, { limits: { [field]: 2 } }))
        assert.strictEqual(error._tag, "LimitExceeded")
        const owner = yield* VFS.restore(source, { limits: { [field]: 3 } })
        const caller = yield* owner.authorize({ credentials })
        assert.deepStrictEqual(yield* caller.readFile("/f"), new Uint8Array([1, 2, 3]))
        assert.strictEqual((yield* owner.usage).contentBytes, 3n)
      }
    }).pipe(withClock))

  it.effect("should account for grown input before delivery when a metadata getter resizes the supplied buffer", () =>
    Effect.gen(function*() {
      for (const [field, required] of [["transientBytes", 10], ["restorePayloadBytes", 5]] as const) {
        for (const capacity of [required - 1, required]) {
          const backing: ArrayBuffer = Reflect.construct(ArrayBuffer, [1, { maxByteLength: 4 }])
          const data = new Uint8Array(backing)
          data[0] = 7
          const input = records(data)
          const supplied = input.find((record) => record._tag === "file")
          assert.isDefined(supplied)
          if (supplied === undefined) return
          Object.defineProperty(supplied.metadata, "uid", {
            enumerable: true,
            get() {
              Reflect.apply(Reflect.get(ArrayBuffer.prototype, "resize"), backing, [4])
              return 0
            }
          })
          let finalized = false
          let delivered = false
          const source = Stream.fromIterable(input).pipe(Stream.ensuring(Effect.sync(() => {
            finalized = true
          })))
          const result = yield* Effect.result(
            VFS.restore(source, { limits: { [field]: capacity } }).pipe(Effect.tap(() =>
              Effect.sync(() => {
                delivered = true
              })
            ))
          )
          assert.isTrue(finalized)
          assert.strictEqual(delivered, capacity === required)
          if (capacity < required) {
            assert.isTrue(Result.isFailure(result))
            if (Result.isFailure(result)) assert.strictEqual(result.failure._tag, "LimitExceeded")
          } else {
            assert.isTrue(Result.isSuccess(result))
            if (Result.isSuccess(result)) {
              const caller = yield* result.success.authorize({ credentials })
              assert.deepStrictEqual(yield* caller.readFile("/f"), new Uint8Array([7, 0, 0, 0]))
              assert.strictEqual((yield* result.success.usage).reservedTransientBytes, 0n)
            }
          }
        }
      }
    }).pipe(withClock))
})
