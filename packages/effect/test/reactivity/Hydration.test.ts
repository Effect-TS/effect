import { afterEach, assert, beforeEach, describe, it, vitest } from "@effect/vitest"
import { Effect, Layer, Option, Schema } from "effect"
import { AsyncResult, Atom, AtomRegistry, Hydration } from "effect/reactivity"

describe("Hydration", () => {
  describe("query", { concurrent: false }, () => {
    const schema = AsyncResult.Schema({ success: Schema.Number, error: Schema.String })
    const encodedState = (result: AsyncResult.AsyncResult<number, string>): Array<Hydration.DehydratedAtomValue> => [{
      "~effect/reactivity/Hydration/DehydratedAtom": true,
      key: "query-count",
      value: Schema.encodeSync(schema)(result),
      dehydratedAt: Date.now()
    }]

    beforeEach(() => {
      vitest.useFakeTimers({ toFake: ["Date"] })
      vitest.setSystemTime(10_000)
    })
    afterEach(() => vitest.useRealTimers())

    it("preserves timestamps and builds the factory after repeated hydration before activation", () => {
      let builds = 0
      let runs = 0
      const atom = Atom.query<number, string>(() => {
        builds++
        return Effect.sync(() => ++runs)
      }, { staleTime: 1_000 }).pipe(Atom.serializable({ key: "query-count", schema }))
      const serverAtom = Atom.make<AsyncResult.AsyncResult<number, string>>(
        AsyncResult.success(10, { timestamp: 9_500 })
      )
        .pipe(Atom.serializable({ key: "query-count", schema }))
      const server = AtomRegistry.make()
      const client = AtomRegistry.make()
      try {
        server.mount(serverAtom)
        Hydration.hydrate(client, Hydration.dehydrate(server))
        client.ensureNode(atom)
        server.set(serverAtom, AsyncResult.success(20, { timestamp: 9_900 }))
        Hydration.hydrate(client, Hydration.dehydrate(server))
        assert.strictEqual(runs, 0)

        client.mount(atom)
        assert.deepStrictEqual(client.get(atom), AsyncResult.success(20, { timestamp: 9_900 }))
        assert.strictEqual(builds, 1)
        assert.strictEqual(runs, 0)
      } finally {
        server.dispose()
        client.dispose()
      }
    })

    it.each(["initial", "waiting", "invalid"] as const)("fetches on activation after %s hydration", (kind) => {
      let runs = 0
      const atom = Atom.query<number, string>(Effect.sync(() => ++runs), { staleTime: Infinity }).pipe(
        Atom.serializable({ key: "query-count", schema, skipInitialRun: true })
      )
      const state = encodedState(
        kind === "waiting"
          ? AsyncResult.success(0, { waiting: true })
          : AsyncResult.initial(true)
      )
      if (kind === "invalid") state[0] = { ...state[0], value: "invalid" }
      const client = AtomRegistry.make()
      try {
        Hydration.hydrate(client, state)
        client.mount(atom)
        assert.deepStrictEqual(AsyncResult.value(client.get(atom)), Option.some(1))
        assert.strictEqual(client.get(atom).waiting, false)
        assert.strictEqual(runs, 1)
      } finally {
        client.dispose()
      }
    })

    it("reuses a fresh seed arriving while the runtime is still starting", async () => {
      const { promise, resolve } = Promise.withResolvers<void>()
      const runtime = Atom.runtime(Layer.effectDiscard(Effect.promise(() => promise)))
      let runs = 0
      const atom = runtime.query<number, string>(Effect.sync(() => ++runs), { staleTime: Infinity }).pipe(
        Atom.serializable({ key: "query-count", schema })
      )
      const client = AtomRegistry.make()
      try {
        client.mount(atom)
        assert(AsyncResult.isInitial(client.get(atom)))
        const seed = AsyncResult.success(42)
        Hydration.hydrate(client, encodedState(seed))
        assert.deepStrictEqual(client.get(atom), seed)

        resolve()
        await promise
        await Effect.runPromise(Effect.yieldNow)
        assert.strictEqual(runs, 0)
        assert.deepStrictEqual(client.get(atom), seed)

        client.refresh(atom)
        assert.strictEqual(runs, 1)
        assert.deepStrictEqual(AsyncResult.value(client.get(atom)), Option.some(1))
      } finally {
        client.dispose()
      }
    })

    it.each([
      { replace: false, expectedRuns: 2 },
      { replace: true, expectedRuns: 1 }
    ])("revalidates active stale hydration unless replaced by fresh data (replace: $replace)", ({
      expectedRuns,
      replace
    }) => {
      let runs = 0
      const atom = Atom.query<number, string>(Effect.sync(() => ++runs), { staleTime: 1_000 }).pipe(
        Atom.serializable({ key: "query-count", schema })
      )
      const scheduled = new Set<() => void>()
      const client = AtomRegistry.make({
        scheduleTask: (task) => {
          scheduled.add(task)
          return () => {
            scheduled.delete(task)
          }
        }
      })
      try {
        client.mount(atom)
        assert.strictEqual(runs, 1)
        vitest.setSystemTime(12_000)

        const seed = AsyncResult.success(99, { timestamp: 10_500 })
        Hydration.hydrate(client, encodedState(seed))
        assert.deepStrictEqual(client.get(atom), seed)
        assert.strictEqual(runs, 1)
        const fresh = AsyncResult.success(100, { timestamp: 11_900 })
        if (replace) {
          Hydration.hydrate(client, encodedState(fresh))
          assert.deepStrictEqual(client.get(atom), fresh)
        }
        for (const task of scheduled) {
          scheduled.delete(task)
          task()
        }
        assert.strictEqual(runs, expectedRuns)
        assert.deepStrictEqual(client.get(atom), replace ? fresh : AsyncResult.success(2, { timestamp: 12_000 }))
      } finally {
        client.dispose()
      }
    })

    it.each(["throws", "refreshes"] as const)("preserves revalidation when a hydration listener %s", (behavior) => {
      let runs = 0
      const atom = Atom.query<number, string>(Effect.sync(() => ++runs), {
        staleTime: behavior === "throws" ? 1_000 : 0
      }).pipe(Atom.serializable({ key: "query-count", schema }))
      const scheduled = new Set<() => void>()
      const client = AtomRegistry.make({
        scheduleTask: (task) => {
          scheduled.add(task)
          return () => {
            scheduled.delete(task)
          }
        }
      })
      const listenerError = new Error("hydration listener failed")
      try {
        client.mount(atom)
        client.subscribe(atom, (result) => {
          if (!AsyncResult.isSuccess(result) || result.value !== 99) return
          if (behavior === "throws") throw listenerError
          client.refresh(atom)
        })
        vitest.setSystemTime(12_000)
        const state = encodedState(AsyncResult.success(99, { timestamp: 10_500 }))

        if (behavior === "throws") {
          assert.throws(() => Hydration.hydrate(client, state), listenerError)
          assert.strictEqual(runs, 1)
          assert.deepStrictEqual(AsyncResult.value(client.get(atom)), Option.some(99))
        } else {
          Hydration.hydrate(client, state)
          assert.strictEqual(runs, 2)
        }
        for (const task of scheduled) {
          scheduled.delete(task)
          task()
        }
        assert.strictEqual(runs, 2)
        assert.deepStrictEqual(AsyncResult.value(client.get(atom)), Option.some(2))
      } finally {
        client.dispose()
      }
    })

    it("revalidates a new seed after a synchronous client read in the same turn", () => {
      let runs = 0
      const atom = Atom.query<number, string>(Effect.sync(() => ++runs)).pipe(
        Atom.serializable({ key: "query-count", schema })
      )
      const scheduled = new Set<() => void>()
      const client = AtomRegistry.make({
        scheduleTask: (task) => {
          scheduled.add(task)
          return () => {
            scheduled.delete(task)
          }
        }
      })
      try {
        assert.deepStrictEqual(AsyncResult.value(client.get(atom)), Option.some(1))
        const seed = AsyncResult.success(99)
        Hydration.hydrate(client, encodedState(seed))
        client.mount(atom)
        assert.deepStrictEqual(client.get(atom), seed)
        assert.strictEqual(runs, 1)

        for (const task of scheduled) {
          scheduled.delete(task)
          task()
        }
        assert.deepStrictEqual(AsyncResult.value(client.get(atom)), Option.some(2))
        assert.strictEqual(runs, 2)
      } finally {
        client.dispose()
      }
    })

    it("rejects an older success while a client failure retains newer data", () => {
      let fail = false
      const atom = Atom.query(Effect.suspend(() => fail ? Effect.fail("client-error") : Effect.succeed(1)), {
        staleTime: Infinity
      }).pipe(Atom.serializable({ key: "query-count", schema }))
      const client = AtomRegistry.make()
      try {
        client.mount(atom)
        fail = true
        client.refresh(atom)
        const failure = client.get(atom)
        assert(AsyncResult.isFailure(failure))

        Hydration.hydrate(client, encodedState(AsyncResult.success(0, { timestamp: 9_000 })))
        assert.strictEqual(client.get(atom), failure)
        assert.deepStrictEqual(AsyncResult.value(client.get(atom)), Option.some(1))
      } finally {
        client.dispose()
      }
    })

    it("does not let hydration cancel a pending unobserved refresh", () => {
      let runs = 0
      const atom = Atom.query<number, string>(Effect.sync(() => ++runs), { staleTime: Infinity, timeToLive: 10_000 })
        .pipe(
          Atom.serializable({ key: "query-count", schema })
        )
      const client = AtomRegistry.make()
      try {
        Hydration.hydrate(client, encodedState(AsyncResult.success(0)))
        client.mount(atom)()
        client.refresh(atom)
        Hydration.hydrate(client, encodedState(AsyncResult.success(99, { timestamp: 11_000 })))

        client.mount(atom)
        assert.deepStrictEqual(AsyncResult.value(client.get(atom)), Option.some(1))
        assert.strictEqual(runs, 1)
      } finally {
        client.dispose()
      }
    })

    it.each(["older success", "failure"] as const)("rejects a streamed %s after client execution", async (kind) => {
      const { promise, resolve } = Promise.withResolvers<unknown>()
      let runs = 0
      const atom = Atom.query<number, string>(Effect.sync(() => ++runs), { staleTime: Infinity }).pipe(
        Atom.serializable({ key: "query-count", schema })
      )
      const state = [{ ...encodedState(AsyncResult.initial(true))[0], resultPromise: promise }]
      const client = AtomRegistry.make()
      try {
        Hydration.hydrate(client, state)
        client.mount(atom)
        const current = client.get(atom)
        const incoming = kind === "older success"
          ? AsyncResult.success(99, { timestamp: 9_000 })
          : AsyncResult.fail("server-error")
        resolve(Schema.encodeSync(schema)(incoming))
        await promise
        await Effect.runPromise(Effect.yieldNow)

        assert.strictEqual(client.get(atom), current)
        assert.deepStrictEqual(AsyncResult.value(current), Option.some(1))
        assert.strictEqual(runs, 1)
      } finally {
        client.dispose()
      }
    })

    it("keeps ownership of a running request when a streamed success replaces its visible waiting state", async () => {
      const remote = Promise.withResolvers<unknown>()
      const local = Promise.withResolvers<number>()
      const focusSignal = Atom.make(0)
      let runs = 0
      const atom = Atom.query<number, string>(
        Effect.suspend(() => {
          runs++
          return Effect.promise(() => local.promise)
        }),
        { staleTime: 0, revalidateOnFocus: true, focusSignal }
      ).pipe(
        Atom.serializable({ key: "query-count", schema })
      )
      const state = [{ ...encodedState(AsyncResult.initial(true))[0], resultPromise: remote.promise }]
      const client = AtomRegistry.make()
      try {
        Hydration.hydrate(client, state)
        client.mount(atom)
        remote.resolve(Schema.encodeSync(schema)(AsyncResult.success(99)))
        await remote.promise
        client.set(focusSignal, 1)
        await Effect.runPromise(Effect.yieldNow)
        assert.deepStrictEqual(AsyncResult.value(client.get(atom)), Option.some(99))
        assert.strictEqual(runs, 1)

        local.resolve(1)
        await Effect.runPromise(Effect.yieldNow)
        assert.deepStrictEqual(AsyncResult.value(client.get(atom)), Option.some(1))
        assert.strictEqual(runs, 1)
      } finally {
        client.dispose()
      }
    })
  })

  it("runs a plain hydrated effect atom on mount and tracks factory dependencies", () => {
    const dependency = Atom.make(1)
    let runs = 0
    const atom = Atom.make((get) => {
      const value = get(dependency)
      return Effect.sync(() => {
        runs++
        return value
      })
    }).pipe(
      Atom.serializable({ key: "count", schema: AsyncResult.Schema({ success: Schema.Number }) })
    )
    const server = AtomRegistry.make()
    const client = AtomRegistry.make()
    try {
      const serverAtom = Atom.make<AsyncResult.AsyncResult<number>>(AsyncResult.success(10)).pipe(
        Atom.serializable({ key: "count", schema: AsyncResult.Schema({ success: Schema.Number }) })
      )
      server.mount(serverAtom)
      Hydration.hydrate(client, Hydration.dehydrate(server))
      client.mount(atom)

      assert.strictEqual(runs, 1)

      client.set(dependency, 2)
      const result = client.get(atom)
      assert(AsyncResult.isSuccess(result))
      assert.strictEqual(result.value, 2)
      assert.strictEqual(runs, 2)
    } finally {
      server.dispose()
      client.dispose()
    }
  })

  it("skipInitialRun keeps a hydrated effect seed until a factory dependency changes", () => {
    const dependency = Atom.make(1)
    let runs = 0
    const atom = Atom.make((get) => {
      const value = get(dependency)
      return Effect.sync(() => {
        runs++
        return value
      })
    }).pipe(
      Atom.serializable({
        key: "count",
        schema: AsyncResult.Schema({ success: Schema.Number }),
        skipInitialRun: true
      })
    )
    const server = AtomRegistry.make()
    const client = AtomRegistry.make()
    try {
      const serverAtom = Atom.make<AsyncResult.AsyncResult<number>>(AsyncResult.success(10)).pipe(
        Atom.serializable({ key: "count", schema: AsyncResult.Schema({ success: Schema.Number }) })
      )
      server.mount(serverAtom)
      Hydration.hydrate(client, Hydration.dehydrate(server))
      client.mount(atom)

      let result = client.get(atom)
      assert(AsyncResult.isSuccess(result))
      assert.strictEqual(result.value, 10)
      assert.strictEqual(runs, 0)

      client.set(dependency, 2)
      result = client.get(atom)
      assert(AsyncResult.isSuccess(result))
      assert.strictEqual(result.value, 2)
      assert.strictEqual(runs, 1)
    } finally {
      server.dispose()
      client.dispose()
    }
  })

  it("notifies subscribers of an atom the registry already holds", () => {
    const atom = Atom.make(0).pipe(Atom.serializable({ key: "existing-count", schema: Schema.Number }))
    const doubled = Atom.map(atom, (n) => n * 2)
    const registry = AtomRegistry.make()
    try {
      registry.mount(doubled)
      const heard: Array<number> = []
      registry.subscribe(atom, (n) => heard.push(n))

      const state: Array<Hydration.DehydratedAtomValue> = [{
        "~effect/reactivity/Hydration/DehydratedAtom": true,
        key: "existing-count",
        value: 5,
        dehydratedAt: 0
      }]
      Hydration.hydrate(registry, state)

      assert.deepStrictEqual(heard, [5])
      assert.strictEqual(registry.get(doubled), 10)
    } finally {
      registry.dispose()
    }
  })

  it("falls back on the first read of invalid immediate hydration", () => {
    const atom = Atom.make(0).pipe(Atom.serializable({ key: "count", schema: Schema.Number }))
    const registry = AtomRegistry.make()
    try {
      const state: Array<Hydration.DehydratedAtomValue> = [{
        "~effect/reactivity/Hydration/DehydratedAtom": true,
        key: "count",
        value: "invalid",
        dehydratedAt: 0
      }]
      Hydration.hydrate(registry, state)

      assert.strictEqual(registry.get(atom), 0)
    } finally {
      registry.dispose()
    }
  })

  it.each(["invalid", "skipped"] as const)("releases %s streamed hydration", async (kind) => {
    const { promise, resolve } = Promise.withResolvers<number>()
    const serverAtom = Atom.make(Effect.promise(() => promise)).pipe(
      Atom.serializable({
        key: "count",
        schema: AsyncResult.Schema({ success: kind === "invalid" ? Schema.Number : Schema.Int })
      })
    )
    const source = Atom.make(Effect.succeed(0))
    const clientAtom = (kind === "invalid"
      ? source.pipe(Atom.mapResult((n) => n + 1))
      : source.pipe(Atom.withRefresh("1 hour"))).pipe(
        Atom.serializable({ key: "count", schema: AsyncResult.Schema({ success: Schema.Int }) })
      )
    const server = AtomRegistry.make()
    const client = AtomRegistry.make()
    try {
      server.mount(serverAtom)
      const state = Hydration.toValues(Hydration.dehydrate(server, { encodeInitialAs: "promise" }))
      Hydration.hydrate(client, state)
      client.mount(clientAtom)
      assert.deepStrictEqual(client.get(clientAtom), AsyncResult.initial(true))

      resolve(0.5)
      await state[0].resultPromise
      await Effect.runPromise(Effect.yieldNow)

      const result = client.get(clientAtom)
      assert(AsyncResult.isSuccess(result))
      assert.strictEqual(result.value, kind === "invalid" ? 1 : 0)
      assert.strictEqual(result.waiting, false)
    } finally {
      server.dispose()
      client.dispose()
    }
  })

  it("preserves client state when a superseded stream cannot be encoded", async () => {
    const atom = Atom.make<AsyncResult.AsyncResult<number>>(AsyncResult.initial()).pipe(
      Atom.serializable({ key: "count", schema: AsyncResult.Schema({ success: Schema.Int }) })
    )
    const server = AtomRegistry.make()
    const client = AtomRegistry.make()
    try {
      server.mount(atom)
      const state = Hydration.dehydrate(server, { encodeInitialAs: "promise" })
      Hydration.hydrate(client, state)
      const result = AsyncResult.success(42)
      client.set(atom, result)

      server.set(atom, AsyncResult.success(0.5))
      await Hydration.toValues(state)[0].resultPromise

      assert.deepStrictEqual(client.get(atom), result)
    } finally {
      server.dispose()
      client.dispose()
    }
  })

  const atom = Atom.make<AsyncResult.AsyncResult<string>>(AsyncResult.initial()).pipe(
    Atom.serializable({ key: "profile", schema: AsyncResult.Schema({ success: Schema.String }) })
  )

  it.each([
    { serverTimestamp: 1000, expected: "client", expectedTimestamp: 2000 },
    { serverTimestamp: 3000, expected: "server", expectedTimestamp: 3000 }
  ])("compares result freshness on the next read (server timestamp: $serverTimestamp)", ({
    expected,
    expectedTimestamp,
    serverTimestamp
  }) => {
    const server = AtomRegistry.make()
    const client = AtomRegistry.make()
    try {
      server.set(atom, AsyncResult.success("server", { timestamp: serverTimestamp }))
      const state = JSON.parse(JSON.stringify(Hydration.dehydrate(server)))
      client.set(atom, AsyncResult.success("client", { timestamp: 2000 }))

      Hydration.hydrate(client, state)

      assert.deepStrictEqual(client.get(atom), AsyncResult.success(expected, { timestamp: expectedTimestamp }))
    } finally {
      server.dispose()
      client.dispose()
    }
  })

  it("ignores a streamed result older than the client value at resolution", async () => {
    const server = AtomRegistry.make()
    const client = AtomRegistry.make()
    try {
      server.mount(atom)
      const state = Hydration.dehydrate(server, { encodeInitialAs: "promise" })
      Hydration.hydrate(client, state)

      // The client finishes after hydration starts but before the server result arrives.
      client.set(atom, AsyncResult.success("client", { timestamp: 2000 }))
      server.set(atom, AsyncResult.success("server", { timestamp: 1000 }))
      await Hydration.toValues(state)[0].resultPromise

      assert.deepStrictEqual(client.get(atom), AsyncResult.success("client", { timestamp: 2000 }))
    } finally {
      server.dispose()
      client.dispose()
    }
  })
})
