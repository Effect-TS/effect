import { assert, describe, it } from "@effect/vitest"
import { BytePath, Clock, DateTime, Effect, Exit, Option, Result, Scope } from "effect"
import { TestClock } from "effect/testing"
import * as VFS from "effect/virtual-file-system/VirtualFileSystem"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

const credentials = { uid: 0, gid: 0 }
const bytes = (...values: Array<number>) => new Uint8Array(values)
const path = (value: string) => Result.getOrThrow(BytePath.fromString(value))
const text = (value: BytePath.BytePath) => Result.getOrThrow(BytePath.toString(value))
const makeScope = Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
const withClock = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.flatMap(
    Clock.Clock,
    (clock) => effect.pipe(Effect.provideService<Clock.Clock, Clock.Clock>(Clock.Clock, clock))
  )

const emptyUsage = {
  liveObjects: 1,
  entries: 0,
  contentBytes: 0n,
  unreachableRetainedObjects: 0,
  unreachableRetainedContentBytes: 0n,
  callers: 0,
  handles: 0,
  operations: 0,
  reservedTransientBytes: 0n
}

const execute = promisify(execFile)
const publicUrl = new URL("../../src/virtual-file-system/VirtualFileSystem.ts", import.meta.url).href
const effectUrl = new URL("../../src/Effect.ts", import.meta.url).href
const sourceUrl = new URL("../../src/", import.meta.url).href
const nodeModulesUrl = new URL("../../../../node_modules/", import.meta.url).href
const imports = `
const VFS = await import(${JSON.stringify(publicUrl)})
const Effect = await import(${JSON.stringify(effectUrl)})
`
const readInstance = `
const instance = async (Vfs, Fx) => {
  const owner = await Fx.runPromise(Vfs.make())
  return await Fx.runPromise(Fx.scoped(Fx.gen(function* () {
    const caller = yield* owner.authorize({ credentials: { uid: 0, gid: 0 } })
    return caller.instanceNumber
  })))
}
`
const probe = (script: string) =>
  Effect.tryPromise(async () => {
    const args = process.versions.deno === undefined
      ? ["--input-type=module", "--eval", script]
      : ["eval", "--no-config", "--no-lock", "--node-modules-dir=manual", "--no-remote", script]
    const result = await execute(process.execPath, args, {
      maxBuffer: 1024 * 1024
    })
    return result.stdout.trim()
  })

describe("VirtualFileSystem", () => {
  it.effect("should check authority before rejecting a malformed guard when JavaScript supplies a cyclic token", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const admin = yield* owner.authorize({ credentials })
      const guest = yield* owner.authorize({ credentials: { uid: 1, gid: 1 } })
      yield* admin.makeDirectory("/private", { mode: 0o700 })
      yield* admin.writeFile("/private/file", bytes(1))
      const before = yield* admin.stat("/private/file")
      const malformed: Record<string, unknown> = {}
      malformed.self = malformed
      const options: VFS.WriteFileOptions = {}
      // Exercise an invalid JavaScript token without asserting it has an opaque type.
      Object.defineProperty(options, "expectedRevision", { value: malformed })
      const target = { directory: "/private", name: "file" }
      assert.strictEqual((yield* Effect.flip(guest.writeFile(target, bytes(2), options)))._tag, "AccessDenied")
      assert.strictEqual((yield* Effect.flip(admin.writeFile(target, bytes(2), options)))._tag, "InvalidInput")
      assert.deepStrictEqual(yield* admin.stat("/private/file"), before)
      assert.deepStrictEqual(yield* admin.readFile("/private/file"), bytes(1))
    }).pipe(withClock))

  it.effect("should reject unissued and foreign references when callers receive opaque selectors", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      const reference = yield* caller.lookup("/")
      const foreignOwner = yield* VFS.make()
      const foreignCaller = yield* foreignOwner.authorize({ credentials })
      const foreignReference = yield* foreignCaller.lookup("/")
      assert.strictEqual((yield* Effect.flip(caller.stat({ ...reference })))._tag, "InvalidInput")
      const error = yield* Effect.flip(caller.stat(foreignReference))
      assert.strictEqual(error._tag, "InvalidResource")
      if (error._tag === "InvalidResource") assert.strictEqual(error.reason, "foreign")
      assert.strictEqual((yield* caller.stat(reference)).kind, "directory")
    }).pipe(withClock))

  it.effect("should start with an empty root and finite defaults when an instance is created", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      assert.deepStrictEqual(yield* owner.usage, emptyUsage)
      assert.deepStrictEqual(owner.limits, {
        objects: 32768,
        entries: 65536,
        contentBytes: 67108864n,
        fileBytes: 16777216n,
        callers: 256,
        handles: 1024,
        operations: 128,
        transientBytes: 268435456n,
        ioBytes: 16777216n,
        nameBytes: 255n,
        pathBytes: 4096n,
        expandedPathBytes: 16384n,
        symlinkFollows: 64,
        namespaceVisits: 131072,
        restoreRecords: 131072,
        restorePayloadBytes: 134217728n,
        synchronous: false
      })
      const caller = yield* owner.authorize({ credentials })
      const root = yield* caller.stat("/")
      assert.strictEqual(root.kind, "directory")
      assert.strictEqual(root.metadata.uid, 0)
      assert.strictEqual(root.metadata.gid, 0)
      assert.strictEqual(root.metadata.mode, 0o755)
      assert.strictEqual(root.metadata.nlink, 2n)
      assert.strictEqual(root.metadata.size, 0n)
      assert.isTrue(root.metadata.objectNumber > 0n)
      assert.strictEqual(root.metadata.atime, root.metadata.birthtime)
      assert.strictEqual(root.metadata.mtime, root.metadata.birthtime)
      assert.strictEqual(root.metadata.ctime, root.metadata.birthtime)
      assert.strictEqual((yield* Effect.flip(caller.stat("/tmp")))._tag, "NotFound")
    }).pipe(withClock))

  it.effect("should keep copied credentials when the supplied identity and groups change", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make({ root: { uid: 100, gid: 20, mode: 0o750 } })
      const admin = yield* owner.authorize({ credentials: { uid: 100, gid: 20, privileged: true } })
      yield* admin.writeFile("/group", new Uint8Array([7]), { mode: 0o640 })
      const zero = yield* owner.authorize({ credentials: { uid: 0, gid: 0 } })
      assert.strictEqual((yield* Effect.flip(zero.readFile("/group")))._tag, "AccessDenied")
      const supplied = { uid: 200, gid: 99, supplementaryGroups: [20], privileged: false }
      const member = yield* owner.authorize({ credentials: supplied })
      supplied.supplementaryGroups.length = 0
      supplied.uid = 100
      supplied.privileged = true
      assert.deepStrictEqual(yield* member.readFile("/group"), new Uint8Array([7]))
      assert.strictEqual((yield* Effect.flip(member.writeFile("/denied", new Uint8Array([1]))))._tag, "AccessDenied")
      assert.strictEqual((yield* Effect.flip(admin.stat("/denied")))._tag, "NotFound")
    }).pipe(withClock))

  it.effect("should choose one permission class when owner and group permissions differ", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make({ root: { mode: 0o777 } })
      const admin = yield* owner.authorize({ credentials: { uid: 100, gid: 20, privileged: true } })
      yield* admin.writeFile("/group", bytes(7), { mode: 0o040 })
      const own = yield* owner.authorize({ credentials: { uid: 100, gid: 20 } })
      const member = yield* owner.authorize({ credentials: { uid: 200, gid: 99, supplementaryGroups: [20] } })
      assert.strictEqual((yield* Effect.flip(own.readFile("/group")))._tag, "AccessDenied")
      assert.deepStrictEqual(yield* member.readFile("/group"), bytes(7))
      yield* admin.writeFile("/private", bytes(8), { mode: 0 })
      const zero = yield* owner.authorize({ credentials })
      assert.strictEqual((yield* Effect.flip(zero.readFile("/private")))._tag, "AccessDenied")
      assert.strictEqual((yield* Effect.flip(own.setAttributes("/group", { uid: 100 })))._tag, "AccessDenied")
      yield* own.setAttributes("/group", { gid: 20 })
      assert.strictEqual((yield* Effect.flip(own.setAttributes("/group", { gid: 21 })))._tag, "AccessDenied")
    }).pipe(withClock))

  it.effect("should preserve narrowed authority and inherited umask when a source caller scope closes", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const sourceScope = yield* makeScope
      const derivedScope = yield* makeScope
      const source = yield* owner.authorize({ credentials, umask: 0o027 }).pipe(Scope.provide(sourceScope))
      yield* source.makeDirectory("/jail/child", { recursive: true })
      const atChild = yield* source.withCurrentDirectory("/jail/child").pipe(Scope.provide(sourceScope))
      const derived = yield* atChild.withRoot("/jail").pipe(Scope.provide(derivedScope))
      assert.strictEqual((yield* owner.usage).callers, 3)
      assert.isTrue(VFS.equalsObjectReference(yield* derived.lookup("."), yield* derived.lookup("/")))
      yield* Scope.close(sourceScope, Exit.void)
      assert.strictEqual((yield* owner.usage).callers, 1)
      assert.strictEqual((yield* Effect.flip(source.stat("/")))._tag, "InvalidResource")
      yield* derived.writeFile("/inside", new Uint8Array([1]))
      assert.strictEqual((yield* derived.stat("/inside")).metadata.mode, 0o640)
      assert.strictEqual((yield* Effect.flip(derived.stat("/jail")))._tag, "NotFound")
      yield* Scope.close(derivedScope, Exit.void)
      assert.strictEqual((yield* owner.usage).callers, 0)
      assert.strictEqual((yield* Effect.flip(derived.stat("/")))._tag, "InvalidResource")
    }).pipe(withClock))

  it.effect("should resume confined access when an escaped root directory identity returns", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const admin = yield* owner.authorize({ credentials })
      yield* admin.makeDirectory("/boundary/inner", { recursive: true })
      const boundary = yield* admin.withRoot("/boundary")
      const inner = yield* boundary.withRoot("/inner")
      const before = yield* inner.stat("/")
      yield* admin.rename("/boundary/inner", "/outside")
      yield* admin.makeDirectory("/boundary/inner")
      assert.strictEqual((yield* Effect.flip(inner.stat("/")))._tag, "AccessDenied")
      yield* admin.removeDirectory("/boundary/inner")
      yield* admin.rename("/outside", "/boundary/inner")
      const after = yield* inner.stat("/")
      assert.isTrue(VFS.equalsObjectReference(before.reference, after.reference))
    }).pipe(withClock))

  it.effect("should allow absolute access and cwd repair when the current directory is detached", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const admin = yield* owner.authorize({ credentials })
      yield* admin.makeDirectory("/cwd")
      const caller = yield* admin.withCurrentDirectory("/cwd")
      yield* admin.removeDirectory("/cwd")
      assert.strictEqual((yield* Effect.flip(caller.stat(".")))._tag, "AccessDenied")
      assert.strictEqual((yield* caller.stat("/")).kind, "directory")
      const repaired = yield* caller.withCurrentDirectory("/")
      assert.strictEqual((yield* repaired.stat(".")).kind, "directory")
    }).pipe(withClock))

  it.effect("should resolve path components in order when dots and trailing slashes are present", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.makeDirectory("/directory")
      yield* caller.writeFile("/file", bytes(1))
      yield* caller.makeSymlink("/alias", "directory")
      assert.strictEqual((yield* Effect.flip(caller.stat("/missing/../directory")))._tag, "NotFound")
      for (const invalid of ["/file/.", "/file/../directory", "/file/"]) {
        const error = yield* Effect.flip(caller.stat(invalid))
        assert.strictEqual(error._tag, "InvalidResource")
        if (error._tag === "InvalidResource") assert.strictEqual(error.reason, "wrongKind")
      }
      assert.isTrue(
        VFS.equalsObjectReference(yield* caller.lookup("/directory/../../"), yield* caller.lookup("/"))
      )
      assert.isTrue(
        VFS.equalsObjectReference(yield* caller.lookup("//directory///./"), yield* caller.lookup("/directory"))
      )
      assert.strictEqual((yield* caller.stat("/alias/")).kind, "directory")
      assert.strictEqual((yield* Effect.flip(caller.linkStat("/alias/")))._tag, "InvalidResource")
      assert.strictEqual((yield* Effect.flip(caller.unlink("/file/")))._tag, "InvalidResource")
      assert.strictEqual((yield* Effect.flip(caller.removeDirectory("/directory/.")))._tag, "InvalidInput")
      assert.deepStrictEqual(yield* caller.readFile("/file"), bytes(1))
    }).pipe(withClock))

  it.effect("should resolve relative link targets from each containing entry when a symlink has aliases", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.makeDirectory("/left")
      yield* caller.makeDirectory("/right")
      yield* caller.writeFile("/left/data", bytes(1))
      yield* caller.writeFile("/right/data", bytes(2))
      const link = yield* caller.makeSymlink("/left/link", "data")
      yield* caller.makeHardLink({ entry: "/left/link" }, "/right/link")
      assert.deepStrictEqual(yield* caller.readFile("/left/link"), bytes(1))
      assert.deepStrictEqual(yield* caller.readFile("/right/link"), bytes(2))
      assert.strictEqual(text(yield* caller.realPath("/right/link")), "/right/data")
      assert.strictEqual(text(yield* caller.readLink("/right/link")), "data")
      const alias = yield* caller.linkStat("/right/link")
      assert.isTrue(VFS.equalsObjectReference(link.reference, alias.reference))
      assert.strictEqual(alias.metadata.nlink, 2n)
      assert.strictEqual(alias.metadata.mode, 0o777)
    }).pipe(withClock))

  it.effect("should replace the destination binding atomically when a retained file is displaced by rename", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/source", bytes(1, 2))
      yield* caller.writeFile("/victim", bytes(3, 4, 5))
      const retained = yield* caller.open("/victim")
      const from = yield* caller.observeEntry({ directory: "/", name: "source" })
      const to = yield* caller.observeEntry({ directory: "/", name: "victim" })
      if (from.state !== "present" || to.state !== "present") throw new Error("Expected present entries")
      const parent = yield* caller.stat("/")
      yield* TestClock.adjust("1 second")
      yield* caller.rename("/source", "/victim", {
        source: { entry: { expected: "binding", binding: from.binding } },
        destination: { entry: { expected: "binding", binding: to.binding } }
      })
      const moved = yield* caller.observeEntry({ directory: "/", name: "victim" })
      if (moved.state !== "present") throw new Error("Expected moved entry")
      assert.isTrue(VFS.equalsObjectReference(moved.object.reference, from.object.reference))
      assert.isFalse(VFS.equalsEntryBinding(moved.binding, from.binding))
      assert.isFalse(VFS.equalsEntryBinding(moved.binding, to.binding))
      assert.strictEqual(moved.object.metadata.nlink, 1n)
      assert.strictEqual(moved.object.metadata.ctime, 1_000_000_000n)
      const nextParent = yield* caller.stat("/")
      if (parent.kind !== "directory" || nextParent.kind !== "directory") throw new Error("Expected directories")
      assert.strictEqual(nextParent.metadata.nlink, parent.metadata.nlink)
      assert.isFalse(VFS.equalsNamespaceRevision(parent.namespaceRevision, nextParent.namespaceRevision))
      assert.strictEqual((yield* Effect.flip(caller.stat("/source")))._tag, "NotFound")
      const stale = yield* Effect.flip(
        caller.unlink("/victim", { entry: { expected: "binding", binding: to.binding } })
      )
      assert.strictEqual(stale._tag, "ConditionFailed")
      assert.strictEqual((yield* retained.stat()).metadata.nlink, 0n)
      assert.deepStrictEqual(yield* retained.readAlloc(3), bytes(3, 4, 5))
      const held = yield* owner.usage
      assert.strictEqual(held.entries, 1)
      assert.strictEqual(held.contentBytes, 5n)
      assert.strictEqual(held.unreachableRetainedObjects, 1)
      assert.strictEqual(held.unreachableRetainedContentBytes, 3n)
      yield* retained.close()
      const released = yield* owner.usage
      assert.strictEqual(released.contentBytes, 2n)
      assert.strictEqual(released.unreachableRetainedObjects, 0)
      assert.strictEqual(released.reservedTransientBytes, 0n)
    }).pipe(withClock))

  it.effect("should preserve directory identity and descendants when rename replaces an empty directory", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.makeDirectory("/left/moved", { recursive: true })
      yield* caller.makeDirectory("/right/victim", { recursive: true })
      const child = yield* caller.createFile("/left/moved/child")
      const retained = yield* caller.openDirectory("/right/victim")
      const moved = yield* caller.stat("/left/moved")
      const left = yield* caller.stat("/left")
      const right = yield* caller.stat("/right")
      yield* caller.rename("/left/moved", "/right/victim")
      const after = yield* caller.stat("/right/victim")
      assert.isTrue(VFS.equalsObjectReference(after.reference, moved.reference))
      assert.strictEqual(after.metadata.nlink, moved.metadata.nlink)
      assert.isTrue(VFS.equalsObjectReference(yield* caller.lookup("/right/victim/child"), child.reference))
      assert.isTrue(VFS.equalsObjectReference(yield* caller.lookup("/right/victim/.."), right.reference))
      const nextLeft = yield* caller.stat("/left")
      const nextRight = yield* caller.stat("/right")
      assert.strictEqual(nextLeft.metadata.nlink, left.metadata.nlink - 1n)
      assert.strictEqual(nextRight.metadata.nlink, right.metadata.nlink)
      if (
        left.kind !== "directory" || right.kind !== "directory" || nextLeft.kind !== "directory" ||
        nextRight.kind !== "directory"
      ) {
        throw new Error("Expected parent directories")
      }
      assert.isFalse(VFS.equalsNamespaceRevision(left.namespaceRevision, nextLeft.namespaceRevision))
      assert.isFalse(VFS.equalsNamespaceRevision(right.namespaceRevision, nextRight.namespaceRevision))
      assert.strictEqual((yield* retained.stat()).metadata.nlink, 0n)
      assert.strictEqual((yield* owner.usage).unreachableRetainedObjects, 1)
      yield* retained.close()
      assert.strictEqual((yield* owner.usage).unreachableRetainedObjects, 0)
      assert.strictEqual((yield* owner.usage).unreachableRetainedContentBytes, 0n)
    }).pipe(withClock))

  it.effect("should recheck reachable authority when an object reference loses its visible route", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make({ root: { mode: 0o777 } })
      const admin = yield* owner.authorize({ credentials: { ...credentials, privileged: true } })
      const user = yield* owner.authorize({ credentials: { uid: 50, gid: 50 } })
      yield* admin.makeDirectory("/hidden", { mode: 0 })
      yield* admin.writeFile("/visible", bytes(1))
      const reference = yield* user.lookup("/visible")
      yield* admin.makeHardLink({ reference }, "/hidden/alias")
      yield* admin.unlink("/visible")
      const denied = yield* Effect.flip(user.stat(reference))
      assert.strictEqual(denied._tag, "AccessDenied")
      if (denied._tag === "AccessDenied") assert.strictEqual(denied.reason, "temporarilyInaccessibleReference")
      yield* admin.setAttributes("/hidden", { mode: 0o755 })
      assert.isTrue(VFS.equalsObjectReference(reference, (yield* user.stat(reference)).reference))
      yield* admin.unlink("/hidden/alias")
      const stale = yield* Effect.flip(user.stat(reference))
      assert.strictEqual(stale._tag, "InvalidResource")
      if (stale._tag === "InvalidResource") assert.strictEqual(stale.reason, "stale")
      assert.isTrue(Option.isNone(yield* admin.observeRouteParent("/")))
    }).pipe(withClock))

  it.effect("should return coherent listings with distinct search permissions when a reader can list names", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const admin = yield* owner.authorize({ credentials: { ...credentials, privileged: true } })
      const reader = yield* owner.authorize({ credentials: { uid: 50, gid: 50 } })
      yield* admin.writeFile("/a", bytes(1))
      yield* admin.makeSymlink("/z", "a")
      yield* admin.setAttributes("/", { mode: 0o744 })
      const childrenBefore = yield* Effect.forEach(["/a", "/z"], (target) => admin.linkStat(target))
      const rootBefore = yield* admin.stat("/")
      yield* TestClock.adjust("1 second")
      const names = yield* reader.readDirectory("/")
      assert.deepStrictEqual(names.names.map(text), ["a", "z"])
      assert.strictEqual(names.directory.metadata.atime, 1_000_000_000n)
      const afterNames = yield* admin.stat("/")
      assert.isTrue(VFS.equalsObjectRevision(names.directory.revision, afterNames.revision))
      yield* TestClock.adjust("1 second")
      assert.strictEqual((yield* Effect.flip(reader.readDirectoryEntries("/")))._tag, "AccessDenied")
      assert.strictEqual((yield* Effect.flip(reader.observeEntry({ directory: "/", name: "a" })))._tag, "AccessDenied")
      assert.isTrue(VFS.equalsObjectRevision(afterNames.revision, (yield* admin.stat("/")).revision))
      const rich = yield* admin.readDirectoryEntries("/")
      assert.deepStrictEqual(rich.entries.map((entry) => text(entry.name)), ["a", "z"])
      assert.strictEqual(rich.directory.metadata.atime, 2_000_000_000n)
      assert.deepStrictEqual(rich.entries.map((entry) => entry.object.kind), ["file", "symlink"])
      assert.deepStrictEqual(
        rich.entries.map((entry) => entry.object.metadata),
        childrenBefore.map((child) => child.metadata)
      )
      for (const child of rich.entries) {
        const observed = yield* admin.observeEntry({ directory: "/", name: child.name })
        if (observed.state !== "present") throw new Error("Expected a listed entry")
        assert.isTrue(VFS.equalsEntryBinding(child.binding, observed.binding))
        assert.isTrue(VFS.equalsObjectRevision(child.object.revision, observed.object.revision))
      }
      if (rootBefore.kind !== "directory") throw new Error("Expected root directory")
      assert.isTrue(VFS.equalsNamespaceRevision(rootBefore.namespaceRevision, rich.directory.namespaceRevision))
    }).pipe(withClock))

  it.effect("should snapshot current input and isolate output when the same write Effect reruns", () =>
    Effect.gen(function*() {
      const input = new Uint8Array([1, 2, 3])
      const options: VFS.PathWriteFileOptions = { placement: "replace" }
      let changeInput = false
      const active = yield* Clock.Clock
      const clock: Clock.Clock = {
        ...active,
        currentTimeNanosUnsafe: () => {
          if (changeInput) input.fill(9)
          return active.currentTimeNanosUnsafe()
        }
      }
      const owner = yield* VFS.make().pipe(Effect.provideService<Clock.Clock, Clock.Clock>(Clock.Clock, clock))
      const caller = yield* owner.authorize({ credentials })
      const write = caller.writeFile("/file", input, options)
      changeInput = true
      yield* write
      assert.deepStrictEqual(yield* caller.readFile("/file"), new Uint8Array([1, 2, 3]))
      input.set([4, 5, 6])
      yield* write
      const output = yield* caller.readFile("/file")
      assert.deepStrictEqual(output, new Uint8Array([4, 5, 6]))
      output.fill(0)
      assert.deepStrictEqual(yield* caller.readFile("/file"), new Uint8Array([4, 5, 6]))
    }).pipe(withClock))

  it.effect("should reject the old creation receipt when a directory binding is removed and reinserted", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      const created = yield* caller.makeDirectoryEntry("/temp")
      assert.strictEqual(created.state, "present")
      assert.strictEqual(created.object.kind, "directory")
      yield* caller.rename("/temp", "/held")
      yield* caller.rename("/held", "/temp")
      const rejected = yield* Effect.flip(
        caller.removeDirectory("/temp", { entry: { expected: "binding", binding: created.binding } })
      )
      assert.strictEqual(rejected._tag, "ConditionFailed")
      assert.isTrue(VFS.equalsObjectReference(created.object.reference, yield* caller.lookup("/temp")))
    }).pipe(withClock))

  it.effect("should resample the source address and nested guard when a hard-link Effect reruns", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.makeDirectory("/directory")
      yield* caller.writeFile("/directory/a", new Uint8Array([1]))
      yield* caller.writeFile("/directory/b", new Uint8Array([2]))
      const a = yield* caller.lookup("/directory/a")
      const b = yield* caller.lookup("/directory/b")
      const directory = yield* caller.openDirectory("/directory")
      const address = { directory, name: path("a") }
      const guard = { expected: "present" as const, object: a }
      const source = { entry: address, conditions: { entry: guard } }
      const link = caller.makeHardLink(source, "/copy")

      yield* link
      assert.isTrue(VFS.equalsObjectReference(yield* caller.lookup("/copy"), a))
      yield* caller.unlink("/copy")
      address.name = path("b")
      guard.object = b
      yield* link
      assert.isTrue(VFS.equalsObjectReference(yield* caller.lookup("/copy"), b))
      yield* caller.unlink("/copy")
      guard.object = a
      assert.strictEqual((yield* Effect.flip(link))._tag, "ConditionFailed")
      assert.strictEqual((yield* Effect.flip(caller.stat("/copy")))._tag, "NotFound")
      assert.strictEqual((yield* owner.usage).operations, 0)
      assert.strictEqual((yield* owner.usage).reservedTransientBytes, 0n)
    }).pipe(withClock))

  it.effect("should preserve byte names and unsigned ordering when names have distinct raw encodings", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      const raw = Result.getOrThrow(BytePath.fromBytes(bytes(255)))
      yield* caller.writeFile({ directory: "/", name: raw }, bytes(1))
      yield* caller.createFile("/é")
      yield* caller.createFile("/e\u0301")
      yield* caller.createFile("/a\\b")
      yield* caller.createFile("/\ufeffx")
      const listing = yield* caller.readDirectory("/")
      assert.deepStrictEqual(listing.names.map(BytePath.toBytes), [
        bytes(97, 92, 98),
        bytes(101, 204, 129),
        bytes(195, 169),
        bytes(239, 187, 191, 120),
        bytes(255)
      ])
      assert.deepStrictEqual(yield* caller.readFile({ directory: "/", name: raw }), bytes(1))
      assert.strictEqual((yield* Effect.flip(caller.createFile("/bad\0")))._tag, "InvalidInput")
    }).pipe(withClock))

  it.effect("should require victim ownership when a sticky directory entry is removed or renamed", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make({ root: { mode: 0o777 } })
      const admin = yield* owner.authorize({ credentials: { ...credentials, privileged: true } })
      const first = yield* owner.authorize({ credentials: { uid: 10, gid: 10 } })
      const second = yield* owner.authorize({ credentials: { uid: 20, gid: 20 } })
      yield* admin.makeDirectory("/sticky", { mode: 0o1777 })
      yield* admin.setAttributes("/sticky", { mode: 0o1777 })
      yield* first.writeFile("/sticky/file", bytes(1))
      assert.strictEqual((yield* Effect.flip(second.unlink("/sticky/file")))._tag, "AccessDenied")
      assert.strictEqual((yield* Effect.flip(second.rename("/sticky/file", "/sticky/moved")))._tag, "AccessDenied")
      assert.deepStrictEqual(yield* first.readFile("/sticky/file"), bytes(1))
      yield* first.unlink("/sticky/file")
      assert.strictEqual((yield* Effect.flip(admin.stat("/sticky/file")))._tag, "NotFound")
    }).pipe(withClock))

  it.effect("should inherit directory groups without adding membership when a setgid parent creates descendants", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make({ root: { mode: 0o777 } })
      const admin = yield* owner.authorize({ credentials: { ...credentials, privileged: true } })
      const caller = yield* owner.authorize({ credentials: { uid: 10, gid: 10 } })
      yield* admin.makeDirectory("/group")
      yield* admin.setAttributes("/group", { gid: 33, mode: 0o2777 })
      const child = yield* caller.makeDirectory("/group/child")
      yield* caller.createFile("/group/child/file")
      assert.strictEqual(child.metadata.gid, 33)
      assert.strictEqual(child.metadata.mode, 0o2755)
      assert.strictEqual((yield* caller.stat("/group/child/file")).metadata.gid, 33)
      yield* caller.setAttributes("/group/child", { mode: 0o755 })
      assert.strictEqual(
        (yield* Effect.flip(caller.setAttributes("/group/child", { mode: 0o2755 })))._tag,
        "AccessDenied"
      )
      assert.strictEqual(
        (yield* Effect.flip(caller.setAttributes("/group/child/file", { mode: 0o2644 })))._tag,
        "InvalidInput"
      )
    }).pipe(withClock))

  it.effect("should check requested permissions without touching metadata when access follows a symlink", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", bytes(1), { mode: 0o500 })
      yield* caller.makeSymlink("/link", "file")
      const before = yield* caller.stat("/file")
      const linkBefore = yield* caller.linkStat("/link")
      yield* TestClock.adjust("1 second")
      yield* caller.access("/link")
      yield* caller.access("/link", { read: true, execute: true })
      assert.strictEqual((yield* Effect.flip(caller.access("/link", { read: true, write: true })))._tag, "AccessDenied")
      assert.deepStrictEqual(yield* caller.stat("/file"), before)
      assert.deepStrictEqual(yield* caller.linkStat("/link"), linkBefore)
    }).pipe(withClock))

  it.effect("should publish replace bytes when a whole-file write targets existing content", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", bytes(1, 2, 3))
      yield* caller.writeFile("/file", bytes(8, 9), { placement: "replace" })
      assert.deepStrictEqual(yield* caller.readFile("/file"), bytes(8, 9))
    }).pipe(withClock))

  it.effect("should publish start bytes when a whole-file write targets existing content", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", bytes(1, 2, 3))
      yield* caller.writeFile("/file", bytes(8, 9), { placement: "start" })
      assert.deepStrictEqual(yield* caller.readFile("/file"), bytes(8, 9, 3))
    }).pipe(withClock))

  it.effect("should publish append bytes when a whole-file write targets existing content", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", bytes(1, 2, 3))
      yield* caller.writeFile("/file", bytes(8, 9), { placement: "append" })
      assert.deepStrictEqual(yield* caller.readFile("/file"), bytes(1, 2, 3, 8, 9))
    }).pipe(withClock))

  it.effect("should return post-read metadata and prior access time when a whole file is observed atomically", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", bytes(1, 2))
      const before = yield* caller.stat("/file")
      yield* TestClock.adjust("1 second")
      const read = yield* caller.readFileObserved("/file")
      assert.deepStrictEqual(read.value, bytes(1, 2))
      assert.strictEqual(read.accessTimeBeforeRead, before.metadata.atime)
      assert.strictEqual(read.object.metadata.atime, 1_000_000_000n)
      assert.isTrue(VFS.equalsObjectRevision(read.object.revision, (yield* caller.stat("/file")).revision))
      assert.isFalse(VFS.equalsObjectRevision(read.object.revision, before.revision))
    }).pipe(withClock))

  it.effect("should preserve all attributes when a combined request exceeds the caller's authority", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.createFile("/file", { mode: 0o600 })
      const before = yield* caller.stat("/file")
      assert.strictEqual((yield* Effect.flip(caller.setAttributes("/file", { mode: 0, uid: 1 })))._tag, "AccessDenied")
      assert.deepStrictEqual(yield* caller.stat("/file"), before)
      const atime = DateTime.unixNanoFromNanoseconds(-1n)
      const mtime = DateTime.unixNanoFromNanoseconds(42n)
      yield* TestClock.adjust("1 second")
      yield* caller.setAttributes("/file", { atime, mtime })
      const after = yield* caller.stat("/file")
      assert.strictEqual(after.metadata.atime, atime)
      assert.strictEqual(after.metadata.mtime, mtime)
      assert.strictEqual(after.metadata.ctime, 1_000_000_000n)
      assert.strictEqual(after.metadata.birthtime, before.metadata.birthtime)
    }).pipe(withClock))

  it.effect("should reject stale content guards without mutation when a file changed after observation", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", bytes(1))
      const old = yield* caller.stat("/file")
      yield* caller.writeFile("/file", bytes(2))
      const before = yield* caller.stat("/file")
      assert.strictEqual(
        (yield* Effect.flip(caller.writeFile("/file", bytes(3), { expectedRevision: old.revision })))._tag,
        "ConditionFailed"
      )
      assert.deepStrictEqual(yield* caller.stat("/file"), before)
      assert.deepStrictEqual(yield* caller.readFile("/file"), bytes(2))
    }).pipe(withClock))

  it.effect("should preserve observations when metadata and alias rename are true noops", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", bytes(1))
      yield* caller.makeHardLink({ entry: "/file" }, "/alias")
      const before = yield* caller.stat("/file")
      const parent = yield* caller.stat("/")
      yield* TestClock.adjust("1 second")
      yield* caller.setAttributes("/file", { mode: before.metadata.mode })
      yield* caller.rename("/file", "/alias")
      assert.deepStrictEqual(yield* caller.stat("/file"), before)
      assert.deepStrictEqual(yield* caller.stat("/"), parent)
      assert.deepStrictEqual(yield* caller.readFile("/alias"), bytes(1))
    }).pipe(withClock))

  it.effect("should preserve supplied modes when creation options use inherited and non-enumerable properties", () =>
    Effect.gen(function*() {
      class InheritedMode {
        get mode() {
          return 0
        }
      }
      const owner = yield* VFS.make({ limits: { synchronous: true } })
      const caller = yield* owner.authorize({ credentials })
      const inherited = yield* caller.createFile("/inherited", new InheritedMode())
      const sync = yield* caller.acquireSync
      const own = Object.defineProperty({ mode: 0 }, "mode", { enumerable: false })
      const hidden = Result.getOrThrow(sync.createFile("/hidden", own))
      assert.strictEqual(inherited.metadata.mode, 0)
      assert.strictEqual(hidden.metadata.mode, 0)
    }).pipe(withClock))

  it.effect("should reject changed option structure without mutation when an address getter adds a field", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials: { uid: 0, gid: 0 } })
      yield* caller.writeFile("/late", new Uint8Array([1]))
      const options: VFS.WriteFileOptions = {}
      const address = {
        directory: "/",
        get name() {
          Object.defineProperty(options, "unexpected", { enumerable: true, value: true })
          return "late"
        }
      }
      const error = yield* Effect.flip(caller.writeFile(address, new Uint8Array([2]), options))
      assert.strictEqual(error._tag, "InvalidInput")
      assert.deepStrictEqual(yield* caller.readFile("/late"), new Uint8Array([1]))
    }).pipe(withClock))

  it.effect("should share one caller within its layer scope when a filesystem layer is provided", () =>
    Effect.gen(function*() {
      const program = Effect.gen(function*() {
        const first = yield* VFS.VirtualFileSystem
        yield* first.writeFile("/file", bytes(1))
        const second = yield* VFS.VirtualFileSystem
        assert.strictEqual(second.instanceNumber, first.instanceNumber)
        assert.deepStrictEqual(yield* second.readFile("/file"), bytes(1))
        return first
      })
      const released = yield* program.pipe(Effect.provide(VFS.layer({ caller: { credentials } })))
      assert.strictEqual((yield* Effect.flip(released.stat("/")))._tag, "InvalidResource")
    }).pipe(withClock))

  it.effect("should preserve the original lifetime and instance identity when an existing caller is borrowed by a layer", () =>
    Effect.gen(function*() {
      const first = yield* VFS.make()
      const scope = yield* makeScope
      const caller = yield* first.authorize({ credentials }).pipe(Scope.provide(scope))
      const number = caller.instanceNumber
      const derived = yield* caller.withCurrentDirectory("/")
      const other = yield* (yield* VFS.make()).authorize({ credentials })
      assert.isTrue(number > 0n)
      assert.strictEqual(derived.instanceNumber, number)
      assert.notStrictEqual(other.instanceNumber, number)
      yield* Effect.gen(function*() {
        const borrowed = yield* VFS.VirtualFileSystem
        yield* borrowed.writeFile("/file", bytes(1))
      }).pipe(Effect.provide(VFS.layerCaller(caller)))
      assert.deepStrictEqual(yield* caller.readFile("/file"), bytes(1))
      assert.strictEqual((yield* first.usage).callers, 2)
      yield* Scope.close(scope, Exit.void)
      assert.strictEqual(caller.instanceNumber, number)
      assert.strictEqual((yield* Effect.flip(caller.stat("/")))._tag, "InvalidResource")
      assert.deepStrictEqual(yield* derived.readFile("/file"), bytes(1))
    }).pipe(withClock))

  it.effect("should preserve supplied attribute values when properties are inherited or non-enumerable", () =>
    Effect.gen(function*() {
      class InheritedMode {
        get mode() {
          return 0
        }
      }
      const owner = yield* VFS.make({ limits: { synchronous: true } })
      const caller = yield* owner.authorize({ credentials })
      yield* caller.createFile("/inherited")
      yield* caller.createFile("/hidden")
      yield* caller.setAttributes("/inherited", new InheritedMode())
      const sync = yield* caller.acquireSync
      Result.getOrThrow(
        sync.setAttributes("/hidden", Object.defineProperty({ mode: 0 }, "mode", { enumerable: false }))
      )
      assert.strictEqual((yield* caller.stat("/inherited")).metadata.mode, 0)
      assert.strictEqual((yield* caller.stat("/hidden")).metadata.mode, 0)
    }).pipe(withClock))

  it.effect("should enforce nested binding fields when stale conditions are inherited or non-enumerable", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      const address = { directory: "/", name: "file" }
      yield* caller.createFile(address)
      const old = yield* caller.observeEntry(address)
      assert.strictEqual(old.state, "present")
      if (old.state !== "present") return
      const binding = old.binding
      class InheritedBinding {
        get expected(): "binding" {
          return "binding"
        }
        get binding() {
          return binding
        }
      }
      class InheritedOptions {
        get conditions() {
          return { entry: new InheritedBinding() }
        }
      }
      const hidden: { readonly expected: "binding"; readonly binding: VFS.EntryBinding } = {
        expected: "binding",
        binding
      }
      Object.defineProperty(hidden, "expected", { enumerable: false })
      Object.defineProperty(hidden, "binding", { enumerable: false })
      yield* caller.unlink(address)
      yield* caller.createFile(address)
      const hiddenConditions = { entry: hidden }
      const optionsList = [
        new InheritedOptions(),
        Object.defineProperty({ conditions: hiddenConditions }, "conditions", { enumerable: false })
      ]
      for (const options of optionsList) {
        assert.strictEqual((yield* Effect.flip(caller.writeFile(address, bytes(2), options)))._tag, "ConditionFailed")
        assert.deepStrictEqual(yield* caller.readFile(address), bytes())
      }
    }).pipe(withClock))

  it.effect("should reject changed preserve-time records without mutation when copy options are resampled after an address getter", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", bytes(1))
      const before = yield* caller.stat("/file")
      for (const changed of [null, { atime: before.metadata.atime, mtime: before.metadata.mtime, unexpected: true }]) {
        let addressed = false
        const address = {
          directory: "/",
          get name() {
            addressed = true
            return "file"
          }
        }
        const options: VFS.AtomicCopyOptions = { overwrite: true }
        Object.defineProperty(options, "preserveTimes", {
          get: () => addressed ? changed : undefined
        })
        assert.strictEqual(
          (yield* Effect.flip(caller.publishCopiedFile(address, bytes(2), options)))._tag,
          "InvalidInput"
        )
        assert.isTrue(VFS.equalsObjectRevision((yield* caller.stat("/file")).revision, before.revision))
        assert.deepStrictEqual(yield* caller.readFile("/file"), bytes(1))
      }
    }).pipe(withClock))

  it.effect("should allocate distinct positive identities when compatible library copies and reloads share a runtime", () =>
    Effect.gen(function*() {
      const output = yield* probe(`
import { cpSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
${imports}
${readInstance}
const directory = mkdtempSync(join(tmpdir(), "effect-vfs-identity-"))
try {
writeFileSync(join(directory, "package.json"), JSON.stringify({ type: "module" }))
symlinkSync(fileURLToPath(${JSON.stringify(nodeModulesUrl)}), join(directory, "node_modules"), "dir")
cpSync(fileURLToPath(${JSON.stringify(sourceUrl)}), join(directory, "src"), { recursive: true })
const CopyVfs = await import(pathToFileURL(join(directory, "src/virtual-file-system/VirtualFileSystem.ts")).href)
const CopyEffect = await import(pathToFileURL(join(directory, "src/Effect.ts")).href)
const Reload = await import(${JSON.stringify(publicUrl)} + "?evaluation=second")
const numbers = [await instance(VFS, Effect), await instance(CopyVfs, CopyEffect), await instance(VFS, Effect), await instance(Reload, Effect)]
process.stdout.write(JSON.stringify({
  unique: new Set(numbers).size === 4,
  positive: numbers.every((number) => number > 0n)
}))
} finally { rmSync(directory, { recursive: true, force: true }) }
`)
      assert.deepStrictEqual(JSON.parse(output), { unique: true, positive: true })
    }))

  it.effect("should preserve exact requested times when file copy publication overwrites content and symlink publication replaces its identity", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", bytes(1), { mode: 0o600 })
      const before = yield* caller.stat("/file")
      const atime = DateTime.unixNanoFromNanoseconds(-1n)
      const mtime = DateTime.unixNanoFromNanoseconds(42n)
      yield* TestClock.adjust("1 second")
      const copied = yield* caller.publishCopiedFile("/file", bytes(8, 9), {
        overwrite: true,
        preserveTimes: { atime, mtime }
      })
      assert.isTrue(VFS.equalsObjectReference(copied.reference, before.reference))
      assert.strictEqual(copied.metadata.mode, 0o600)
      assert.strictEqual(copied.metadata.birthtime, before.metadata.birthtime)
      assert.strictEqual(copied.metadata.atime, atime)
      assert.strictEqual(copied.metadata.mtime, mtime)
      assert.strictEqual(copied.metadata.ctime, 1_000_000_000n)
      assert.deepStrictEqual(yield* caller.readFile("/file"), bytes(8, 9))
      const link = yield* caller.publishCopiedSymlink("/file", path("missing"), {
        overwrite: true,
        preserveTimes: { atime, mtime }
      })
      assert.strictEqual(link.kind, "symlink")
      assert.isFalse(VFS.equalsObjectReference(link.reference, copied.reference))
      assert.strictEqual(link.metadata.mode, 0o777)
      assert.strictEqual(link.metadata.atime, atime)
      assert.strictEqual(link.metadata.mtime, mtime)
      assert.strictEqual(text(yield* caller.readLink("/file")), "missing")
    }).pipe(withClock))

  it.effect("should return literal target bytes and coherent access metadata when a symlink read is observed", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.makeSymlink("/link", "missing")
      const before = yield* caller.linkStat("/link")
      yield* TestClock.adjust("1 second")
      const read = yield* caller.readLinkObserved("/link")
      assert.strictEqual(text(read.value), "missing")
      assert.strictEqual(read.accessTimeBeforeRead, before.metadata.atime)
      assert.strictEqual(read.object.metadata.atime, 1_000_000_000n)
      assert.isTrue(VFS.equalsObjectRevision(read.object.revision, (yield* caller.linkStat("/link")).revision))
      assert.strictEqual((yield* Effect.flip(caller.stat("/link")))._tag, "NotFound")
    }).pipe(withClock))

  it.effect("should reject malformed nested conditions without mutation when an address getter changes the supplied options", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", bytes(1))
      let addressed = false
      const address = {
        directory: "/",
        get name() {
          addressed = true
          return "file"
        }
      }
      const options: VFS.WriteFileOptions = {}
      Object.defineProperty(options, "conditions", {
        get: () => addressed ? { entry: null } : undefined
      })
      const before = yield* caller.stat("/file")
      assert.strictEqual((yield* Effect.flip(caller.writeFile(address, bytes(2), options)))._tag, "InvalidInput")
      assert.deepStrictEqual(yield* caller.stat("/file"), before)
      assert.deepStrictEqual(yield* caller.readFile("/file"), bytes(1))
    }).pipe(withClock))

  it.effect("should preserve a directory requirement without creating a file when a symlink target ends with slash", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.makeDirectory("/dir")
      yield* caller.makeSymlink("/link", "dir/missing/")
      assert.strictEqual((yield* Effect.flip(caller.writeFile("/link", bytes(1))))._tag, "NotFound")
      assert.strictEqual(
        (yield* Effect.flip(caller.open("/link", { access: "write", create: "ifmissing" })))._tag,
        "NotFound"
      )
      assert.strictEqual((yield* Effect.flip(caller.stat("/dir/missing")))._tag, "NotFound")
      assert.strictEqual(text(yield* caller.readLink("/link")), "dir/missing/")
    }).pipe(withClock))

  it.effect("should preserve the namespace when a hard-link source becomes malformed during address preparation", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials: { uid: 0, gid: 0 } })
      yield* caller.writeFile("/source", new Uint8Array([1]))
      let addressed = false
      const source: VFS.HardLinkSource = { entry: "/source" }
      // A JavaScript accessor can return malformed input after the admission read.
      Object.defineProperty(source, "entry", { get: () => addressed ? null : "/source" })
      const destination: VFS.EntryAddress = {
        directory: "/",
        get name() {
          addressed = true
          return "linked"
        }
      }
      const error = yield* Effect.flip(caller.makeHardLink(source, destination))
      assert.strictEqual(error._tag, "InvalidInput")
      assert.deepStrictEqual(yield* caller.readFile("/source"), new Uint8Array([1]))
      assert.strictEqual((yield* Effect.flip(caller.stat("/linked")))._tag, "NotFound")
    }).pipe(withClock))

  it.effect("should distinguish token domains when a revision guard cannot identify the selected file", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/a", bytes(1))
      yield* caller.createFile("/b")
      const a = yield* caller.stat("/a")
      const b = yield* caller.stat("/b")
      const other = yield* VFS.make()
      const foreign = yield* other.authorize({ credentials })
      const foreignRevision = (yield* foreign.createFile("/file")).revision
      const wrong = yield* Effect.flip(caller.truncate("/a", 0, { expectedRevision: b.revision }))
      assert.strictEqual(wrong._tag, "InvalidInput")
      if (wrong._tag === "InvalidInput") assert.strictEqual(wrong.reason, "wrongObjectToken")
      assert.strictEqual(
        (yield* Effect.flip(caller.truncate("/a", 0, { expectedRevision: foreignRevision })))._tag,
        "InvalidResource"
      )
      assert.strictEqual(
        (yield* Effect.flip(caller.truncate("/a", 0, { expectedRevision: { ...a.revision } })))._tag,
        "InvalidInput"
      )
      assert.deepStrictEqual(yield* caller.stat("/a"), a)
      assert.deepStrictEqual(yield* caller.readFile("/a"), bytes(1))
    }).pipe(withClock))

  it.effect("should reclaim retained content when an unlinked file is overwritten at content capacity and its last handle closes", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make({ limits: { objects: 2, entries: 1, contentBytes: 1 } })
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", new Uint8Array([1]))
      const handle = yield* caller.open("/file", { access: "readwrite" })
      const reference = (yield* handle.stat()).reference
      yield* caller.unlink("/file")
      const usage = yield* owner.usage
      assert.strictEqual(usage.unreachableRetainedObjects, 1)
      yield* handle.write(new Uint8Array([2]), { position: 0n })
      assert.deepStrictEqual(yield* handle.readAlloc(1, { position: 0n }), new Uint8Array([2]))
      assert.deepStrictEqual(yield* owner.usage, usage)
      yield* handle.close()
      assert.strictEqual((yield* owner.usage).liveObjects, 1)
      assert.strictEqual((yield* owner.usage).contentBytes, 0n)
      assert.strictEqual((yield* owner.usage).unreachableRetainedObjects, 0)
      const stale = yield* Effect.flip(caller.stat(reference))
      assert.strictEqual(stale._tag, "InvalidResource")
      if (stale._tag === "InvalidResource") assert.strictEqual(stale.reason, "stale")
    }).pipe(withClock))
})
