import { assert, describe, it } from "@effect/vitest"
import { Cause, Deferred, Effect, Equal, Exit, Fiber, Hash, Latch, Layer, Option, Schema, Scope } from "effect"
import type { Duration } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { TestClock, TestLoader } from "effect/testing"

const User = Schema.Struct({ id: Schema.String, name: Schema.String })
type User = typeof User.Type

// A few macrotasks: lets every fiber the cache forked run, and whatever those fork in turn.
const flush = Effect.promise(async () => {
  for (let i = 0; i < 4; i++) await new Promise<void>((resolve) => setTimeout(resolve, 0))
})
const advance = (duration: Duration.Input) =>
  flush.pipe(Effect.andThen(TestClock.adjust(duration)), Effect.andThen(flush))

const show = (result: AsyncResult.AsyncResult<unknown, unknown>, patched = false): string =>
  (AsyncResult.isSuccess(result)
    ? typeof result.value === "object" && result.value !== null ? (result.value as User).name : String(result.value)
    : AsyncResult.isFailure(result)
    ? "Failure(" + Option.getOrElse(Cause.findErrorOption(result.cause), () => "?") + ")"
    : "Initial") + (result.waiting ? " waiting" : "") + (patched ? " patched" : "")

// A read whose fetcher takes 10 ms and returns what the server holds.
const makeUsers = (staleTime: Duration.Input = "30 seconds") => {
  const db = { calls: 0, name: "Ann", fail: false }
  class GetUser extends Loader.Service<GetUser>()(
    "users/GetUser",
    {
      args: { id: Schema.String },
      success: User,
      error: Schema.String,
      staleTime
    },
    Effect.sync(() => ({ id }) =>
      Effect.gen(function*() {
        db.calls++
        yield* Effect.sleep(10)
        if (db.fail) return yield* Effect.fail("nope")
        return { id, name: db.name }
      })
    )
  ) {}
  return { db, GetUser, provide: Effect.provide(Layer.merge(GetUser.layer, TestLoader.layer())) }
}

const makeCount = (staleTime: Duration.Input = "30 seconds") => {
  const db = { calls: 0, count: 0 }
  class GetCount extends Loader.Service<GetCount>()(
    "counts/GetCount",
    {
      args: { id: Schema.String },
      success: Schema.Number,
      error: Schema.Never,
      staleTime
    },
    Effect.sync(() => () =>
      Effect.gen(function*() {
        db.calls++
        yield* Effect.sleep(10)
        return db.count
      })
    )
  ) {}
  return { db, GetCount, provide: Effect.provide(Layer.merge(GetCount.layer, TestLoader.layer())) }
}

// Watches the patched view, as a loader field does, and records what it emits.
const watchPatched = Effect.fnUntraced(function*<R extends Loader.Read.Any>(read: R, args: Loader.Read.Args<R>) {
  const cache = Loader.internals(yield* Loader.Cache)
  const fetcher = yield* (read as any) as Effect.Effect<(args: any) => Effect.Effect<any, any>>
  const seen: Array<string> = []
  const handle = cache.watch(
    Loader.defOf(read),
    args,
    fetcher,
    (result, patched) => seen.push(show(result, patched)),
    undefined,
    { patched: true }
  )
  const current = handle.patchedView()
  if (current.result._tag !== "Initial") seen.push(show(current.result, current.patched))
  yield* Effect.addFinalizer(() => Effect.sync(handle.unregister))
  yield* flush
  return { seen, stop: Effect.sync(handle.unregister) }
})

interface RunOptions {
  readonly command?: string
  readonly invalidates?: ReadonlyArray<Loader.Target>
  readonly optimistic?: ReadonlyArray<Loader.Patch>
}

// Issues a run, as the effect/ui runtime does: its patches register now, and `start` runs the body in it.
const issue = Effect.fnUntraced(function*(options: RunOptions) {
  const cache = Loader.internals(yield* Loader.Cache)
  const handle = cache.beginRun({
    command: options.command ?? "Save",
    invalidates: (options.invalidates ?? []) as ReadonlyArray<Loader.Target>,
    optimistic: options.optimistic as ReadonlyArray<Loader.Patch> | undefined
  })
  return {
    handle,
    start: <A, E, R>(body: Effect.Effect<A, E, R>, writes?: (success: A) => ReadonlyArray<Loader.Write>) =>
      Effect.forkScoped(handle.run(body, writes as ((success: A) => ReadonlyArray<Loader.Write>) | undefined))
  }
})

const run = <A, E, R>(
  options: RunOptions,
  body: Effect.Effect<A, E, R>,
  writes?: (success: A) => ReadonlyArray<Loader.Write>
) => Effect.flatMap(issue(options), (issued) => issued.start(body, writes))

const fetchLog = Effect.map(
  TestLoader.fetches,
  (fetches) =>
    fetches.map((fetch) => fetch.trigger + (fetch.restart ? " restart" : "") + (fetch.stored ? "" : " unstored"))
)

describe("Loader runs", () => {
  describe("pure helpers", () => {
    const { GetUser } = makeUsers()
    const { GetCount } = makeCount()
    const Tagged = Loader.Tag("tagged")
    class GetTagged extends Loader.Service<GetTagged>()("tagged/GetTagged", {
      args: {},
      success: Schema.Number,
      error: Schema.Never,
      staleTime: 0,
      tags: [Tagged]
    }, Effect.succeed(() => Effect.succeed(0))) {}

    it("applyPatches applies, in issue order, the patches of one entry", () => {
      const patches = [
        GetCount.patch({ id: "a" }, (n) => n + 1),
        GetCount.patchAll((n, { id }) => id === "a" ? n * 10 : n),
        GetCount.patch({ id: "b" }, () => -1),
        GetUser.patch({ id: "a" }, (user) => ({ ...user, name: "Bob" }))
      ]
      assert.strictEqual(Loader.applyPatches(patches, GetCount, { id: "a" }, 1), 20)
      assert.strictEqual(Loader.applyPatches(patches, GetCount, { id: "b" }, 1), -1)
      assert.strictEqual(Loader.applyPatches(patches, GetCount, { id: "c" }, 1), 1)
    })

    it("invalidatesEntry counts declared targets and those implied by patches", () => {
      const one = { invalidates: [GetUser.entry({ id: "1" })] }
      assert.isTrue(Loader.invalidatesEntry(one, GetUser, { id: "1" }))
      assert.isFalse(Loader.invalidatesEntry(one, GetUser, { id: "2" }))
      assert.isTrue(Loader.invalidatesEntry({ invalidates: [GetUser] }, GetUser, { id: "2" }))
      assert.isTrue(Loader.invalidatesEntry({ invalidates: [Tagged] }, GetTagged, {}))
      assert.isFalse(Loader.invalidatesEntry({ invalidates: [Tagged] }, GetUser, { id: "1" }))
      // A patch implies its entry; a patchAll the whole read.
      const patched = { invalidates: [], optimistic: [GetCount.patch({ id: "a" }, (n) => n)] }
      assert.isTrue(Loader.invalidatesEntry(patched, GetCount, { id: "a" }))
      assert.isFalse(Loader.invalidatesEntry(patched, GetCount, { id: "b" }))
      const all = { invalidates: [], optimistic: [GetCount.patchAll((n) => n)] }
      assert.isTrue(Loader.invalidatesEntry(all, GetCount, { id: "z" }))
    })

    it("a target's args that don't encode throw where the target is made", () => {
      assert.throws(() => GetUser.entry({ id: 1 } as any))
      assert.throws(() => GetUser.patch({ id: 1 } as any, (user) => user))
      assert.throws(() => GetUser.set({ id: 1 } as any, { id: "1", name: "Ann" }))
    })
  })

  describe("get inside a run", () => {
    // Never only at staleTime 0: the entry is fresh, so a plain get would serve the old name.
    for (const optimistic of [true, false]) {
      it.effect(
        "a run reading back its own target gets the server's answer" + (optimistic ? ", with a patch" : ""),
        () => {
          const { GetUser, db, provide } = makeUsers("30 seconds")
          return Effect.gen(function*() {
            const watcher = yield* watchPatched(GetUser, { id: "1" })
            yield* advance(10)
            assert.deepStrictEqual(watcher.seen, ["Ann"])

            const fiber = yield* run(
              {
                invalidates: [GetUser.entry({ id: "1" })],
                optimistic: optimistic ? [GetUser.patch({ id: "1" }, (user) => ({ ...user, name: "Bob" }))] : []
              },
              Effect.gen(function*() {
                yield* Effect.sleep(5)
                db.name = "Bob"
                return yield* GetUser.get({ id: "1" })
              }),
              (user) => [GetUser.set({ id: "1" }, user)]
            )
            yield* advance(20)
            assert.deepStrictEqual(yield* Fiber.join(fiber), { id: "1", name: "Bob" })
            // The read-back is a plain fetcher call, never stored. The fresh write skips the run's own refetch.
            assert.deepStrictEqual(yield* fetchLog, ["watch", "get unstored"])
            assert.deepStrictEqual(
              watcher.seen,
              optimistic ? ["Ann", "Bob patched", "Bob"] : ["Ann", "Bob"]
            )
            yield* advance(50)
            assert.strictEqual(db.calls, 2)
            const entry = yield* TestLoader.entry(GetUser, { id: "1" })
            assert.isFalse(entry?.stale)
            assert.deepStrictEqual(entry?.patches, { live: 0, held: 0 })
          }).pipe(provide)
        }
      )
    }

    it.effect("a typed failure of the read-back lands in the body, and a get outside the run is unaffected", () => {
      const { GetUser, db, provide } = makeUsers()
      return Effect.gen(function*() {
        yield* GetUser.get({ id: "1" }).pipe(Effect.forkScoped)
        yield* advance(10)
        db.fail = true
        const fiber = yield* run({ invalidates: [GetUser] }, Effect.flip(GetUser.get({ id: "1" })))
        // Not the run's target: served from the store.
        const other = yield* run({ invalidates: [] }, GetUser.get({ id: "1" }))
        yield* advance(10)
        assert.strictEqual(yield* Fiber.join(fiber), "nope")
        assert.deepStrictEqual(yield* Fiber.join(other), { id: "1", name: "Ann" })
        assert.deepStrictEqual(yield* fetchLog, ["get", "get unstored"])
        // The failed run invalidated the read: the unwatched entry is stale, and nothing fetched it.
        assert.isTrue((yield* TestLoader.entry(GetUser, { id: "1" }))?.stale)
      }).pipe(provide)
    })
  })

  describe("patches", () => {
    it.effect("two queued saves: one refetch confirms after the last run exits", () => {
      const { GetCount, db, provide } = makeCount()
      return Effect.gen(function*() {
        const watcher = yield* watchPatched(GetCount, { id: "a" })
        yield* advance(10)
        const like = (n: number) => GetCount.patch({ id: "a" }, (count) => count + n)
        const save = Effect.sleep(10).pipe(Effect.andThen(Effect.sync(() => db.count++)))
        const first = yield* issue({ optimistic: [like(1)] })
        // Queued: its patch is live before it starts.
        const second = yield* issue({ optimistic: [like(1)] })
        assert.deepStrictEqual(watcher.seen, ["0", "1 patched", "2 patched"])
        const firstFiber = yield* first.start(save)
        yield* advance(10)
        yield* Fiber.join(firstFiber)
        // The first is held, the second still live: its refetch waits.
        assert.deepStrictEqual(
          { ...(yield* TestLoader.entry(GetCount, { id: "a" })), stored: undefined, view: undefined },
          {
            stored: undefined,
            view: undefined,
            patched: true,
            stale: true,
            watchers: 1,
            fetch: "held",
            trigger: "invalidation",
            patches: { live: 1, held: 1 }
          }
        )
        const secondFiber = yield* second.start(save)
        yield* advance(10)
        yield* Fiber.join(secondFiber)
        yield* advance(10)
        assert.deepStrictEqual(watcher.seen, ["0", "1 patched", "2 patched", "2 waiting patched", "2"])
        assert.deepStrictEqual(yield* fetchLog, ["watch", "invalidation"])
      }).pipe(provide)
    })

    it.effect("count + 1 across a visibility edge: the edge waits for the run, so nothing double-counts", () => {
      const { GetCount, db, provide } = makeCount(0)
      return Effect.gen(function*() {
        const watcher = yield* watchPatched(GetCount, { id: "a" })
        yield* advance(10)
        const fiber = yield* run(
          { optimistic: [GetCount.patch({ id: "a" }, (count) => count + 1)] },
          Effect.sleep(50).pipe(Effect.andThen(Effect.sync(() => db.count++)))
        )
        yield* advance(20)
        yield* TestLoader.setVisible(false)
        yield* TestLoader.setVisible(true)
        yield* advance(5)
        // Deferred, not fetched: a refetch landing now would show 2.
        assert.strictEqual((yield* TestLoader.entry(GetCount, { id: "a" }))?.fetch, "held")
        yield* advance(30)
        yield* Fiber.join(fiber)
        yield* advance(10)
        assert.deepStrictEqual(watcher.seen, ["0", "1 patched", "1 waiting patched", "1"])
        // The deferred refetch keeps the first trigger.
        assert.deepStrictEqual(yield* fetchLog, ["watch", "visibility"])
      }).pipe(provide)
    })

    it.effect("two concurrent renames answered out of order", () =>
      Effect.forEach([true, false], (optimistic) => {
        const { GetUser, db, provide } = makeUsers()
        const rename = (name: string, serverAt: number, answerAt: number) =>
          run(
            {
              invalidates: [GetUser.entry({ id: "1" })],
              optimistic: optimistic ? [GetUser.patch({ id: "1" }, (user) => ({ ...user, name }))] : []
            },
            Effect.gen(function*() {
              yield* Effect.sleep(serverAt)
              db.name = name
              yield* Effect.sleep(answerAt - serverAt)
              return { id: "1", name }
            }),
            (user) => [GetUser.set({ id: "1" }, user)]
          )
        return Effect.gen(function*() {
          const watcher = yield* watchPatched(GetUser, { id: "1" })
          yield* advance(10)
          // The server applies B1 then B2, and answers B2 first.
          const first = yield* rename("B1", 5, 30)
          const second = yield* rename("B2", 8, 10)
          yield* advance(10)
          yield* Fiber.join(second)
          yield* advance(20)
          yield* Fiber.join(first)
          yield* advance(10)
          // The older answer is never stored, and one refetch confirms.
          assert.deepStrictEqual(
            watcher.seen,
            optimistic
              ? ["Ann", "B1 patched", "B2 patched", "B2 waiting patched", "B2"]
              : ["Ann", "B2", "B2 waiting", "B2"]
          )
          assert.deepStrictEqual(yield* fetchLog, ["watch", "invalidation"])
        }).pipe(provide)
      }))

    it.effect("a newer run that fails still keeps an older answer from being stored", () => {
      const { GetUser, db, provide } = makeUsers()
      const rename = (name: string, serverAt: number, answerAt: number, fails: boolean) =>
        run(
          { invalidates: [GetUser.entry({ id: "1" })] },
          Effect.gen(function*() {
            yield* Effect.sleep(serverAt)
            db.name = name
            yield* Effect.sleep(answerAt - serverAt)
            // The server landed the write; only the answer is lost.
            if (fails) return yield* Effect.fail("lost")
            return { id: "1", name }
          }),
          (user) => [GetUser.set({ id: "1" }, user)]
        )
      return Effect.gen(function*() {
        const watcher = yield* watchPatched(GetUser, { id: "1" })
        yield* advance(10)
        // The server applies B1 then B2. B2's run fails first, and B1 answers last.
        const first = yield* rename("B1", 5, 30, false)
        const second = yield* rename("B2", 8, 10, true)
        yield* advance(10)
        assert.isTrue(Exit.isFailure(yield* Fiber.await(second)))
        yield* advance(20)
        yield* Fiber.join(first)
        yield* advance(10)
        assert.deepStrictEqual(watcher.seen, ["Ann", "Ann waiting", "B2", "B2 waiting", "B2"])
        assert.deepStrictEqual(yield* fetchLog, ["watch", "invalidation", "invalidation"])
      }).pipe(provide)
    })

    it.effect("a failed run drops its patch at once; a successful one holds it until a settle", () => {
      const { GetUser, provide } = makeUsers()
      return Effect.gen(function*() {
        const watcher = yield* watchPatched(GetUser, { id: "1" })
        yield* advance(10)
        const bob = GetUser.patch({ id: "1" }, (user) => ({ ...user, name: "Bob" }))
        const failed = yield* run({ optimistic: [bob] }, Effect.sleep(5).pipe(Effect.andThen(Effect.fail("no"))))
        yield* advance(5)
        assert.isTrue(Exit.isFailure(yield* Fiber.await(failed)))
        yield* advance(10)
        // The failure drops the patch and invalidates its entry in one step.
        assert.deepStrictEqual(watcher.seen, ["Ann", "Bob patched", "Ann waiting", "Ann"])

        yield* Fiber.join(yield* run({ optimistic: [bob] }, Effect.void))
        assert.deepStrictEqual((yield* TestLoader.entry(GetUser, { id: "1" }))?.patches, { live: 0, held: 1 })
        yield* advance(10)
        assert.deepStrictEqual((yield* TestLoader.entry(GetUser, { id: "1" }))?.patches, { live: 0, held: 0 })
        assert.deepStrictEqual(watcher.seen.slice(4), ["Bob patched", "Bob waiting patched", "Ann"])
      }).pipe(provide)
    })

    it.effect("a run stopped before it began drops its patches and invalidates nothing", () => {
      const { GetUser, provide } = makeUsers()
      return Effect.gen(function*() {
        const watcher = yield* watchPatched(GetUser, { id: "1" })
        yield* advance(10)
        const { handle } = yield* issue({
          optimistic: [GetUser.patch({ id: "1" }, (user) => ({ ...user, name: "Bob" }))]
        })
        handle.finish({ _tag: "Stopped" })
        yield* advance(10)
        assert.deepStrictEqual(watcher.seen, ["Ann", "Bob patched", "Ann"])
        assert.deepStrictEqual(yield* fetchLog, ["watch"])
      }).pipe(provide)
    })

    it.effect("a patch held after success doesn't keep an unwatched entry alive", () => {
      const { GetUser, provide } = makeUsers()
      return Effect.gen(function*() {
        yield* GetUser.get({ id: "1" }).pipe(Effect.forkScoped)
        yield* advance(10)
        yield* Fiber.join(
          yield* run({ optimistic: [GetUser.patch({ id: "1" }, (user) => ({ ...user, name: "Bob" }))] }, Effect.void)
        )
        const entry = yield* TestLoader.entry(GetUser, { id: "1" })
        assert.deepStrictEqual([entry?.view._tag === "Success" && entry.view.value.name, entry?.patched], ["Bob", true])
        yield* advance("5 minutes")
        assert.isUndefined(yield* TestLoader.entry(GetUser, { id: "1" }))
      }).pipe(provide)
    })

    it.effect("first application is all-or-nothing; a patch only registers over a Success", () => {
      const { GetCount, provide } = makeCount()
      return Effect.gen(function*() {
        yield* GetCount.get({ id: "a" }).pipe(Effect.forkScoped)
        yield* GetCount.get({ id: "b" }).pipe(Effect.forkScoped)
        yield* advance(10)
        const exit = yield* Effect.exit(issue({
          optimistic: [
            GetCount.patch({ id: "a" }, (n) => n + 1),
            GetCount.patch({ id: "b" }, () => {
              throw new Error("boom")
            })
          ]
        }))
        assert.isTrue(Exit.hasDies(exit))
        assert.deepStrictEqual((yield* TestLoader.entry(GetCount, { id: "a" }))?.patches, { live: 0, held: 0 })
        // A cold entry, and an entry created after a patchAll was issued, hold no patch.
        yield* issue({ optimistic: [GetCount.patch({ id: "c" }, (n) => n + 1), GetCount.patchAll((n) => n + 1)] })
        assert.isUndefined(yield* TestLoader.entry(GetCount, { id: "c" }))
        assert.deepStrictEqual((yield* TestLoader.entry(GetCount, { id: "b" }))?.patches, { live: 1, held: 0 })
        const d = yield* GetCount.get({ id: "d" }).pipe(Effect.forkScoped)
        yield* advance(10)
        assert.strictEqual(yield* Fiber.join(d), 0)
        assert.deepStrictEqual((yield* TestLoader.entry(GetCount, { id: "d" }))?.patched, false)
      }).pipe(provide)
    })

    it.effect("PatchInvalid and PatchMutated are reported, and the patch is used as is", () => {
      const { GetUser, provide } = makeUsers()
      return Effect.gen(function*() {
        yield* GetUser.get({ id: "1" }).pipe(Effect.forkScoped)
        yield* GetUser.get({ id: "2" }).pipe(Effect.forkScoped)
        yield* advance(10)
        yield* issue({
          command: "Rename",
          optimistic: [
            GetUser.patch({ id: "1" }, (user) => ({ ...user, name: 42 as unknown as string })),
            GetUser.patch({ id: "2" }, (user) => {
              ;(user as { name: string }).name = "Mutated"
              return user
            })
          ]
        })
        const [invalid] = yield* TestLoader.expectProblem("PatchInvalid")
        assert.deepStrictEqual([invalid.read, invalid.logKey, invalid.command], [
          "users/GetUser",
          `{"id":"1"}`,
          "Rename"
        ])
        const [mutated] = yield* TestLoader.expectProblem("PatchMutated")
        assert.strictEqual(mutated.logKey, `{"id":"2"}`)
        const entry = yield* TestLoader.entry(GetUser, { id: "1" })
        assert.strictEqual(entry?.view._tag === "Success" && entry.view.value.name, 42 as unknown as string)
      }).pipe(provide)
    })
    it.effect("PatchMutated compares snapshots of the encodings with Equal.equals, through a value the codec passes through as is", () => {
      const payloads: Record<string, Record<string, unknown>> = {
        aliased: { count: 1 },
        zero: { n: 0 },
        undefinedKey: { count: 1 },
        nan: { bad: NaN, count: 1 }
      }
      class GetDoc extends Loader.Service<GetDoc>()(
        "docs/GetDoc",
        {
          args: { id: Schema.String },
          success: Schema.Struct({ payload: Schema.Any }),
          error: Schema.Never,
          staleTime: "30 seconds"
        },
        Effect.sync(() => ({ id }) => Effect.sync(() => ({ payload: payloads[id] })))
      ) {}
      const inPlace = (id: string, mutate: (payload: Record<string, unknown>) => void) =>
        GetDoc.patch({ id }, (doc) => {
          mutate(doc.payload as Record<string, unknown>)
          return { ...doc }
        })
      return Effect.gen(function*() {
        for (const id of Object.keys(payloads)) yield* GetDoc.get({ id })
        yield* issue({
          optimistic: [
            // Under Schema.Any the encoding is the payload itself.
            inPlace("aliased", (payload) => {
              ;(payload.count as number)++
            }),
            // Equal.equals sees 0 and -0 as equal.
            inPlace("zero", (payload) => {
              payload.n = -0
            }),
            // It sees an own property set to undefined.
            inPlace("undefinedKey", (payload) => {
              payload.extra = undefined
            }),
            // A NaN beside the mutated field doesn't skip the check.
            inPlace("nan", (payload) => {
              ;(payload.count as number)++
            })
          ]
        })
        const mutated = yield* TestLoader.expectProblem("PatchMutated")
        assert.deepStrictEqual(mutated.map((problem) => problem.logKey), [
          `{"id":"aliased"}`,
          `{"id":"undefinedKey"}`,
          `{"id":"nan"}`
        ])
      }).pipe(Effect.provide(Layer.merge(GetDoc.layer, TestLoader.layer())))
    })
    it.effect("PatchMutated compares own data properties run after run, and runs none of the value's own code", () => {
      class Counter {
        constructor(public n: number) {}
      }
      // State only a getter reaches: outside the check.
      const store = new WeakMap<object, number>()
      class Stored {
        constructor(n: number) {
          store.set(this, n)
        }
        get n() {
          return store.get(this)
        }
      }
      const external = { count: 0 }
      // A Hash method that can't run on a snapshot, and isn't used.
      class Hashed {
        #secret = 0
        count = 0
        get secret() {
          return this.#secret
        }
        [Hash.symbol]() {
          return this.#secret
        }
      }
      // An Equal value is held by reference: it answers for its own equality.
      class Box implements Equal.Equal {
        constructor(public n: number) {}
        [Equal.symbol](that: Equal.Equal) {
          return that instanceof Box
        }
        [Hash.symbol]() {
          return 0
        }
      }
      const throwing = () =>
        Object.defineProperty({ n: 0 }, "hidden", {
          get() {
            throw new Error("getter")
          }
        })
      const values: Record<string, unknown> = {
        plain: { n: 0 },
        counter: new Counter(0),
        hashed: new Hashed(),
        ownHash: {
          count: 0,
          [Hash.symbol]() {
            throw new Error("hash")
          }
        },
        hidden: throwing(),
        hiddenInArray: [0, throwing()],
        besideEqual: { box: new Box(0), n: 0 },
        insideEqual: { box: new Box(0), n: 0 },
        stored: new Stored(0),
        external: Object.defineProperty({}, "payload", { get: () => external, enumerable: true })
      }
      class GetAny extends Loader.Service<GetAny>()(
        "any/GetAny",
        { args: { id: Schema.String }, success: Schema.Any, error: Schema.Never, staleTime: "30 seconds" },
        Effect.sync(() => ({ id }) => Effect.sync(() => values[id]))
      ) {}
      const inPlace = (id: string, mutate: (value: any) => void) =>
        GetAny.patch({ id }, (value) => {
          mutate(value)
          return value
        })
      const mutating = [
        inPlace("plain", (value) => value.n++),
        inPlace("counter", (value: Counter) => value.n++),
        inPlace("hashed", (value: Hashed) => value.count++),
        inPlace("ownHash", (value) => value.count++),
        // The throwing getter is never read, and the data beside it is compared.
        inPlace("hidden", (value) => value.n++),
        inPlace("hiddenInArray", (value) => value[1].n++),
        inPlace("besideEqual", (value) => value.n++),
        // Not reported: the rest of the entry is unchanged.
        inPlace("insideEqual", (value) => value.box.n++),
        inPlace("stored", (value) => store.set(value, store.get(value)! + 1)),
        inPlace("external", (value) => value.payload.count++)
      ]
      const reported = ["plain", "counter", "hashed", "ownHash", "hidden", "hiddenInArray", "besideEqual"].map((id) =>
        `{"id":"${id}"}`
      )
      return Effect.gen(function*() {
        for (const id of Object.keys(values)) yield* GetAny.get({ id })
        // The first run is stopped: its patches go, and the server values keep the mutation.
        const { handle } = yield* issue({ optimistic: mutating })
        const first = yield* TestLoader.expectProblem("PatchMutated")
        assert.deepStrictEqual(first.map((problem) => problem.logKey), reported)
        handle.finish({ _tag: "Stopped" })
        // The same patches on the same stored values are reported again.
        yield* issue({ optimistic: mutating })
        const second = yield* TestLoader.expectProblem("PatchMutated")
        assert.deepStrictEqual(second.map((problem) => problem.logKey), reported)
        // The getter never stopped a run: the patch registered.
        const hidden = yield* TestLoader.entry(GetAny, { id: "hidden" })
        assert.isTrue(hidden?.patched)
      }).pipe(Effect.provide(Layer.merge(GetAny.layer, TestLoader.layer())))
    })
    it.effect("PatchMutated never reads a getter, so a patch that changes nothing is never reported", () => {
      let computed = 0
      class Lazy {
        memo: number | undefined = undefined
        get total() {
          return this.memo ??= ++computed
        }
      }
      const values: Record<string, unknown> = {
        memo: new Lazy(),
        closure: Object.defineProperty({ n: 0 }, "f", { get: () => () => 0, enumerable: true }),
        time: Object.defineProperty({ n: 0 }, "now", { get: () => Math.random(), enumerable: true }),
        // Reading a getter that memoizes into the value's own data changes the stored value.
        memoRead: new Lazy()
      }
      class GetAny extends Loader.Service<GetAny>()(
        "any/GetAny",
        { args: { id: Schema.String }, success: Schema.Any, error: Schema.Never, staleTime: "30 seconds" },
        Effect.sync(() => ({ id }) => Effect.sync(() => values[id]))
      ) {}
      return Effect.gen(function*() {
        for (const id of Object.keys(values)) yield* GetAny.get({ id })
        yield* issue({
          optimistic: [
            ...["memo", "closure", "time"].map((id) => GetAny.patch({ id }, (value) => value)),
            GetAny.patch({ id: "memoRead" }, (value: Lazy) => {
              assert.strictEqual(value.total, 1)
              return value
            })
          ]
        })
        const mutated = yield* TestLoader.expectProblem("PatchMutated")
        assert.deepStrictEqual(mutated.map((problem) => problem.logKey), [`{"id":"memoRead"}`])
        assert.strictEqual(computed, 1)
      }).pipe(Effect.provide(Layer.merge(GetAny.layer, TestLoader.layer())))
    })
    it.effect("PatchMutated runs none of the value's own code, and of a Proxy only the reflection traps", () => {
      // Every call into a value's own code counts here.
      let owned = 0
      const own = <A>(a: A): A => {
        owned++
        return a
      }
      class Opaque implements Equal.Equal {
        n = 0;
        [Equal.symbol](): boolean {
          own(0)
          throw new Error("equal")
        }
        [Hash.symbol](): number {
          own(0)
          throw new Error("hash")
        }
      }
      // An accessor at the Equal key that writes the value: the key's presence makes it Equal, and it is never read.
      const equalAccessor = () =>
        Object.defineProperty({ n: 0 }, Equal.symbol, {
          get(this: { n: number }) {
            own(this.n++)
            return undefined
          }
        })
      let flip = false
      class Flags extends RegExp {
        override get global() {
          return own(flip = !flip)
        }
      }
      class Bytes extends Uint8Array {
        override get buffer() {
          return own(super.buffer)
        }
        override get byteOffset() {
          return own(1)
        }
      }
      class View extends (DataView as new(buffer: ArrayBuffer) => DataView) {
        override get byteLength() {
          return own(0)
        }
      }
      class Day extends Date {
        override getTime() {
          return own(Math.random())
        }
      }
      class Dict extends Map<string, number> {
        override get size() {
          return own(0)
        }
        override forEach() {
          own(0)
        }
      }
      class Bag extends Set<number> {
        override get size() {
          return own(0)
        }
      }
      // Each trap a Proxy runs is recorded.
      const traps = new Set<string>()
      const watch = <A extends object>(target: A): A =>
        new Proxy(
          target,
          Object.fromEntries(
            Object.getOwnPropertyNames(Reflect).map((trap) => [trap, (...args: Array<any>) => {
              traps.add(trap)
              return (Reflect as any)[trap](...args)
            }])
          )
        )
      const proxied = { n: 0 }
      const values: Record<string, unknown> = {
        // Changed beside a held value whose Hash and Equal methods throw.
        besideOpaque: { opaque: new Opaque(), n: 0 },
        opaque: { opaque: new Opaque(), n: 0 },
        besideEqualAccessor: { inner: equalAccessor(), n: 0 },
        equalAccessor: equalAccessor(),
        flags: new Flags("a", "g"),
        bytes: new Bytes([1, 2]),
        mutatedBytes: new Bytes([1, 2]),
        view: new View(new ArrayBuffer(2)),
        day: new Day(0),
        dict: new Dict([["a", 1]]),
        bag: new Bag([1]),
        proxyRecord: watch(proxied),
        proxyArray: watch([0, { n: 0 }]),
        proxyBuffer: watch(new ArrayBuffer(2)),
        proxyDate: watch(new Date(0)),
        proxyMap: watch(new Map([["a", 1]]))
      }
      class GetAny extends Loader.Service<GetAny>()(
        "any/GetAny",
        { args: { id: Schema.String }, success: Schema.Any, error: Schema.Never, staleTime: "30 seconds" },
        Effect.sync(() => ({ id }) => Effect.sync(() => values[id]))
      ) {}
      const inPlace = (id: string, mutate: (value: any) => void) =>
        GetAny.patch({ id }, (value) => {
          mutate(value)
          return value
        })
      return Effect.gen(function*() {
        for (const id of Object.keys(values)) yield* GetAny.get({ id })
        owned = 0
        traps.clear()
        yield* issue({
          optimistic: [
            ...Object.keys(values).map((id) => GetAny.patch({ id }, (value) => value)),
            inPlace("besideOpaque", (value) => value.n++),
            inPlace("besideEqualAccessor", (value) => value.n++),
            // Read through the built-in slots, not the overridden getters.
            inPlace("mutatedBytes", (value: Bytes) => value[0]++),
            // Through the target, so that the patch itself runs no trap.
            inPlace("proxyRecord", () => proxied.n++)
          ]
        })
        const mutated = yield* TestLoader.expectProblem("PatchMutated")
        assert.deepStrictEqual(
          mutated.map((problem) => problem.logKey),
          ["besideOpaque", "besideEqualAccessor", "mutatedBytes", "proxyRecord"].map((id) => `{"id":"${id}"}`)
        )
        assert.strictEqual(owned, 0)
        // The snapshots reflected on the proxies, through the reflection traps only.
        assert.isTrue(traps.has("ownKeys") && traps.has("getOwnPropertyDescriptor"))
        assert.deepStrictEqual(
          [...traps].filter((trap) => !["getPrototypeOf", "has", "ownKeys", "getOwnPropertyDescriptor"].includes(trap)),
          []
        )
      }).pipe(Effect.provide(Layer.merge(GetAny.layer, TestLoader.layer())))
    })
    it.effect("PatchMutated compares binary data by its bytes, each kind apart, so an unchanged NaN stays unchanged", () => {
      const values: Record<string, unknown> = {
        buffer: new ArrayBuffer(2),
        shared: new SharedArrayBuffer(2),
        bytes: new Uint8Array(2),
        floats: new Float64Array(2),
        view: new DataView(new ArrayBuffer(2)),
        sharedBytes: new Uint8Array(new SharedArrayBuffer(2)),
        nanMutated: new Float64Array([NaN, 1]),
        widened: { bytes: new Uint8Array([1]) },
        retyped: { bytes: new Uint8Array([1]) },
        signedZero: new Float64Array([0]),
        untouched: new SharedArrayBuffer(2),
        nan64: new Float64Array([NaN]),
        nan32: new Float32Array([NaN, 1])
      }
      class GetBinary extends Loader.Service<GetBinary>()(
        "binary/GetBinary",
        { args: { id: Schema.String }, success: Schema.Any, error: Schema.Never, staleTime: "30 seconds" },
        Effect.sync(() => ({ id }) => Effect.sync(() => values[id]))
      ) {}
      const inPlace = (id: string, mutate: (value: any) => void) =>
        GetBinary.patch({ id }, (value) => {
          mutate(value)
          return value
        })
      return Effect.gen(function*() {
        for (const id of Object.keys(values)) yield* GetBinary.get({ id })
        yield* issue({
          optimistic: [
            inPlace("buffer", (value: ArrayBuffer) => new Uint8Array(value)[0]++),
            inPlace("shared", (value: SharedArrayBuffer) => new Uint8Array(value)[0]++),
            inPlace("bytes", (value: Uint8Array) => value[0]++),
            inPlace("floats", (value: Float64Array) => value[1] = 0.5),
            inPlace("view", (value: DataView) => value.setUint8(1, 7)),
            inPlace("sharedBytes", (value: Uint8Array) => value[1]++),
            // A NaN beside the changed element doesn't hide the change.
            inPlace("nanMutated", (value: Float64Array) => value[1] = 2),
            // Equal.equals compares byte lengths: the same elements, wider, differ.
            inPlace("widened", (value: { bytes: ArrayBufferView }) => value.bytes = new Uint16Array([1])),
            // Each kind is kept apart: the same bytes in another kind differ.
            inPlace("retyped", (value: { bytes: ArrayBufferView }) => value.bytes = new Int8Array([1])),
            // Binary data compares by bytes, so 0 to -0 is a change.
            inPlace("signedZero", (value: Float64Array) => value[0] = -0),
            // Returned as they are, unchanged: never reported, NaN included.
            inPlace("untouched", () => {}),
            inPlace("nan64", () => {}),
            inPlace("nan32", () => {})
          ]
        })
        const mutated = yield* TestLoader.expectProblem("PatchMutated")
        assert.deepStrictEqual(
          mutated.map((problem) => problem.logKey),
          [
            "buffer",
            "shared",
            "bytes",
            "floats",
            "view",
            "sharedBytes",
            "nanMutated",
            "widened",
            "retyped",
            "signedZero"
          ].map((id) => `{"id":"${id}"}`)
        )
      }).pipe(Effect.provide(Layer.merge(GetBinary.layer, TestLoader.layer())))
    })
  })

  describe("get under a live patch", () => {
    it.effect("a fresh entry is served with no request; a stale one gets a shared caller-only fetch", () => {
      const { GetUser, db, provide } = makeUsers()
      return Effect.gen(function*() {
        const watcher = yield* watchPatched(GetUser, { id: "1" })
        yield* advance(10)
        yield* issue({ optimistic: [GetUser.patch({ id: "1" }, (user) => ({ ...user, name: "Bob" }))] })
        // The server value, never the patched one.
        assert.deepStrictEqual(yield* GetUser.get({ id: "1" }), { id: "1", name: "Ann" })
        yield* advance("31 seconds")
        db.name = "Cid"
        const a = yield* GetUser.get({ id: "1" }).pipe(Effect.forkScoped)
        const b = yield* GetUser.get({ id: "1" }).pipe(Effect.forkScoped)
        yield* advance(10)
        assert.deepStrictEqual([(yield* Fiber.join(a)).name, (yield* Fiber.join(b)).name], ["Cid", "Cid"])
        // One request for both callers, never stored and invisible to the entry.
        assert.deepStrictEqual(yield* fetchLog, ["watch", "get unstored"])
        const entry = yield* TestLoader.entry(GetUser, { id: "1" })
        assert.strictEqual(entry?.stored._tag === "Success" && entry.stored.value.name, "Ann")
        assert.deepStrictEqual(watcher.seen, ["Ann", "Bob patched"])
      }).pipe(provide)
    })

    it.effect("a get waiting when a patch registers gets a caller-only fetch at once, logged as a restart", () => {
      const { GetUser, db, provide } = makeUsers()
      return Effect.gen(function*() {
        yield* GetUser.get({ id: "1" }).pipe(Effect.forkScoped)
        yield* advance(10)
        yield* GetUser.invalidate({ id: "1" })
        const pending = yield* GetUser.get({ id: "1" }).pipe(Effect.forkScoped)
        yield* advance(5)
        const { handle } = yield* issue({
          optimistic: [GetUser.patch({ id: "1" }, (user) => ({ ...user, name: "Bob" }))]
        })
        db.name = "Cid"
        yield* advance(10)
        assert.strictEqual((yield* Fiber.join(pending)).name, "Cid")
        assert.deepStrictEqual(yield* fetchLog, ["get", "get", "get restart unstored"])
        // An unwatched entry is owed no fetch when the run exits.
        handle.start()
        handle.finish({ _tag: "Failure" })
        yield* advance(20)
        assert.strictEqual((yield* fetchLog).length, 3)
      }).pipe(provide)
    })

    it.effect("a converted get starts its caller-only fetch only once the interrupted fetch has cleaned up", () => {
      const log: Array<string> = []
      const gate = Deferred.makeUnsafe<void>()
      let calls = 0
      class GetGated extends Loader.Service<GetGated>()(
        "gated/GetGated",
        { args: { id: Schema.String }, success: Schema.String, error: Schema.Never, staleTime: "30 seconds" },
        Effect.sync(() => () =>
          Effect.suspend(() => {
            const n = ++calls
            log.push("start " + n)
            return Effect.sleep(10).pipe(
              Effect.as("v" + n),
              Effect.onInterrupt(() =>
                Deferred.await(gate).pipe(Effect.andThen(Effect.sync(() => log.push("cleaned " + n))))
              )
            )
          })
        )
      ) {}
      return Effect.gen(function*() {
        yield* GetGated.get({ id: "1" }).pipe(Effect.forkScoped)
        yield* advance(10)
        yield* GetGated.invalidate({ id: "1" })
        const pending = yield* GetGated.get({ id: "1" }).pipe(Effect.forkScoped)
        yield* advance(5)
        yield* issue({ optimistic: [GetGated.patch({ id: "1" }, (s) => s + "!")] })
        yield* advance(5)
        // The interrupted fetch is still cleaning up, so its replacement waits.
        assert.deepStrictEqual(log, ["start 1", "start 2"])
        Deferred.doneUnsafe(gate, Exit.void)
        yield* flush
        assert.deepStrictEqual(log, ["start 1", "start 2", "cleaned 2", "start 3"])
        yield* advance(10)
        assert.strictEqual(yield* Fiber.join(pending), "v3")
      }).pipe(Effect.provide(Layer.merge(GetGated.layer, TestLoader.layer())))
    })

    it.effect("a caller-only fetch moving to a surviving build starts once the one under the closed build has cleaned up", () => {
      const log: Array<string> = []
      const cleanup = Latch.makeUnsafe()
      let calls = 0
      class GetGated extends Loader.Service<GetGated>()(
        "gated/GetGated",
        { args: { id: Schema.String }, success: Schema.String, error: Schema.Never, staleTime: "30 seconds" },
        Effect.sync(() => () =>
          Effect.suspend(() => {
            const n = ++calls
            log.push("start " + n)
            return Effect.sleep(10).pipe(
              Effect.as("v" + n),
              Effect.onInterrupt(() => cleanup.await.pipe(Effect.andThen(Effect.sync(() => log.push("cleaned " + n)))))
            )
          })
        )
      ) {}
      return Effect.gen(function*() {
        const scopeA = yield* Scope.make()
        const buildA = yield* Layer.buildWithScope(Layer.fresh(GetGated.layer), scopeA)
        const buildB = yield* Layer.buildWithScope(Layer.fresh(GetGated.layer), yield* Effect.scope)
        yield* GetGated.get({ id: "1" }).pipe(Effect.provideContext(buildB), Effect.forkScoped)
        yield* advance(10)
        yield* GetGated.invalidate({ id: "1" })
        yield* issue({ optimistic: [GetGated.patch({ id: "1" }, (s) => s + "!")] })
        // Stale under a live patch: one caller-only fetch, under the first caller's build.
        const a = yield* GetGated.get({ id: "1" }).pipe(Effect.provideContext(buildA), Effect.forkScoped)
        const b = yield* GetGated.get({ id: "1" }).pipe(Effect.provideContext(buildB), Effect.forkScoped)
        yield* advance(5)
        yield* Effect.forkScoped(Scope.close(scopeA, Exit.void))
        yield* flush
        assert.deepStrictEqual(log, ["start 1", "start 2"])
        yield* cleanup.open
        yield* flush
        assert.deepStrictEqual(log, ["start 1", "start 2", "cleaned 2", "start 3"])
        yield* advance(10)
        // Both callers get the one answer.
        assert.deepStrictEqual([yield* Fiber.join(a), yield* Fiber.join(b)], ["v3", "v3"])
        assert.deepStrictEqual(yield* fetchLog, ["get", "get unstored", "get restart unstored"])
      }).pipe(Effect.provide(TestLoader.layer()))
    })
  })

  describe("writes", () => {
    it.effect("a write is stored fresh only if nothing else hit the entry since the run's start", () => {
      const { GetUser, provide } = makeUsers()
      return Effect.gen(function*() {
        const watcher = yield* watchPatched(GetUser, { id: "1" })
        yield* advance(10)
        const fiber = yield* run(
          { invalidates: [GetUser.entry({ id: "1" })] },
          Effect.sleep(30).pipe(Effect.as({ id: "1", name: "Bob" })),
          (user) => [GetUser.set({ id: "1" }, user)]
        )
        yield* advance(5)
        yield* GetUser.invalidate({ id: "1" })
        yield* advance(30)
        yield* Fiber.join(fiber)
        yield* advance(10)
        // Stored stale, so the run's own invalidation refetches it.
        assert.deepStrictEqual(watcher.seen, ["Ann", "Ann waiting", "Ann", "Bob", "Bob waiting", "Ann"])
        assert.deepStrictEqual(yield* fetchLog, ["watch", "invalidation", "invalidation"])
      }).pipe(provide)
    })

    it.effect("a write creates a cold entry, replaces a Failure and restarts a fetch in flight", () => {
      const { GetUser, db, provide } = makeUsers()
      return Effect.gen(function*() {
        db.fail = true
        const failing = yield* watchPatched(GetUser, { id: "2" })
        yield* advance(10)
        db.fail = false
        const pending = yield* GetUser.get({ id: "3" }).pipe(Effect.forkScoped)
        yield* advance(5)
        db.name = "Server"
        yield* Fiber.join(
          yield* run({ invalidates: [GetUser] }, Effect.void, () => [
            GetUser.set({ id: "1" }, { id: "1", name: "Cold" }),
            GetUser.set({ id: "2" }, { id: "2", name: "Fixed" }),
            GetUser.set({ id: "3" }, { id: "3", name: "Written" })
          ])
        )
        const one = yield* TestLoader.entry(GetUser, { id: "1" })
        assert.deepStrictEqual([one?.stored._tag === "Success" && one.stored.value.name, one?.stale], ["Cold", false])
        assert.deepStrictEqual(failing.seen, ["Failure(nope)", "Fixed"])
        // The fetch that began before the write restarts, so older data can't overwrite it.
        yield* advance(10)
        assert.strictEqual((yield* Fiber.join(pending)).name, "Server")
        assert.deepStrictEqual(yield* fetchLog, ["watch", "get", "get restart"])
      }).pipe(provide)
    })

    it.effect("a write no target covers is reported as UncoveredWrite and applies", () => {
      const { GetUser, provide } = makeUsers()
      return Effect.gen(function*() {
        yield* GetUser.get({ id: "1" }).pipe(Effect.forkScoped)
        yield* advance(10)
        yield* Fiber.join(
          yield* run({ command: "Rename", invalidates: [] }, Effect.void, () => [
            GetUser.set({ id: "1" }, { id: "1", name: "Bob" }),
            // An entry the run's start didn't know: not reported.
            GetUser.set({ id: "9" }, { id: "9", name: "New" })
          ])
        )
        const problems = yield* TestLoader.expectProblem("UncoveredWrite")
        assert.deepStrictEqual(problems.map((p) => [p.logKey, p.command]), [[`{"id":"1"}`, "Rename"]])
        const entry = yield* TestLoader.entry(GetUser, { id: "1" })
        assert.strictEqual(entry?.stored._tag === "Success" && entry.stored.value.name, "Bob")
      }).pipe(provide)
    })

    it.effect("a throwing writes still settles the run: its patches are held and its targets invalidated", () => {
      const { GetUser, provide } = makeUsers()
      return Effect.gen(function*() {
        const watcher = yield* watchPatched(GetUser, { id: "1" })
        yield* advance(10)
        const fiber = yield* run(
          { invalidates: [GetUser], optimistic: [GetUser.patch({ id: "1" }, (user) => ({ ...user, name: "Bob" }))] },
          Effect.void,
          () => {
            throw new Error("bad writes")
          }
        )
        assert.isTrue(Exit.hasDies(yield* Fiber.await(fiber)))
        assert.deepStrictEqual((yield* TestLoader.entry(GetUser, { id: "1" }))?.patches, { live: 0, held: 1 })
        yield* advance(10)
        assert.deepStrictEqual(watcher.seen, ["Ann", "Bob patched", "Bob waiting patched", "Ann"])
      }).pipe(provide)
    })
  })
})
