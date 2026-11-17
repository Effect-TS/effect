import { assert, describe, it } from "@effect/vitest"
import { BytePath, Context, Deferred, Effect, Exit, Fiber, Result, Scope, Stream } from "effect"
import { installStorage } from "effect/virtual-file-system/internal/engine"
import * as Vfs from "effect/virtual-file-system/VirtualFileSystem"

const Limits = Context.Reference<Vfs.LimitOptions>("watch-test-limits", { defaultValue: () => ({}) })
const pathText = (path: BytePath.BytePath) => Effect.fromResult(BytePath.toString(path))
const bytes = (value: string) => new TextEncoder().encode(value)

const options = { create: "exclusive" } as const

const rendered = (changes: ReadonlyArray<Vfs.Change>) =>
  Effect.forEach(changes, (change) => Effect.map(pathText(change.path), (path) => `${change._tag} ${path}`))

const setup = Effect.gen(function*() {
  const volume = yield* Vfs.make({ limits: yield* Limits })
  const owner = yield* volume.authorize({ credentials: { uid: 0, gid: 0, privileged: true }, umask: 0 })
  yield* owner.makeDirectory("/tenant/dir", { recursive: true })
  yield* owner.makeDirectory("/outside")
  yield* owner.writeFile("/tenant/file", bytes("initial"), options)

  return { owner, caller: yield* owner.withRoot("/tenant") }
})

describe("caller watch", () => {
  it.effect("filters outside changes before bounded capacity and rebases inside names", () =>
    Effect.gen(function*() {
      const { owner, caller } = yield* setup
      const stream = yield* caller.watch("/")

      for (let index = 0; index < 12; index++) yield* owner.makeDirectory(`/outside/${index}`)
      yield* owner.makeDirectory("/tenant/visible")
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(Stream.take(stream, 1))), ["Create /visible"])
    }).pipe(Effect.provideService(Limits, { watchEvents: 3 })))

  it.effect("rebases queued events at publication across a later root rename", () =>
    Effect.gen(function*() {
      const { owner, caller } = yield* setup
      const stream = yield* caller.watch("/")
      yield* owner.makeDirectory("/tenant/before")
      yield* owner.rename("/tenant", "/moved")
      yield* owner.makeDirectory("/moved/after")
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(Stream.take(stream, 2))), [
        "Create /before",
        "Create /after"
      ])
    }))

  it.effect("reports all authorized file aliases while excluding outside hard links", () =>
    Effect.gen(function*() {
      const { owner, caller } = yield* setup
      yield* owner.makeHardLink({ entry: "/tenant/file" }, "/tenant/alias")
      yield* owner.makeHardLink({ entry: "/tenant/file" }, "/outside/alias")
      const stream = yield* caller.watch("/file")
      yield* owner.writeFile("/tenant/file", bytes("changed"), {})
      assert.deepStrictEqual((yield* rendered(yield* Stream.runCollect(Stream.take(stream, 2)))).sort(), [
        "Update /alias",
        "Update /file"
      ])
    }))

  it.effect("reports removal when one watched hard-link alias is replaced by rename", () =>
    Effect.gen(function*() {
      const { owner, caller } = yield* setup
      yield* owner.makeHardLink({ entry: "/tenant/file" }, "/tenant/alias")
      yield* owner.writeFile("/tenant/source", bytes("replacement"), options)
      const stream = yield* caller.watch("/file")
      const resolved = yield* caller.watch("/file", { alias: "resolved" })
      yield* owner.rename("/tenant/source", "/tenant/file")
      yield* owner.writeFile("/tenant/alias", bytes("changed"), {})
      yield* owner.unlink("/tenant/alias")
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(stream)), [
        "Remove /file",
        "Update /alias",
        "Remove /alias"
      ])
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(resolved)), ["Remove /file"])
    }))

  it.effect("resolved watches follow the selected alias through rename and end on its unlink", () =>
    Effect.gen(function*() {
      const { owner, caller } = yield* setup
      yield* owner.makeHardLink({ entry: "/tenant/file" }, "/tenant/alias")
      const stream = yield* caller.watch("/file", { alias: "resolved" })
      yield* owner.rename("/tenant/file", "/tenant/renamed")
      yield* owner.writeFile("/tenant/alias", bytes("changed"), {})
      yield* owner.unlink("/tenant/renamed")
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(stream)), [
        "Remove /file",
        "Create /renamed",
        "Update /renamed",
        "Remove /renamed"
      ])
    }))

  it.effect("resolved watches do not select another alias when the original name is unlinked", () =>
    Effect.gen(function*() {
      const { owner, caller } = yield* setup
      yield* owner.makeHardLink({ entry: "/tenant/file" }, "/tenant/alias")
      const stream = yield* caller.watch("/file", { alias: "resolved" })
      yield* owner.unlink("/tenant/file")
      yield* owner.makeHardLink({ entry: "/tenant/alias" }, "/tenant/file")
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(stream)), ["Remove /file"])
    }))

  it.effect("ends with the last confined name when the watched object moves outside", () =>
    Effect.gen(function*() {
      const { owner, caller } = yield* setup
      const stream = yield* caller.watch("/dir")
      yield* owner.makeDirectory("/tenant/dir/child")
      yield* owner.rename("/tenant/dir", "/outside/dir")
      yield* owner.rename("/outside/dir", "/tenant/returned")
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(stream)), [
        "Create /dir/child",
        "Remove /dir"
      ])
    }))

  it.effect("drains already authorized events before root removal reports a closed resource", () =>
    Effect.gen(function*() {
      const { owner, caller } = yield* setup
      const stream = yield* caller.watch("/")
      yield* owner.makeDirectory("/tenant/queued")
      yield* owner.removeRecursive("/tenant")
      const first = yield* Stream.runCollect(Stream.take(stream, 1))
      assert.deepStrictEqual(yield* rendered(first), ["Create /queued"])
      assert.strictEqual((yield* Effect.flip(Stream.runDrain(stream)))._tag, "InvalidResource")
    }))

  it.effect("fails nested watches when their root leaves the ancestor boundary", () =>
    Effect.gen(function*() {
      const { owner, caller } = yield* setup
      const nested = yield* caller.withRoot("/dir")
      const stream = yield* nested.watch("/")
      yield* owner.rename("/tenant/dir", "/outside/dir")
      assert.strictEqual((yield* Effect.flip(Stream.runDrain(stream)))._tag, "AccessDenied")
    }))

  it.effect("bounds terminal hard-link alias removal with one Rescan", () =>
    Effect.gen(function*() {
      const { owner, caller } = yield* setup

      for (let index = 0; index < 8; index++) {
        yield* owner.makeHardLink({ entry: "/tenant/file" }, `/tenant/dir/alias-${index}`)
      }
      yield* owner.unlink("/tenant/file")
      const stream = yield* caller.watch("/dir/alias-0")
      yield* owner.removeRecursive("/tenant/dir")
      const events = yield* Stream.runCollect(stream)
      assert.strictEqual(events.length, 1)
      assert.strictEqual(events[0]!._tag, "Rescan")
      assert.strictEqual(yield* pathText(events[0]!.path), "/dir/alias-7")
    }).pipe(Effect.provideService(Limits, { watchEvents: 3 })))

  it.effect("applies recursive depth to directory children at publication", () =>
    Effect.gen(function*() {
      const { owner, caller } = yield* setup
      const recursive = yield* caller.watch("/")
      const shallow = yield* caller.watch("/", { recursive: false })
      yield* owner.makeDirectory("/tenant/direct")
      yield* owner.makeDirectory("/tenant/dir/deep")
      yield* owner.removeRecursive("/tenant/dir")
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(Stream.take(recursive, 4))), [
        "Create /direct",
        "Create /dir/deep",
        "Remove /dir/deep",
        "Remove /dir"
      ])
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(Stream.take(shallow, 2))), [
        "Create /direct",
        "Remove /dir"
      ])
    }))

  it.effect("resolved file aliases follow ancestor identity through directory renames", () =>
    Effect.gen(function*() {
      const { owner, caller } = yield* setup
      yield* owner.rename("/tenant/file", "/tenant/dir/file")
      yield* owner.makeHardLink({ entry: "/tenant/dir/file" }, "/tenant/alias")
      const stream = yield* caller.watch("/dir/file", { alias: "resolved" })
      yield* owner.rename("/tenant/dir", "/tenant/renamed")
      yield* owner.writeFile("/tenant/alias", bytes("changed"), {})
      yield* owner.unlink("/tenant/renamed/file")
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(stream)), [
        "Update /renamed/file",
        "Remove /renamed/file"
      ])
    }))

  it.effect("rejects resolved file references without a selected alias", () =>
    Effect.gen(function*() {
      const { caller } = yield* setup
      const reference = yield* caller.lookup("/file")
      assert.strictEqual((yield* Effect.flip(caller.watch(reference, { alias: "resolved" })))._tag, "InvalidInput")
    }))
})

describe("watch acquisition and publication", () => {
  it.effect("includes mutations immediately after acquisition and never replays older mutations", () =>
    Effect.gen(function*() {
      const { owner } = yield* setup
      yield* owner.makeDirectory("/before")
      const stream = yield* owner.watch("/")
      yield* owner.makeDirectory("/after")
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(Stream.take(stream, 1))), ["Create /after"])
    }))

  it.effect("publishes synchronous mutations through the same watch", () =>
    Effect.gen(function*() {
      const volume = yield* Vfs.make({ limits: { synchronous: true } })
      const caller = yield* volume.authorize({ credentials: { uid: 0, gid: 0 } })
      const stream = yield* caller.watch("/")
      const sync = yield* caller.acquireSync
      Result.getOrThrow(sync.makeDirectory("/sync"))
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(Stream.take(stream, 1))), ["Create /sync"])
    }))

  it.effect("starts watching an existing restored namespace and follows its subsequent renames", () =>
    Effect.gen(function*() {
      const original = yield* Vfs.make()
      const writer = yield* original.authorize({ credentials: { uid: 0, gid: 0 } })
      yield* writer.makeDirectory("/existing")
      yield* writer.writeFile("/existing/file", bytes("old"))
      const restored = yield* Vfs.restore(yield* original.capture())
      const caller = yield* restored.authorize({ credentials: { uid: 0, gid: 0 } })
      const stream = yield* caller.watch("/existing/file", { alias: "resolved" })
      yield* caller.rename("/existing", "/renamed")
      yield* caller.writeFile("/renamed/file", bytes("new"))
      yield* caller.unlink("/renamed/file")
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(stream)), [
        "Update /renamed/file",
        "Remove /renamed/file"
      ])
    }))

  it.effect("omits failed operations, cursor movements, and automatic access times", () =>
    Effect.gen(function*() {
      const { owner } = yield* setup
      const handle = yield* owner.open("/tenant/file", { access: "readwrite" })
      const stream = yield* owner.watch("/")
      yield* Effect.flip(owner.makeDirectory("/tenant"))
      yield* owner.readFile("/tenant/file")
      yield* handle.seek({ from: "start", offset: 0n })
      yield* owner.makeDirectory("/sentinel")
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(Stream.take(stream, 1))), ["Create /sentinel"])
    }))

  it.effect("runs consumer filesystem operations after commit delivery has finished", () =>
    Effect.gen(function*() {
      const { owner } = yield* setup
      const stream = yield* owner.watch("/")
      const consuming = yield* stream.pipe(
        Stream.take(1),
        Stream.runForEach(() => owner.makeDirectory("/from-consumer")),
        Effect.forkChild({ startImmediately: true })
      )
      yield* owner.makeDirectory("/trigger")
      yield* Fiber.join(consuming)
      assert.strictEqual((yield* owner.stat("/from-consumer")).kind, "directory")
    }))

  it.effect("resumes after the consumer drains the overflow marker", () =>
    Effect.gen(function*() {
      const { owner } = yield* setup
      const stream = yield* owner.watch("/")
      for (const name of ["a", "b", "c", "d"]) yield* owner.makeDirectory(`/${name}`)
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(Stream.take(stream, 1))), ["Create /a"])
      yield* owner.makeDirectory("/e")
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(Stream.take(stream, 2))), [
        "Create /b",
        "Rescan /"
      ])
      yield* owner.makeDirectory("/f")
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(Stream.take(stream, 1))), ["Create /f"])
    }).pipe(Effect.provideService(Limits, { watchEvents: 3 })))

  it.effect("keeps an independently scoped watch alive when its creator closes", () =>
    Effect.gen(function*() {
      const volume = yield* Vfs.make()
      const writer = yield* volume.authorize({ credentials: { uid: 0, gid: 0 } })
      const scope = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
      const creator = yield* Scope.provide(volume.authorize({ credentials: { uid: 0, gid: 0 } }), scope)
      const stream = yield* creator.watch("/")
      yield* Scope.close(scope, Exit.void)
      assert.strictEqual((yield* Effect.flip(creator.stat("/")))._tag, "InvalidResource")
      yield* writer.makeDirectory("/after-close")
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(Stream.take(stream, 1))), ["Create /after-close"])
    }))

  it.effect("closing the watch scope interrupts a blocked consumer and returns its quota", () =>
    Effect.gen(function*() {
      const { owner } = yield* setup
      const scope = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
      const stream = yield* Scope.provide(owner.watch("/"), scope)
      const consumer = yield* Stream.runDrain(stream).pipe(Effect.forkChild({ startImmediately: true }))
      yield* Scope.close(scope, Exit.void)
      assert.isTrue(Exit.isFailure(yield* Fiber.await(consumer)))
      yield* Effect.asVoid(owner.watch("/"))
    }).pipe(Effect.provideService(Limits, { watchers: 1 })))

  it.effect("does not reclaim queued watch buffers until the acquisition scope closes", () =>
    Effect.gen(function*() {
      const { owner } = yield* setup
      const stream = yield* owner.watch("/tenant/file")
      yield* owner.unlink("/tenant/file")
      const failure = yield* Effect.flip(owner.watch("/"))
      assert.strictEqual(failure._tag, "LimitExceeded")
      if (failure._tag === "LimitExceeded") assert.strictEqual(failure.domain, "watchers")
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(stream)), ["Remove /tenant/file"])
    }).pipe(Effect.provideService(Limits, { watchers: 1 })))

  it.effect("rejects a closed acquisition scope without retaining a subscription", () =>
    Effect.gen(function*() {
      const { owner } = yield* setup
      const scope = yield* Scope.make()
      yield* Scope.close(scope, Exit.void)
      assert.strictEqual((yield* Effect.flip(Scope.provide(owner.watch("/"), scope)))._tag, "InvalidResource")
      yield* Effect.asVoid(owner.watch("/"))
    }).pipe(Effect.provideService(Limits, { watchers: 1 })))

  it.effect("requires read permission at acquisition and retains the grant across chmod", () =>
    Effect.gen(function*() {
      const volume = yield* Vfs.make()
      const writer = yield* volume.authorize({ credentials: { uid: 0, gid: 0, privileged: true } })
      const reader = yield* volume.authorize({ credentials: { uid: 1, gid: 1 } })
      yield* writer.writeFile("/file", bytes("old"), { mode: 0o600 })
      assert.strictEqual((yield* Effect.flip(reader.watch("/file")))._tag, "AccessDenied")
      yield* writer.setAttributes("/file", { mode: 0o644 })
      const stream = yield* reader.watch("/file")
      yield* writer.setAttributes("/file", { mode: 0o600 })
      yield* writer.writeFile("/file", bytes("new"))
      yield* writer.unlink("/file")
      assert.deepStrictEqual((yield* Stream.runCollect(stream)).map((event) => event._tag), [
        "Update",
        "Update",
        "Remove"
      ])
    }))

  it.effect("preserves non-UTF-8 names in event paths", () =>
    Effect.gen(function*() {
      const { owner } = yield* setup
      const stream = yield* owner.watch("/")
      const path = Result.getOrThrow(BytePath.fromBytes(new Uint8Array([47, 255])))
      yield* owner.writeFile(path, bytes("value"))
      const events = yield* Stream.runCollect(Stream.take(stream, 1))
      assert.deepStrictEqual(BytePath.toBytes(events[0].path), new Uint8Array([47, 255]))
    }))

  it.effect("rebuilds namespace selection after the last subscription closes", () =>
    Effect.gen(function*() {
      const { owner } = yield* setup
      const scope = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
      yield* Effect.asVoid(Scope.provide(owner.watch("/tenant/file"), scope))
      yield* Scope.close(scope, Exit.void)
      yield* owner.rename("/tenant", "/moved")
      const stream = yield* owner.watch("/moved/file")
      yield* owner.writeFile("/moved/file", bytes("new"))
      yield* owner.unlink("/moved/file")
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(stream)), [
        "Update /moved/file",
        "Remove /moved/file"
      ])
    }))
})

const holdingPublication = Effect.gen(function*() {
  const volume = yield* Vfs.make({ limits: { watchers: 1, operations: 3 } })
  const caller = yield* volume.authorize({ credentials: { uid: 0, gid: 0 } })
  const entered = yield* Deferred.make<void>()
  const release = yield* Deferred.make<void>()
  yield* installStorage(
    volume,
    () => Deferred.succeed(entered, undefined).pipe(Effect.andThen(Deferred.await(release))),
    () => false
  )
  yield* Effect.addFinalizer(() => Deferred.succeed(release, undefined))
  const writing = yield* caller.makeDirectory("/holding").pipe(Effect.forkChild({ startImmediately: true }))
  yield* Deferred.await(entered)
  return { volume, caller, release, writing }
})

describe("watch registration under contention", () => {
  it.effect("installs the subscription before a mutation queued after registration", () =>
    Effect.gen(function*() {
      const { caller, release, writing } = yield* holdingPublication
      const registering = yield* caller.watch("/").pipe(Effect.forkChild({ startImmediately: true }))
      const mutation = yield* caller.makeDirectory("/after-registration").pipe(
        Effect.forkChild({ startImmediately: true })
      )
      yield* Deferred.succeed(release, undefined)
      const stream = yield* Fiber.join(registering)
      yield* Fiber.join(writing)
      yield* Fiber.join(mutation)
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(Stream.take(stream, 1))), [
        "Create /after-registration"
      ])
    }))

  it.effect("interruption releases a pending subscription without waiting for the writer", () =>
    Effect.gen(function*() {
      const { volume, caller, release, writing } = yield* holdingPublication
      const registering = yield* caller.watch("/").pipe(Effect.forkChild({ startImmediately: true }))
      assert.strictEqual((yield* volume.usage).watchers, 1)
      yield* Fiber.interrupt(registering)
      assert.strictEqual((yield* volume.usage).watchers, 0)
      yield* Deferred.succeed(release, undefined)
      yield* Fiber.join(writing)
      yield* Effect.asVoid(caller.watch("/"))
    }))

  it.effect("scope closure cancels queued registration and returns its subscription quota", () =>
    Effect.gen(function*() {
      const { volume, caller, release, writing } = yield* holdingPublication
      const scope = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
      const registering = yield* Scope.provide(caller.watch("/"), scope).pipe(
        Effect.forkChild({ startImmediately: true })
      )
      assert.strictEqual((yield* volume.usage).watchers, 1)
      yield* Scope.close(scope, Exit.void)
      const error = yield* Effect.flip(Fiber.join(registering))
      assert.strictEqual(error._tag, "InvalidResource")
      assert.strictEqual((yield* volume.usage).watchers, 0)
      yield* Deferred.succeed(release, undefined)
      yield* Fiber.join(writing)
      yield* Effect.asVoid(caller.watch("/"))
    }))
})

describe("watch limits and terminal delivery", () => {
  it.effect("failed target validation returns the subscription quota", () =>
    Effect.gen(function*() {
      const { owner } = yield* setup
      assert.strictEqual((yield* Effect.flip(owner.watch("/missing")))._tag, "NotFound")
      const reference = yield* owner.lookup("/tenant/file")
      assert.strictEqual((yield* Effect.flip(owner.watch(reference, { alias: "resolved" })))._tag, "InvalidInput")
      yield* Effect.asVoid(owner.watch(reference))
    }).pipe(Effect.provideService(Limits, { watchers: 1 })))

  it.effect("watch registration honors namespace visit limits without leaving a listener", () =>
    Effect.gen(function*() {
      const volume = yield* Vfs.make({ limits: { namespaceVisits: 4 } })
      const caller = yield* volume.authorize({ credentials: { uid: 0, gid: 0 } })
      for (const name of ["a", "b", "c", "d"]) yield* caller.createFile(`/${name}`)
      const failure = yield* Effect.flip(caller.watch("/"))
      assert.strictEqual(failure._tag, "LimitExceeded")
      if (failure._tag === "LimitExceeded") assert.strictEqual(failure.domain, "visits")
      assert.strictEqual((yield* volume.usage).watchers, 0)
      yield* caller.createFile("/after")
    }))

  it.effect("closing an ended subscription cannot detach a newer subscription", () =>
    Effect.gen(function*() {
      const { owner } = yield* setup
      const scope = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
      const ended = yield* Scope.provide(owner.watch("/tenant/file"), scope)
      yield* owner.unlink("/tenant/file")
      const active = yield* owner.watch("/")
      yield* Scope.close(scope, Exit.void)
      assert.deepStrictEqual(yield* Stream.runCollect(ended), [])
      yield* owner.makeDirectory("/still-active")
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(Stream.take(active, 1))), [
        "Create /still-active"
      ])
    }))

  it.effect("does not publish a rename between two hard links to the same object", () =>
    Effect.gen(function*() {
      const { owner } = yield* setup
      yield* owner.makeHardLink({ entry: "/tenant/file" }, "/tenant/alias")
      const stream = yield* owner.watch("/")
      yield* owner.rename("/tenant/file", "/tenant/alias")
      yield* owner.makeDirectory("/sentinel")
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(Stream.take(stream, 1))), ["Create /sentinel"])
    }))

  it.effect("ends a watched destination when another object replaces its binding", () =>
    Effect.gen(function*() {
      const { owner } = yield* setup
      yield* owner.writeFile("/source", bytes("new"))
      const stream = yield* owner.watch("/tenant/file", { alias: "resolved" })
      yield* owner.rename("/source", "/tenant/file")
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(stream)), ["Remove /tenant/file"])
    }))

  it.effect("reports cross-boundary moves as removal and creation", () =>
    Effect.gen(function*() {
      const { owner } = yield* setup
      yield* owner.makeDirectory("/inside")
      yield* owner.makeDirectory("/inside/leaving")
      yield* owner.writeFile("/arriving", bytes("new"))
      const stream = yield* owner.watch("/inside")
      yield* owner.rename("/inside/leaving", "/outside/leaving")
      yield* owner.rename("/arriving", "/inside/arriving")
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(Stream.take(stream, 2))), [
        "Remove /inside/leaving",
        "Create /inside/arriving"
      ])
    }))

  it.effect("ignores updates through an orphaned handle", () =>
    Effect.gen(function*() {
      const { owner } = yield* setup
      const handle = yield* owner.open("/tenant/file", { access: "readwrite" })
      yield* owner.unlink("/tenant/file")
      const stream = yield* owner.watch("/")
      yield* handle.write(bytes("orphan"))
      yield* owner.makeDirectory("/sentinel")
      assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(Stream.take(stream, 1))), ["Create /sentinel"])
    }))
})

it.effect("does not notify watchers about a storage-rejected mutation", () =>
  Effect.gen(function*() {
    const volume = yield* Vfs.make()
    const caller = yield* volume.authorize({ credentials: { uid: 0, gid: 0 } })
    let reject = true
    yield* installStorage(volume, () =>
      Effect.suspend(() => reject ? Effect.die("rejected storage") : Effect.void), () =>
      false)
    const stream = yield* caller.watch("/")
    assert.isTrue(Exit.isFailure(yield* Effect.exit(caller.makeDirectory("/rejected"))))
    reject = false
    yield* caller.makeDirectory("/accepted")
    assert.deepStrictEqual(yield* rendered(yield* Stream.runCollect(Stream.take(stream, 1))), ["Create /accepted"])
  }))

it.effect("rejects zero event capacity and supports disabling subscriptions", () =>
  Effect.gen(function*() {
    assert.strictEqual((yield* Effect.flip(Vfs.make({ limits: { watchEvents: 0 } })))._tag, "InvalidInput")
    const volume = yield* Vfs.make({ limits: { watchers: 0 } })
    const caller = yield* volume.authorize({ credentials: { uid: 0, gid: 0 } })
    const failure = yield* Effect.flip(caller.watch("/"))
    assert.strictEqual(failure._tag, "LimitExceeded")
    if (failure._tag === "LimitExceeded") assert.strictEqual(failure.domain, "watchers")
    assert.strictEqual((yield* volume.usage).watchers, 0)
  }))
