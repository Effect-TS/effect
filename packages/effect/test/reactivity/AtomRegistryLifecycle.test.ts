import { afterEach, assert, beforeEach, describe, it, vitest } from "@effect/vitest"
import { Effect } from "effect"
import { AsyncResult, Atom, AtomRegistry } from "effect/reactivity"

describe("AtomRegistry", { concurrent: false }, () => {
  beforeEach(async () => {
    vitest.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] })
    await Effect.runPromise(Effect.yieldNow)
  })
  afterEach(() => {
    vitest.useRealTimers()
  })

  it("a build superseded after it threw cannot write the rebuilt node", () => {
    const p = Atom.make(1)
    const q = Atom.make(0)
    const n = Atom.readable((get) => {
      const v = get(p)
      if (v === 1) {
        get.subscribe(q, (x) => get.setSelf(x))
        throw new Error("boom")
      }
      return v
    })
    const r = AtomRegistry.make()
    assert.throws(() => r.get(n), "boom")
    r.set(p, 2)
    assert.strictEqual(r.get(n), 2)
    r.set(q, 99)
    assert.strictEqual(r.get(n), 2)
    r.dispose()
  })

  it("a stale dependent keeps its dependency", async () => {
    let runs = 0
    const primary = Atom.make(() => Effect.sync(() => ++runs).pipe(Effect.delay(100)))
    const count = primary.pipe(Atom.withFallback(Atom.make(Effect.succeed(0))), Atom.keepAlive)
    const r = AtomRegistry.make()
    assert.deepStrictEqual(r.get(count), AsyncResult.waiting(AsyncResult.success(0)))
    await vitest.advanceTimersByTimeAsync(100)
    r.subscribe(primary, () => {})()
    await Effect.runPromise(Effect.yieldNow)
    assert.deepStrictEqual(r.get(count), AsyncResult.success(1))
    assert.strictEqual(runs, 1)
    r.dispose()
  })

  it("a listener added to a stale node hears the next change of the parent that staled it", () => {
    const a = Atom.make(0)
    const b = Atom.make((get) => get(a) * 2)
    const r = AtomRegistry.make()
    r.get(b)
    r.set(a, 1)
    const seen: Array<number> = []
    r.subscribe(b, (value) => seen.push(value))
    r.set(a, 2)
    assert.deepStrictEqual(seen, [4])
    r.dispose()
  })

  it("a batch rebuilds a stale node the same whichever parent staled it", () => {
    const builds = (staleVia: "a" | "b") => {
      const a = Atom.make(0)
      const b = Atom.make(0)
      let count = 0
      const c = Atom.make((get) => {
        count++
        return get(a) + get(b)
      }).pipe(Atom.keepAlive)
      const r = AtomRegistry.make()
      r.get(c)
      r.set(staleVia === "a" ? a : b, 1)
      Atom.batch(() => r.set(b, 2))
      r.dispose()
      return count
    }
    assert.strictEqual(builds("a"), builds("b"))
  })

  it("a writable derived atom written while stale keeps following its parent", () => {
    const run = (stale: boolean) => {
      const source = Atom.make(1)
      const derived = Atom.writable((get) => get(source) * 10, (ctx, value: number) => ctx.setSelf(value))
      const r = AtomRegistry.make()
      r.get(derived)
      if (stale) r.set(source, 2)
      r.set(derived, 99)
      r.set(source, 3)
      const value = r.get(derived)
      r.dispose()
      return value
    }
    assert.deepStrictEqual({ stale: run(true), valid: run(false) }, { stale: 30, valid: 30 })
  })

  it("a dependent built while its parent's change propagates hears the parent's next change", () => {
    const source = Atom.make(0)
    const middle = Atom.make((get) => get(source))
    const dependent = Atom.make((get) => get(middle))
    const r = AtomRegistry.make()
    let armed = false
    const child = Atom.make((get) => {
      get.addFinalizer(() => {
        if (armed) {
          armed = false
          r.get(dependent)
        }
      })
      return get(middle)
    }).pipe(Atom.keepAlive)
    r.get(child)
    armed = true
    r.set(source, 1)
    const seen: Array<number> = []
    r.subscribe(dependent, (value) => seen.push(value))
    r.set(source, 2)
    assert.deepStrictEqual(seen, [2])
    r.dispose()
  })

  it("a build superseded while it runs is released", () => {
    const p = Atom.make(0)
    let finalized = 0
    let interrupted = 0
    const n = Atom.make((get) => {
      get.addFinalizer(() => finalized++)
      if (get(p) === 0) get.set(p, 1)
      return Effect.never.pipe(Effect.onInterrupt(() => Effect.sync(() => interrupted++)))
    })
    const r = AtomRegistry.make()
    r.subscribe(n, () => {})
    r.get(n)
    assert.deepStrictEqual({ finalized, interrupted }, { finalized: 1, interrupted: 1 })
    r.dispose()
  })

  it("a finalizer that throws during an idle-TTL sweep neither strands the bucket nor shortens later TTLs", async () => {
    const r = AtomRegistry.make({ timeoutResolution: 100 })
    let bReleased = false
    const a = Atom.readable((get) => {
      get.addFinalizer(() => {
        throw new Error("boom")
      })
      return "a"
    }).pipe(Atom.setIdleTTL(1000))
    const b = Atom.readable((get) => {
      get.addFinalizer(() => {
        bReleased = true
      })
      return "b"
    }).pipe(Atom.setIdleTTL(1000))
    r.mount(a)()
    r.mount(b)()
    await Effect.runPromise(Effect.yieldNow)
    assert.throws(() => vitest.advanceTimersByTime(1300), "boom")
    assert.strictEqual(bReleased, true)
    let cReleased = false
    const c = Atom.readable((get) => {
      get.addFinalizer(() => {
        cReleased = true
      })
      return "c"
    }).pipe(Atom.setIdleTTL(800))
    r.mount(c)()
    await Effect.runPromise(Effect.yieldNow)
    vitest.advanceTimersByTime(500)
    assert.strictEqual(cReleased, false)
    r.dispose()
  })

  it("a listener that throws does not stop the other listeners", () => {
    const a = Atom.make(0)
    const r = AtomRegistry.make()
    let second = 0
    r.subscribe(a, () => {
      throw new Error("boom")
    })
    r.subscribe(a, () => {
      second++
    })
    assert.throws(() => r.set(a, 1), "boom")
    assert.strictEqual(second, 1)
    r.dispose()
  })

  it("a dependent whose rebuild throws does not leave its siblings out of date", () => {
    const a = Atom.make(0)
    const failing = Atom.make((get) => {
      if (get(a) === 1) throw new Error("boom")
      return get(a)
    })
    const scaled = Atom.make((get) => get(a) * 10)
    const r = AtomRegistry.make()
    r.subscribe(failing, () => {}, { immediate: true })
    r.subscribe(scaled, () => {}, { immediate: true })
    assert.throws(() => r.set(a, 1), "boom")
    assert.strictEqual(r.get(scaled), 10)
    r.dispose()
  })

  it("a batch whose function throws still notifies what it changed", () => {
    const a = Atom.make(0)
    const b = Atom.make(0)
    const r = AtomRegistry.make()
    const seen: Array<string> = []
    r.subscribe(a, (value) => seen.push(`a${value}`))
    r.subscribe(b, (value) => seen.push(`b${value}`))
    assert.throws(() =>
      Atom.batch(() => {
        r.set(a, 1)
        throw new Error("boom")
      }), "boom")
    assert.deepStrictEqual(seen, ["a1"])
    Atom.batch(() => r.set(b, 1))
    assert.deepStrictEqual(seen, ["a1", "b1"])
    r.dispose()
  })

  it("dispose leaves no idle-TTL timers", async () => {
    const parent = Atom.make(0)
    const child = Atom.make((get) => get(parent) + 1)
    const r = AtomRegistry.make({ defaultIdleTTL: 60_000 })
    r.mount(child)
    await Effect.runPromise(Effect.yieldNow)
    r.dispose()
    assert.strictEqual(vitest.getTimerCount(), 0)
  })
})
