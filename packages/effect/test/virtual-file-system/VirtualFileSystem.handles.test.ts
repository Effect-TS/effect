import { assert, describe, it } from "@effect/vitest"
import { Clock, Effect, Exit, Fiber, Result, Scope } from "effect"
import { TestClock } from "effect/testing"
import * as VFS from "effect/virtual-file-system/VirtualFileSystem"

const credentials = { uid: 0, gid: 0 }
const bytes = (...values: Array<number>) => new Uint8Array(values)
const makeScope = Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
const withClock = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.flatMap(
    Clock.Clock,
    (clock) => effect.pipe(Effect.provideService<Clock.Clock, Clock.Clock>(Clock.Clock, clock))
  )

describe("VirtualFileSystem handles", () => {
  it.effect("should share cursor state only through one handle when sequential and positioned I/O are mixed", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", new Uint8Array([1, 2, 3]))
      const first = yield* caller.open("/file", { access: "readwrite" })
      const other = yield* caller.open("/file")
      assert.deepStrictEqual(yield* first.readAlloc(2), new Uint8Array([1, 2]))
      assert.strictEqual(yield* first.position(), 2n)
      assert.strictEqual(yield* other.position(), 0n)
      assert.deepStrictEqual(yield* first.readAlloc(3, { position: 1n }), new Uint8Array([2, 3]))
      assert.strictEqual(yield* first.position(), 2n)
      const output = new Uint8Array(4).fill(9)
      assert.strictEqual(yield* first.read(output), 1)
      assert.deepStrictEqual(output, new Uint8Array([3, 9, 9, 9]))
      assert.strictEqual(yield* first.position(), 3n)
      yield* first.write(new Uint8Array([7]), { position: 0n })
      assert.strictEqual(yield* first.position(), 3n)
      assert.deepStrictEqual(yield* caller.readFile("/file"), new Uint8Array([7, 2, 3]))
      assert.strictEqual((yield* Effect.flip(other.write(new Uint8Array([8]))))._tag, "AccessDenied")
    }).pipe(withClock))

  it.effect("should touch access time only for positive requests when reads reach EOF", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      const handle = yield* caller.open("/empty", { access: "readwrite", create: "ifmissing" })
      const before = yield* handle.stat()
      yield* TestClock.adjust("1 second")
      assert.deepStrictEqual(yield* handle.readAlloc(0), new Uint8Array(0))
      assert.isTrue(VFS.equalsObjectRevision((yield* handle.stat()).revision, before.revision))
      assert.deepStrictEqual(yield* handle.readAlloc(1), new Uint8Array(0))
      assert.isTrue((yield* handle.stat()).metadata.atime > before.metadata.atime)
      assert.strictEqual(yield* handle.position(), 0n)
    }).pipe(withClock))

  it.effect("should zero-fill gaps and resample input when a positioned write Effect reruns", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      const handle = yield* caller.open("/file", { access: "readwrite", create: "ifmissing" })
      yield* handle.seek({ from: "start", offset: 3n })
      yield* handle.write(new Uint8Array([5]))
      assert.deepStrictEqual(yield* caller.readFile("/file"), new Uint8Array([0, 0, 0, 5]))
      yield* handle.seek({ from: "start", offset: 20n })
      yield* handle.write(new Uint8Array(0))
      assert.strictEqual(yield* handle.position(), 20n)
      assert.strictEqual((yield* handle.stat()).metadata.size, 4n)
      const source = new Uint8Array([1])
      const write = handle.write(source, { position: 0n })
      yield* write
      source[0] = 2
      yield* write
      assert.deepStrictEqual(yield* caller.readFile("/file"), new Uint8Array([2, 0, 0, 5]))
      assert.strictEqual(yield* handle.position(), 20n)
    }).pipe(withClock))

  it.effect("should advance to the appended end when an append handle uses advance policy", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", bytes(1))
      const handle = yield* caller.open("/file", { access: "readwrite", append: true, appendCursor: "advance" })
      yield* handle.seek({ from: "start", offset: 7n })
      yield* handle.write(bytes(2, 3))
      assert.deepStrictEqual(yield* caller.readFile("/file"), bytes(1, 2, 3))
      assert.strictEqual(yield* handle.position(), 3n)
      const position = yield* handle.position()
      yield* handle.write(bytes())
      assert.strictEqual(yield* handle.position(), position)
      assert.strictEqual((yield* Effect.flip(handle.write(bytes(4), { position: 0n })))._tag, "InvalidInput")
      assert.strictEqual(yield* handle.position(), position)
    }).pipe(withClock))

  it.effect("should preserve the existing cursor when an append handle uses preserve policy", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", bytes(1))
      const handle = yield* caller.open("/file", { access: "readwrite", append: true, appendCursor: "preserve" })
      yield* handle.seek({ from: "start", offset: 7n })
      yield* handle.write(bytes(2, 3))
      assert.deepStrictEqual(yield* caller.readFile("/file"), bytes(1, 2, 3))
      assert.strictEqual(yield* handle.position(), 7n)
      const position = yield* handle.position()
      yield* handle.write(bytes())
      assert.strictEqual(yield* handle.position(), position)
      assert.strictEqual((yield* Effect.flip(handle.write(bytes(4), { position: 0n })))._tag, "InvalidInput")
      assert.strictEqual(yield* handle.position(), position)
    }).pipe(withClock))

  it.effect("should preserve its cursor when a handle truncates with preserve policy", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", bytes(1, 2, 3))
      const handle = yield* caller.open("/file", { access: "readwrite", truncateCursor: "preserve" })
      yield* handle.seek({ from: "start", offset: 9n })
      const before = yield* handle.stat()
      yield* TestClock.adjust("1 second")
      yield* handle.truncate(3)
      assert.deepStrictEqual(yield* handle.stat(), before)
      assert.strictEqual(yield* handle.position(), 9n)
      yield* handle.truncate(1)
      assert.strictEqual(yield* handle.position(), 9n)
      yield* handle.truncate(3)
      assert.deepStrictEqual(yield* caller.readFile("/file"), bytes(1, 0, 0))
      const cursor = yield* handle.position()
      yield* caller.truncate("/file", 0)
      assert.strictEqual(yield* handle.position(), cursor)
    }).pipe(withClock))

  it.effect("should clamp its cursor when a handle truncates with clamp policy", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", bytes(1, 2, 3))
      const handle = yield* caller.open("/file", { access: "readwrite", truncateCursor: "clamp" })
      yield* handle.seek({ from: "start", offset: 9n })
      const before = yield* handle.stat()
      yield* TestClock.adjust("1 second")
      yield* handle.truncate(3)
      assert.deepStrictEqual(yield* handle.stat(), before)
      assert.strictEqual(yield* handle.position(), 3n)
      yield* handle.truncate(1)
      assert.strictEqual(yield* handle.position(), 1n)
      yield* handle.truncate(3)
      assert.deepStrictEqual(yield* caller.readFile("/file"), bytes(1, 0, 0))
      const cursor = yield* handle.position()
      yield* caller.truncate("/file", 0)
      assert.strictEqual(yield* handle.position(), cursor)
    }).pipe(withClock))

  it.effect("should retain its data grant without metadata authority when an opened file loses permissions and is unlinked", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials, umask: 0o777 })
      const handle = yield* caller.open("/file", { access: "readwrite", create: "exclusive", mode: 0o666 })
      assert.strictEqual((yield* handle.stat()).metadata.mode, 0)
      yield* handle.write(new Uint8Array([6]))
      assert.deepStrictEqual(yield* handle.readAlloc(1, { position: 0n }), new Uint8Array([6]))
      assert.strictEqual((yield* Effect.flip(caller.readFile("/file")))._tag, "AccessDenied")
      const admin = yield* owner.authorize({ credentials: { ...credentials, privileged: true } })
      yield* admin.setAttributes("/file", { uid: 100, mode: 0 })
      yield* handle.write(new Uint8Array([7]), { position: 0n })
      assert.strictEqual((yield* Effect.flip(handle.setAttributes({ mode: 0o600 })))._tag, "AccessDenied")
      yield* admin.unlink("/file")
      assert.deepStrictEqual(yield* handle.readAlloc(1, { position: 0n }), new Uint8Array([7]))
    }).pipe(withClock))

  it.effect("should leave content and handle capacity unchanged when an open revision guard rejects truncation", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make({ limits: { handles: 1 } })
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", new Uint8Array([1, 2]))
      const before = yield* caller.stat("/file")
      yield* caller.writeFile("/file", new Uint8Array([3, 4]))
      assert.strictEqual(
        (yield* Effect.flip(
          caller.open("/file", { access: "write", truncate: true, expectedRevision: before.revision })
        ))._tag,
        "ConditionFailed"
      )
      assert.strictEqual((yield* owner.usage).handles, 0)
      assert.deepStrictEqual(yield* caller.readFile("/file"), new Uint8Array([3, 4]))
      assert.strictEqual(
        (yield* Effect.flip(
          caller.open("/missing", {
            access: "write",
            create: "ifmissing",
            truncate: true,
            expectedRevision: before.revision
          })
        ))._tag,
        "ConditionFailed"
      )
      assert.strictEqual((yield* Effect.flip(caller.stat("/missing")))._tag, "NotFound")
      assert.strictEqual(
        (yield* Effect.flip(caller.open("/file", { expectedRevision: before.revision })))._tag,
        "InvalidInput"
      )
    }).pipe(withClock))

  it.effect("should preserve the symlink and create its target when nonexclusive open follows a dangling link", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.makeSymlink("/link", "target")
      assert.strictEqual(
        (yield* Effect.flip(caller.open("/link", { access: "write", create: "ifmissing", noFollow: true })))._tag,
        "InvalidResource"
      )
      assert.strictEqual(
        (yield* Effect.flip(caller.open("/link", { access: "write", create: "exclusive" })))._tag,
        "AlreadyExists"
      )
      const handle = yield* caller.open("/link", { access: "readwrite", create: "ifmissing" })
      yield* handle.write(new Uint8Array([8]))
      assert.strictEqual((yield* caller.linkStat("/link")).kind, "symlink")
      assert.deepStrictEqual(yield* caller.readFile("/target"), new Uint8Array([8]))
      assert.strictEqual(
        (yield* Effect.flip(caller.open("/new/", { access: "write", create: "ifmissing" })))._tag,
        "NotFound"
      )
      assert.strictEqual((yield* Effect.flip(caller.stat("/new")))._tag, "NotFound")
    }).pipe(withClock))

  it.effect("should preserve metadata and cursor when a borrowed destination detaches before publication", () =>
    Effect.gen(function*() {
      const clock = yield* Clock.Clock
      const destination = new Uint8Array([9, 9])
      let detach = false
      const supplied: Clock.Clock = {
        ...clock,
        currentTimeNanosUnsafe: () => {
          if (detach) {
            detach = false
            structuredClone(destination.buffer, { transfer: [destination.buffer] })
          }
          return clock.currentTimeNanosUnsafe()
        }
      }
      const owner = yield* VFS.make().pipe(Effect.provideService(Clock.Clock, supplied))
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", new Uint8Array([1, 2]))
      const handle = yield* caller.open("/file")
      const before = yield* handle.stat()
      yield* TestClock.adjust("1 second")
      detach = true
      assert.strictEqual((yield* Effect.flip(handle.read(destination)))._tag, "InvalidInput")
      assert.strictEqual(yield* handle.position(), 0n)
      assert.isTrue(VFS.equalsObjectRevision((yield* handle.stat()).revision, before.revision))
      assert.strictEqual((yield* owner.usage).reservedTransientBytes, 0n)
    }).pipe(withClock))

  it.effect("should accept attached subviews and reject invalid buffers when handles read and write", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      const handle = yield* caller.open("/file", { access: "readwrite", create: "ifmissing" })
      // The baseline TypeScript library predates resizable ArrayBuffers.
      const backing: ArrayBuffer = Reflect.construct(ArrayBuffer, [8, { maxByteLength: 16 }])
      const view = new Uint8Array(backing, 2, 2)
      view.set([1, 2])
      yield* handle.write(view)
      Reflect.apply(Reflect.get(ArrayBuffer.prototype, "resize"), backing, [3])
      assert.strictEqual((yield* Effect.flip(handle.write(view)))._tag, "InvalidInput")
      const shared = new Uint8Array(new SharedArrayBuffer(2))
      assert.strictEqual((yield* Effect.flip(handle.write(shared)))._tag, "InvalidInput")
      const detached = new Uint8Array(2)
      structuredClone(detached.buffer, { transfer: [detached.buffer] })
      assert.strictEqual((yield* Effect.flip(handle.read(detached)))._tag, "InvalidInput")
      assert.deepStrictEqual(yield* caller.readFile("/file"), new Uint8Array([1, 2]))
      assert.strictEqual(yield* handle.position(), 2n)
    }).pipe(withClock))

  it.effect("should retain directory metadata without namespace authority when its caller closes and the directory is removed", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const admin = yield* owner.authorize({ credentials })
      yield* admin.makeDirectory("/dir")
      const sourceScope = yield* makeScope
      const caller = yield* owner.authorize({ credentials }).pipe(Scope.provide(sourceScope))
      const handle = yield* caller.openDirectory("/dir")
      yield* Scope.close(sourceScope, Exit.void)
      yield* admin.removeDirectory("/dir")
      assert.strictEqual((yield* handle.stat()).metadata.nlink, 0n)
      assert.strictEqual((yield* owner.usage).unreachableRetainedObjects, 1)
      assert.strictEqual((yield* Effect.flip(admin.createFile({ directory: handle, name: "f" })))._tag, "AccessDenied")
      yield* handle.close()
      assert.strictEqual((yield* owner.usage).unreachableRetainedObjects, 0)
    }).pipe(withClock))

  it.effect("should observe the same namespace and content when Effect and synchronous views alternate", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make({ limits: { synchronous: true } })
      const caller = yield* owner.authorize({ credentials })
      const sync = yield* caller.acquireSync
      Result.getOrThrow(sync.makeDirectory("/dir"))
      Result.getOrThrow(sync.writeFile("/dir/file", new Uint8Array([1, 2])))
      assert.deepStrictEqual(yield* caller.readFile("/dir/file"), new Uint8Array([1, 2]))
      yield* caller.writeFile("/dir/file", new Uint8Array([3]))
      assert.deepStrictEqual(Result.getOrThrow(sync.readFile("/dir/file")), new Uint8Array([3]))
      Result.getOrThrow(sync.rename("/dir/file", "/dir/renamed"))
      assert.strictEqual((yield* caller.stat("/dir/renamed")).kind, "file")
      const missing = sync.stat("/dir/file")
      assert.isTrue(Result.isFailure(missing))
      if (Result.isFailure(missing)) assert.strictEqual(missing.failure._tag, "NotFound")
      Result.getOrThrow(sync.unlink("/dir/renamed"))
      Result.getOrThrow(sync.removeDirectory("/dir"))
      assert.strictEqual((yield* owner.usage).handles, 0)
    }).pipe(withClock))

  it.effect("should share grant cursor and close state when a file handle is used through its synchronous view", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make({ limits: { synchronous: true } })
      const caller = yield* owner.authorize({ credentials })
      const handle = yield* caller.open("/file", {
        access: "readwrite",
        create: "ifmissing",
        append: true,
        appendCursor: "preserve",
        truncateCursor: "clamp"
      })
      const sync = yield* handle.sync()
      assert.strictEqual(sync.effect, handle)
      assert.strictEqual((yield* owner.usage).handles, 1)
      Result.getOrThrow(sync.seek({ from: "start", offset: 9n }))
      yield* handle.write(new Uint8Array([1, 2, 3]))
      assert.strictEqual(Result.getOrThrow(sync.position()), 9n)
      Result.getOrThrow(sync.truncate(2))
      assert.strictEqual(yield* handle.position(), 2n)
      assert.deepStrictEqual(Result.getOrThrow(sync.readAlloc(2, { position: 0n })), new Uint8Array([1, 2]))
      Result.getOrThrow(sync.close())
      assert.strictEqual((yield* owner.usage).handles, 0)
      assert.strictEqual((yield* Effect.flip(handle.stat()))._tag, "InvalidResource")
      yield* handle.close()
    }).pipe(withClock))

  it.effect("should close owned handles and preserve borrowed handles when a synchronous region scope closes", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make({ limits: { synchronous: true } })
      const sourceScope = yield* makeScope
      const source = yield* owner.authorize({ credentials }).pipe(Scope.provide(sourceScope))
      const borrowed = yield* source.open("/borrowed", { access: "readwrite", create: "ifmissing" })
      const borrowedSync = yield* borrowed.sync()
      const regionScope = yield* makeScope
      const sync = yield* source.acquireSync.pipe(Scope.provide(regionScope))
      const owned = Result.getOrThrow(sync.open("/owned", { access: "readwrite", create: "ifmissing" }))
      yield* Scope.close(sourceScope, Exit.void)
      Result.getOrThrow(sync.writeFile("/after", new Uint8Array([4])))
      assert.strictEqual((yield* owner.usage).callers, 1)
      yield* Scope.close(regionScope, Exit.void)
      assert.strictEqual((yield* owner.usage).callers, 0)
      assert.strictEqual((yield* owner.usage).handles, 1)
      assert.strictEqual((yield* Effect.flip(owned.effect.stat()))._tag, "InvalidResource")
      Result.getOrThrow(borrowedSync.write(new Uint8Array([5])))
      assert.deepStrictEqual(yield* borrowed.readAlloc(1, { position: 0n }), new Uint8Array([5]))
      yield* borrowed.close()
    }).pipe(withClock))

  it.effect("should reject synchronous acquisition without extra retention when synchronous capability is disabled", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      const before = yield* owner.usage
      assert.strictEqual((yield* Effect.flip(caller.acquireSync))._tag, "CapabilityUnavailable")
      assert.deepStrictEqual(yield* owner.usage, before)
    }).pipe(withClock))

  it.effect("should reject changed destination length when a borrowed resizable buffer grows during a read", () =>
    Effect.gen(function*() {
      const active = yield* Clock.Clock
      const backing: ArrayBuffer = Reflect.construct(ArrayBuffer, [4, { maxByteLength: 8 }])
      new Uint8Array(backing).fill(9)
      const destination = new Uint8Array(backing, 1)
      let resize = false
      const clock: Clock.Clock = {
        ...active,
        currentTimeNanosUnsafe: () => {
          if (resize) {
            resize = false
            Reflect.apply(Reflect.get(ArrayBuffer.prototype, "resize"), backing, [6])
          }
          return active.currentTimeNanosUnsafe()
        }
      }
      const owner = yield* VFS.make().pipe(Effect.provideService(Clock.Clock, clock))
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", bytes(1, 2))
      const handle = yield* caller.open("/file")
      const before = yield* handle.stat()
      yield* TestClock.adjust("1 second")
      resize = true
      assert.strictEqual((yield* Effect.flip(handle.read(destination)))._tag, "InvalidInput")
      assert.strictEqual(yield* handle.position(), 0n)
      assert.deepStrictEqual(yield* handle.stat(), before)
      assert.deepStrictEqual(new Uint8Array(backing), bytes(9, 9, 9, 9, 0, 0))
      assert.strictEqual((yield* owner.usage).reservedTransientBytes, 0n)
    }).pipe(withClock))

  it.effect("should accept stable destination bounds when a borrowed resizable buffer grows during a read", () =>
    Effect.gen(function*() {
      const active = yield* Clock.Clock
      const backing: ArrayBuffer = Reflect.construct(ArrayBuffer, [4, { maxByteLength: 8 }])
      new Uint8Array(backing).fill(9)
      const destination = new Uint8Array(backing, 1, 2)
      let resize = false
      const clock: Clock.Clock = {
        ...active,
        currentTimeNanosUnsafe: () => {
          if (resize) {
            resize = false
            Reflect.apply(Reflect.get(ArrayBuffer.prototype, "resize"), backing, [6])
          }
          return active.currentTimeNanosUnsafe()
        }
      }
      const owner = yield* VFS.make().pipe(Effect.provideService(Clock.Clock, clock))
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", bytes(1, 2))
      const handle = yield* caller.open("/file")
      yield* TestClock.adjust("1 second")
      resize = true
      assert.strictEqual(yield* handle.read(destination), 2)
      assert.strictEqual(yield* handle.position(), 2n)
      assert.strictEqual((yield* handle.stat()).metadata.atime, 1_000_000_000n)
      assert.deepStrictEqual(new Uint8Array(backing), bytes(9, 1, 2, 9, 0, 0))
      assert.strictEqual((yield* owner.usage).reservedTransientBytes, 0n)
    }).pipe(withClock))

  it.effect("should reject use without a later mutation when an options getter closes the handle before admission", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", bytes(1))
      const before = yield* caller.stat("/file")
      const handle = yield* caller.open("/file", { access: "write" })
      let closing: Fiber.Fiber<void> | undefined
      const options: VFS.WriteOptions = {
        get position() {
          closing ??= Effect.runFork(handle.close())
          return 0n
        }
      }
      assert.strictEqual((yield* Effect.flip(handle.write(bytes(2), options)))._tag, "InvalidResource")
      if (closing !== undefined) yield* Fiber.join(closing)
      assert.deepStrictEqual(yield* caller.stat("/file"), before)
      yield* Effect.yieldNow
      assert.deepStrictEqual(yield* caller.readFile("/file"), bytes(1))
      assert.strictEqual((yield* owner.usage).handles, 0)
    }).pipe(withClock))

  it.effect("should finish the admitted write before close completes when synchronous options start handle closure", () =>
    Effect.gen(function*() {
      const clock = yield* Clock.Clock
      let completed = false
      let observingPublication = false
      let completedDuringPublication: boolean | undefined
      const supplied: Clock.Clock = {
        ...clock,
        currentTimeNanosUnsafe: () => {
          if (observingPublication) completedDuringPublication = completed
          return clock.currentTimeNanosUnsafe()
        }
      }
      const owner = yield* VFS.make({ limits: { synchronous: true } }).pipe(
        Effect.provideService(Clock.Clock, supplied)
      )
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", bytes(1))
      const handle = yield* caller.open("/file", { access: "write" })
      const sync = yield* handle.sync()
      let closing: Fiber.Fiber<void> | undefined
      const options: VFS.WriteOptions = {
        get position() {
          closing ??= Effect.runFork(
            handle.close().pipe(Effect.tap(() =>
              Effect.sync(() => {
                completed = true
              })
            ))
          )
          return 0n
        }
      }
      observingPublication = true
      Result.getOrThrow(sync.write(bytes(2), options))
      observingPublication = false
      assert.strictEqual(completedDuringPublication, false)
      if (closing !== undefined) yield* Fiber.join(closing)
      assert.isTrue(completed)
      assert.strictEqual((yield* Effect.flip(handle.stat()))._tag, "InvalidResource")
      assert.deepStrictEqual(yield* caller.readFile("/file"), bytes(2))
      yield* Effect.yieldNow
      assert.deepStrictEqual(yield* caller.readFile("/file"), bytes(2))
      assert.strictEqual((yield* owner.usage).handles, 0)
    }).pipe(withClock))

  it.effect("should distinguish closed and foreign selectors when directory handles are reused after close", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      const same = yield* caller.openDirectory("/")
      const foreignOwner = yield* VFS.make()
      const foreignCaller = yield* foreignOwner.authorize({ credentials })
      const foreign = yield* foreignCaller.openDirectory("/")
      yield* same.close()
      yield* foreign.close()
      for (const [directory, reason] of [[same, "closed"], [foreign, "foreign"]] as const) {
        const error = yield* Effect.flip(caller.stat({ directory, name: "file" }))
        assert.instanceOf(error, VFS.InvalidResource)
        if (error._tag === "InvalidResource") assert.strictEqual(error.reason, reason)
      }
    }).pipe(withClock))

  it.effect("should rethrow the original Clock defect without publication when synchronous writes fail before commit", () =>
    Effect.gen(function*() {
      const clock = yield* Clock.Clock
      const defect = new Error("clock defect")
      let fail = false
      const supplied: Clock.Clock = {
        ...clock,
        currentTimeNanosUnsafe: () => {
          if (fail) throw defect
          return clock.currentTimeNanosUnsafe()
        }
      }
      const owner = yield* VFS.make({ limits: { synchronous: true } }).pipe(
        Effect.provideService(Clock.Clock, supplied)
      )
      const caller = yield* owner.authorize({ credentials })
      const sync = yield* caller.acquireSync
      Result.getOrThrow(sync.writeFile("/file", new Uint8Array([1])))
      const before = Result.getOrThrow(sync.stat("/file"))
      fail = true
      let thrown: unknown
      try {
        sync.writeFile("/file", new Uint8Array([2]))
      } catch (error) {
        thrown = error
      }
      assert.strictEqual(thrown, defect)
      fail = false
      assert.deepStrictEqual(Result.getOrThrow(sync.readFile("/file")), new Uint8Array([1]))
      const invalid = sync.open("/file", { access: "read", truncate: true })
      assert.isTrue(Result.isFailure(invalid))
      if (Result.isFailure(invalid)) assert.strictEqual(invalid.failure._tag, "InvalidInput")
      assert.strictEqual(Result.getOrThrow(sync.stat("/file")).metadata.mtime, before.metadata.mtime)
      assert.strictEqual((yield* owner.usage).reservedTransientBytes, 0n)
    }).pipe(withClock))
})
