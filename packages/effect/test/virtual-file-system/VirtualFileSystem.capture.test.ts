import { assert, describe, it } from "@effect/vitest"
import { BytePath, Cause, Clock, DateTime, Deferred, Effect, Exit, Fiber, Result, Schema, Scope, Stream } from "effect"
import * as VFS from "effect/virtual-file-system/VirtualFileSystem"

const path = (input: string) => Result.getOrThrow(BytePath.fromString(input))
const text = (input: BytePath.BytePath) => Result.getOrThrow(BytePath.toString(input))
const time = DateTime.unixNanoFromNanoseconds(-123456789n)
const metadata = (objectNumber: bigint, mode = 0o755): VFS.SemanticMetadata => ({
  objectNumber,
  mode,
  uid: 30,
  gid: 40,
  atime: time,
  mtime: time,
  ctime: time,
  birthtime: time
})
const root: VFS.RootRecord = { _tag: "root", id: 10n, metadata: metadata(100n, 0o2777) }
const file: VFS.FileRecord = {
  _tag: "file",
  id: 20n,
  parentId: 10n,
  name: path("file"),
  data: new Uint8Array([1, 2]),
  metadata: metadata(200n, 0o640)
}
const credentials = { uid: 0, gid: 0, privileged: true }
const withClock = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.flatMap(
    Clock.Clock,
    (clock) => effect.pipe(Effect.provideService<Clock.Clock, Clock.Clock>(Clock.Clock, clock))
  )

// The fixtures contain structural records, never runtime authority.
describe("VirtualFileSystem capture schemas", () => {
  it("should preserve exact semantic metadata when decoding structural records", () => {
    const records = [
      VFS.RootRecord.make({ id: 10n, metadata: root.metadata }),
      VFS.DirectoryRecord.make({ id: 30n, parentId: 10n, name: path("dir"), metadata: metadata(300n, 0o3777) }),
      VFS.FileRecord.make({ ...file }),
      VFS.SymlinkRecord.make({
        id: 40n,
        parentId: 10n,
        name: path("link"),
        target: path("../missing"),
        metadata: metadata(400n, 0o777)
      }),
      VFS.AliasRecord.make({ parentId: 10n, name: path("alias"), targetId: 20n })
    ]
    for (const record of records) {
      assert.isTrue(Schema.is(VFS.CaptureRecord)(record))
      assert.isFalse(Schema.is(VFS.ObjectObservation)(record))
    }
    assert.strictEqual(Schema.decodeUnknownSync(VFS.SemanticMetadata)(file.metadata).atime, time)
    for (
      const malformed of [
        { ...file, id: 0n },
        { ...file, metadata: { ...file.metadata, uid: -1 } },
        { ...file, metadata: { ...file.metadata, mode: 0o4000 } },
        { ...file, name: path("a/b") }
      ]
    ) assert.isFalse(Schema.is(VFS.CaptureRecord)(malformed))
    assert.isTrue(Result.isFailure(
      Schema.decodeUnknownResult(VFS.CaptureRecord, { onExcessProperty: "error" })({
        ...root,
        unexpected: true
      })
    ))
  })

  it("should reject unsafe byte views when validating file records", () => {
    const backing: ArrayBuffer = Reflect.construct(ArrayBuffer, [4, { maxByteLength: 4 }])
    const subview = new Uint8Array(backing, 1, 2)
    subview.set([7, 8])
    Object.defineProperty(subview, "length", { value: 0 })
    assert.isTrue(Schema.is(VFS.FileRecord)({ ...file, data: subview }))
    Reflect.apply(Reflect.get(ArrayBuffer.prototype, "resize"), backing, [1])
    assert.isFalse(Schema.is(VFS.FileRecord)({ ...file, data: subview }))
    const detached = new Uint8Array(2)
    structuredClone(detached.buffer, { transfer: [detached.buffer] })
    assert.isFalse(Schema.is(VFS.FileRecord)({ ...file, data: detached }))
    assert.isFalse(Schema.is(VFS.FileRecord)({ ...file, data: new Uint8Array(new SharedArrayBuffer(2)) }))
    assert.isTrue(Schema.is(VFS.FileRecord)({ ...file, data: new Uint8Array(0) }))
  })

  it("should preserve error causes when constructing public expected failures", () => {
    const cause = new Error("boundary failure")
    const error = new VFS.Unrepresentable({ operation: "realPath", reason: "boundaryTarget", target: "utf8", cause })
    assert.strictEqual(error.cause, cause)
    assert.instanceOf(error, Error)
    assert.isTrue(Schema.is(VFS.Unrepresentable)(error))
    assert.isFalse(
      Schema.is(VFS.InvalidInput)({
        _tag: "InvalidInput",
        operation: "open",
        field: "access",
        reason: "unknownReason"
      })
    )
  })
})

describe("VirtualFileSystem public observations", () => {
  it.effect("should reject forged or mismatched authority when validating issued observations", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", new Uint8Array([1]))
      const observed = yield* caller.stat("/file")
      const directory = yield* caller.stat("/")
      const entry = yield* caller.observeEntry({ directory: "/", name: "file" })
      const otherOwner = yield* VFS.make()
      const other = yield* otherOwner.authorize({ credentials })
      const foreign = yield* other.stat("/")
      assert.isTrue(Schema.is(VFS.ObjectObservation)(observed))
      assert.isTrue(Schema.is(VFS.EntryObservation)(entry))
      if (entry.state === "present") {
        assert.isFalse(Schema.is(VFS.EntryObservation)({ ...entry, binding: { ...entry.binding } }))
      }
      assert.isFalse(Schema.is(VFS.ObjectObservation)({ ...directory, namespaceRevision: observed.revision }))
      assert.isFalse(Schema.is(VFS.ObjectObservation)({ ...observed, reference: { ...observed.reference } }))
      assert.isFalse(Schema.is(VFS.ObjectObservation)({ ...observed, reference: observed.revision }))
      assert.isFalse(Schema.is(VFS.ObjectObservation)({ ...observed, revision: foreign.revision }))
      assert.isFalse(
        Schema.is(VFS.ObjectObservation)({
          ...observed,
          metadata: { ...observed.metadata, objectNumber: directory.metadata.objectNumber }
        })
      )
      assert.isFalse(Schema.is(VFS.EntryObservation)({ ...entry, parent: foreign.reference }))
      assert.isFalse(Schema.is(VFS.EntryObservation)({ ...entry, name: path("a/b") }))
      const listing = yield* caller.readDirectoryEntries("/")
      assert.isTrue(Schema.is(VFS.EntryListing)(listing))
      assert.isFalse(Schema.is(VFS.EntryListing)({ ...listing, entries: [...listing.entries, ...listing.entries] }))
      const names = yield* caller.readDirectory("/")
      assert.isTrue(Schema.is(VFS.NameListing)(names))
      assert.isFalse(Schema.is(VFS.NameListing)({ ...names, directory: observed }))
    }).pipe(withClock))

  it.effect("should compare issued identities by meaning when objects and entries change", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/file", new Uint8Array([1]))
      yield* caller.makeHardLink({ entry: "/file" }, "/alias")
      const before = yield* caller.stat("/file")
      const alias = yield* caller.stat("/alias")
      const entry = yield* caller.observeEntry({ directory: "/", name: "file" })
      const sameEntry = yield* caller.observeEntry({ directory: "/", name: "file" })
      assert.isTrue(VFS.equalsObjectReference(before.reference, alias.reference))
      assert.isTrue(VFS.equalsObjectRevision(before.revision, alias.revision))
      assert.isFalse(VFS.equalsObjectReference(before.reference, { ...before.reference }))
      assert.isFalse(VFS.equalsObjectRevision(before.revision, { ...before.revision }))
      assert.strictEqual(entry.state, "present")
      assert.strictEqual(sameEntry.state, "present")
      if (entry.state !== "present" || sameEntry.state !== "present") return
      assert.isTrue(VFS.equalsEntryBinding(entry.binding, sameEntry.binding))
      assert.isTrue(VFS.equalsNamespaceRevision(entry.parentNamespaceRevision, sameEntry.parentNamespaceRevision))
      yield* caller.writeFile("/alias", new Uint8Array([2]))
      const changed = yield* caller.stat("/file")
      assert.isTrue(VFS.equalsObjectReference(before.reference, changed.reference))
      assert.isFalse(VFS.equalsObjectRevision(before.revision, changed.revision))
      yield* caller.unlink("/file")
      yield* caller.makeHardLink({ entry: "/alias" }, "/file")
      const replaced = yield* caller.observeEntry({ directory: "/", name: "file" })
      assert.strictEqual(replaced.state, "present")
      if (replaced.state !== "present") return
      assert.isFalse(VFS.equalsEntryBinding(entry.binding, replaced.binding))
      assert.isFalse(VFS.equalsNamespaceRevision(entry.parentNamespaceRevision, replaced.parentNamespaceRevision))
      assert.isTrue(VFS.equalsObjectReference(before.reference, replaced.object.reference))
    }).pipe(withClock))
})

describe("VirtualFileSystem capture and restore", () => {
  it.effect("should retain an independent byte-sorted graph when the source scope and output bytes change", () =>
    Effect.gen(function*() {
      const sourceScope = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials }).pipe(Scope.provide(sourceScope))
      yield* caller.makeDirectory("/a")
      yield* caller.writeFile("/a/file", new Uint8Array([1, 2]))
      yield* caller.makeHardLink({ entry: "/a/file" }, "/z")
      const rawName = Result.getOrThrow(BytePath.fromBytes(new Uint8Array([47, 255])))
      yield* caller.makeSymlink(rawName, "missing")
      const before = yield* caller.stat("/a/file")
      const capture = yield* owner.capture()
      assert.deepStrictEqual((yield* caller.stat("/a/file")).metadata, before.metadata)
      assert.strictEqual((yield* owner.usage).reservedTransientBytes, 0n)
      const first = yield* Stream.runCollect(capture.records())
      assert.deepStrictEqual(first.map((record) => record._tag), ["root", "directory", "file", "alias", "symlink"])
      assert.deepStrictEqual(first.flatMap((record) => record._tag === "root" ? [] : [BytePath.toBytes(record.name)]), [
        new Uint8Array([97]),
        new Uint8Array([102, 105, 108, 101]),
        new Uint8Array([122]),
        new Uint8Array([255])
      ])
      const primary = first.find((record) => record._tag === "file")
      const alias = first.find((record) => record._tag === "alias")
      assert.isDefined(primary)
      assert.isDefined(alias)
      if (primary === undefined || alias === undefined) return
      assert.strictEqual(alias.targetId, primary.id)
      primary.data.fill(9)
      yield* caller.writeFile("/a/file", new Uint8Array([5]))
      yield* caller.unlink("/z")
      yield* Scope.close(sourceScope, Exit.void)
      const second = yield* Stream.runCollect(capture.records())
      const original = second.find((record) => record._tag === "file")
      assert.isDefined(original)
      if (original !== undefined) assert.deepStrictEqual(original.data, new Uint8Array([1, 2]))
      assert.strictEqual(second.length, 5)
      const restored = yield* VFS.restore(capture)
      const restoredCaller = yield* restored.authorize({ credentials })
      assert.deepStrictEqual(yield* restoredCaller.readFile("/z"), new Uint8Array([1, 2]))
    }).pipe(withClock))

  it.effect("should exclude retained unlinked objects when capturing the reachable graph", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const caller = yield* owner.authorize({ credentials })
      yield* caller.writeFile("/orphan", new Uint8Array([1, 2, 3]))
      const handle = yield* caller.open("/orphan")
      yield* caller.unlink("/orphan")
      const usage = yield* owner.usage
      assert.strictEqual(usage.unreachableRetainedObjects, 1)
      const capture = yield* owner.capture()
      assert.deepStrictEqual((yield* Stream.runCollect(capture.records())).map((record) => record._tag), ["root"])
      assert.deepStrictEqual(yield* owner.usage, usage)
      yield* handle.close()
      assert.strictEqual((yield* owner.usage).liveObjects, 1)
    }).pipe(withClock))

  it.effect("should preserve metadata and aliases with fresh authority when records arrive out of order", () =>
    Effect.gen(function*() {
      const directory: VFS.DirectoryRecord = {
        _tag: "directory",
        id: 30n,
        parentId: 10n,
        name: path("directory"),
        metadata: metadata(300n, 0o3777)
      }
      const symlink: VFS.SymlinkRecord = {
        _tag: "symlink",
        id: 40n,
        parentId: 10n,
        name: path("link"),
        target: path("link"),
        metadata: metadata(400n, 0o777)
      }
      const source = Stream.fromIterable<VFS.CaptureRecord>([
        { _tag: "alias", parentId: 30n, name: path("alias"), targetId: 20n },
        { _tag: "alias", parentId: 30n, name: path("link-alias"), targetId: 40n },
        file,
        directory,
        symlink,
        root
      ])
      const restored = yield* VFS.restore(source)
      const again = yield* VFS.restore(source)
      const caller = yield* restored.authorize({ credentials })
      const againCaller = yield* again.authorize({ credentials })
      const observed = yield* caller.stat("/file")
      assert.notStrictEqual(caller.instanceNumber, againCaller.instanceNumber)
      assert.isFalse(VFS.equalsObjectReference(observed.reference, yield* againCaller.lookup("/file")))
      assert.deepStrictEqual(observed.metadata, { ...file.metadata, kind: "file", size: 2n, nlink: 2n })
      assert.deepStrictEqual((yield* caller.stat("/directory")).metadata, {
        ...directory.metadata,
        kind: "directory",
        size: 0n,
        nlink: 2n
      })
      assert.deepStrictEqual((yield* caller.stat("/")).metadata, {
        ...root.metadata,
        kind: "directory",
        size: 0n,
        nlink: 3n
      })
      assert.isTrue(
        VFS.equalsObjectReference(
          (yield* caller.linkStat("/link")).reference,
          (yield* caller.linkStat("/directory/link-alias")).reference
        )
      )
      assert.strictEqual(text(yield* caller.readLink("/link")), "link")
      assert.isTrue(VFS.equalsObjectReference(observed.reference, yield* caller.lookup("/directory/alias")))
      assert.isTrue((yield* caller.createFile("/new")).metadata.objectNumber > 400n)
      assert.strictEqual((yield* restored.usage).reservedTransientBytes, 0n)
    }).pipe(withClock))

  it.effect("should snapshot each record at consumption when a producer later mutates its bytes and metadata", () =>
    Effect.gen(function*() {
      const data = new Uint8Array([1, 2])
      const mutableMetadata = { ...file.metadata }
      const supplied: VFS.FileRecord = { ...file, data, metadata: mutableMetadata }
      const source = Stream.unfold(
        0,
        (index): Effect.Effect<readonly [VFS.CaptureRecord, number] | undefined> =>
          Effect.sync(() => {
            if (index === 0) return [supplied, 1]
            if (index === 1) {
              data.fill(9)
              mutableMetadata.uid = 99
              return [root, 2]
            }
            return undefined
          })
      )
      const restored = yield* VFS.restore(source)
      const caller = yield* restored.authorize({ credentials })
      assert.deepStrictEqual(yield* caller.readFile("/file"), new Uint8Array([1, 2]))
      assert.strictEqual((yield* caller.stat("/file")).metadata.uid, 30)
      const restore = VFS.restore(Stream.make(root, supplied))
      const first = yield* restore
      data.fill(7)
      const second = yield* restore
      const firstCaller = yield* first.authorize({ credentials })
      const secondCaller = yield* second.authorize({ credentials })
      assert.deepStrictEqual(yield* firstCaller.readFile("/file"), new Uint8Array([9, 9]))
      assert.deepStrictEqual(yield* secondCaller.readFile("/file"), new Uint8Array([7, 7]))
    }).pipe(withClock))

  it.effect("should preserve structural root fields when restore receives inherited accessors or non-enumerable properties", () =>
    Effect.gen(function*() {
      const owner = yield* VFS.make()
      const captured = yield* Stream.runCollect((yield* owner.capture()).records())
      const original = captured.find((record) => record._tag === "root")
      assert.isDefined(original)
      if (original === undefined) return
      const sourceRoot: VFS.RootRecord = original
      class InheritedRoot {
        get _tag(): "root" {
          return "root"
        }
        get id() {
          return sourceRoot.id
        }
        get metadata() {
          return sourceRoot.metadata
        }
      }
      const nonEnumerable = { ...sourceRoot }
      for (const field of ["_tag", "id", "metadata"] as const) {
        Object.defineProperty(nonEnumerable, field, { enumerable: false })
      }
      for (const record of [new InheritedRoot(), nonEnumerable]) {
        const restored = yield* VFS.restore(Stream.succeed(record))
        const output = yield* Stream.runCollect((yield* restored.capture()).records())
        assert.deepStrictEqual(output, [original])
      }
    }).pipe(withClock))

  it.effect("should reject invalid graphs when a restore source completes", () =>
    Effect.gen(function*() {
      const directory: VFS.DirectoryRecord = {
        _tag: "directory",
        id: 30n,
        parentId: 10n,
        name: path("directory"),
        metadata: metadata(300n)
      }
      const cases: ReadonlyArray<readonly [ReadonlyArray<VFS.CaptureRecord>, VFS.InvalidRestore["reason"]]> = [
        [[], "root"],
        [[root, root], "duplicateId"],
        [[root, { ...file, metadata: metadata(100n) }], "duplicateObjectNumber"],
        [[root, { ...file, parentId: 999n }], "parent"],
        [[root, file, { _tag: "alias", parentId: 10n, name: file.name, targetId: 20n }], "duplicateEntry"],
        [[root, { ...file, name: path("a/b") }], "name"],
        [[root, directory, { _tag: "alias", parentId: 10n, name: path("alias"), targetId: 30n }], "directoryAlias"],
        [[root, { ...directory, parentId: 30n }], "cycle"]
      ]
      for (const [records, reason] of cases) {
        const error = yield* Effect.flip(VFS.restore(Stream.fromIterable(records)))
        assert.strictEqual(error._tag, "InvalidRestore")
        if (error._tag === "InvalidRestore") assert.strictEqual(error.reason, reason)
      }
      assert.strictEqual((yield* (yield* VFS.restore(Stream.succeed(root))).usage).liveObjects, 1)
      assert.strictEqual(
        (yield* Effect.flip(VFS.restore(Stream.make(root, { ...file, extra: true }))))._tag,
        "InvalidRestore"
      )
    }).pipe(withClock))

  for (const invalidation of ["detach", "resize"] as const) {
    it.effect(`should reject unsafe record bytes when a metadata getter causes them to ${invalidation}`, () =>
      Effect.gen(function*() {
        const backing: ArrayBuffer = Reflect.construct(ArrayBuffer, [4, { maxByteLength: 4 }])
        const data = new Uint8Array(backing, 1, 2)
        Object.defineProperty(data, "length", { value: 0 })
        const supplied: VFS.FileRecord = { ...file, data, metadata: { ...file.metadata } }
        Object.defineProperty(supplied.metadata, "uid", {
          enumerable: true,
          get() {
            if (invalidation === "detach" && backing.byteLength > 0) structuredClone(backing, { transfer: [backing] })
            if (invalidation === "resize") Reflect.apply(Reflect.get(ArrayBuffer.prototype, "resize"), backing, [1])
            return 30
          }
        })
        let finalized = false
        let delivered = false
        let laterPulled = false
        const source = Stream.concat(
          Stream.make(root, supplied),
          Stream.sync(() => {
            laterPulled = true
            return root
          })
        ).pipe(Stream.ensuring(Effect.sync(() => {
          finalized = true
        })))
        const result = yield* Effect.result(
          VFS.restore(source).pipe(Effect.tap(() =>
            Effect.sync(() => {
              delivered = true
            })
          ))
        )
        assert.isTrue(Result.isFailure(result))
        if (Result.isFailure(result)) assert.strictEqual(result.failure._tag, "InvalidRestore")
        assert.isTrue(finalized)
        assert.isFalse(delivered)
        assert.isFalse(laterPulled)
      }).pipe(withClock))
  }

  it.effect("should preserve an input defect and finalize the producer when an input getter throws", () =>
    Effect.gen(function*() {
      for (const input of ["record", "metadata"] as const) {
        const defect = new Error(`${input} getter`)
        const supplied = { ...file, metadata: { ...file.metadata } }
        Object.defineProperty(input === "record" ? supplied : supplied.metadata, input === "record" ? "data" : "uid", {
          enumerable: true,
          get() {
            throw defect
          }
        })
        let finalized = false
        let delivered = false
        const source = Stream.make(root, supplied).pipe(Stream.ensuring(Effect.sync(() => {
          finalized = true
        })))
        const exit = yield* Effect.exit(
          VFS.restore(source).pipe(Effect.tap(() =>
            Effect.sync(() => {
              delivered = true
            })
          ))
        )
        assert.isTrue(finalized)
        assert.isFalse(delivered)
        assert.isTrue(Exit.isFailure(exit))
        if (Exit.isFailure(exit)) {
          const observed = Result.getOrThrow(Cause.findDefect(exit.cause))
          if (observed === defect) continue
          assert.instanceOf(observed, Error)
          if (observed instanceof Error) {
            assert.isTrue(Cause.isCause(observed.cause))
            if (Cause.isCause(observed.cause)) {
              assert.strictEqual(Result.getOrThrow(Cause.findDefect(observed.cause)), defect)
            }
          }
        }
      }
    }).pipe(withClock))

  it.effect("should finish producer cleanup before handoff when restore succeeds", () =>
    Effect.gen(function*() {
      let finalized = false
      const scope = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
      const source = Stream.succeed(root).pipe(Stream.ensuring(Effect.sync(() => {
        finalized = true
      })))
      const owner = yield* VFS.restore(source).pipe(Scope.provide(scope))
      assert.isTrue(finalized)
      yield* Scope.close(scope, Exit.void)
      const caller = yield* owner.authorize({ credentials })
      assert.strictEqual((yield* caller.stat("/")).metadata.objectNumber, 100n)
    }).pipe(withClock))

  it.effect("should preserve producer failure and cleanup defects without handoff when restoration fails", () =>
    Effect.gen(function*() {
      const defect = new Error("producer cleanup")
      const source = Stream.concat(Stream.succeed(root), Stream.fail("producer failure")).pipe(
        Stream.ensuring(Effect.die(defect))
      )
      const baseline = yield* Effect.exit(Stream.runDrain(source))
      let delivered = false
      const exit = yield* Effect.exit(
        VFS.restore(source).pipe(Effect.tap(() =>
          Effect.sync(() => {
            delivered = true
          })
        ))
      )
      assert.isFalse(delivered)
      assert.isTrue(Exit.isFailure(exit))
      assert.isTrue(Exit.isFailure(baseline))
      if (Exit.isFailure(exit) && Exit.isFailure(baseline)) {
        assert.deepStrictEqual(exit.cause.reasons, baseline.cause.reasons)
      }
      assert.strictEqual(
        yield* Effect.flip(VFS.restore(Stream.concat(Stream.succeed(root), Stream.fail("producer failure")))),
        "producer failure"
      )
    }).pipe(withClock))

  it.effect("should prevent handoff and retain validation failure when producer cleanup also defects", () =>
    Effect.gen(function*() {
      const defect = new Error("producer cleanup")
      let delivered = false
      const detached = new Uint8Array(2)
      structuredClone(detached.buffer, { transfer: [detached.buffer] })
      const source = Stream.make(root, { ...file, data: detached }).pipe(Stream.ensuring(Effect.die(defect)))
      const exit = yield* Effect.exit(
        VFS.restore(source).pipe(Effect.tap(() =>
          Effect.sync(() => {
            delivered = true
          })
        ))
      )
      assert.isFalse(delivered)
      assert.isTrue(Exit.isFailure(exit))
      if (Exit.isFailure(exit)) {
        assert.isTrue(
          exit.cause.reasons.some((reason) =>
            (Cause.isFailReason(reason)
              ? reason.error
              : Cause.isDieReason(reason)
              ? reason.defect
              : undefined) instanceof VFS.InvalidRestore
          )
        )
        assert.isTrue(exit.cause.reasons.some((reason) => Cause.isDieReason(reason) && reason.defect === defect))
      }
    }).pipe(withClock))

  it.effect("should prevent handoff when a valid producer cleanup defects", () =>
    Effect.gen(function*() {
      const defect = new Error("producer cleanup")
      let delivered = false
      const source = Stream.succeed(root).pipe(Stream.ensuring(Effect.die(defect)))
      const exit = yield* Effect.exit(
        VFS.restore(source).pipe(Effect.tap(() =>
          Effect.sync(() => {
            delivered = true
          })
        ))
      )
      assert.isFalse(delivered)
      assert.isTrue(Exit.isFailure(exit))
      if (Exit.isFailure(exit)) {
        assert.isTrue(exit.cause.reasons.some((reason) => Cause.isDieReason(reason) && reason.defect === defect))
      }
    }).pipe(withClock))

  it.effect("should join producer cleanup without handoff when restore is interrupted", () =>
    Effect.gen(function*() {
      const pulling = yield* Deferred.make<void>()
      const finalizing = yield* Deferred.make<void>()
      const finish = yield* Deferred.make<void>()
      yield* Effect.gen(function*() {
        let delivered = false
        const source = Stream.concat(
          Stream.succeed(root),
          Stream.fromEffect(Deferred.succeed(pulling, undefined).pipe(Effect.andThen(Effect.never)))
        )
          .pipe(Stream.ensuring(Deferred.succeed(finalizing, undefined).pipe(Effect.andThen(Deferred.await(finish)))))
        const fiber = yield* Effect.forkChild(
          VFS.restore(source).pipe(Effect.tap(() =>
            Effect.sync(() => {
              delivered = true
            })
          ))
        )
        yield* Deferred.await(pulling)
        const interrupt = yield* Effect.forkChild(Fiber.interrupt(fiber))
        yield* Deferred.await(finalizing)
        assert.isFalse(delivered)
        yield* Deferred.succeed(finish, undefined)
        yield* Fiber.join(interrupt)
        assert.isTrue(Exit.isFailure(yield* Fiber.await(fiber)))
        assert.isFalse(delivered)
      }).pipe(Effect.ensuring(Deferred.succeed(finish, undefined)))
    }).pipe(withClock))
})
