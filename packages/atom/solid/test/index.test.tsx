import {
  useAtom,
  useAtomInitialValues,
  useAtomMount,
  useAtomRef,
  useAtomRefProp,
  useAtomRefPropValue,
  useAtomResource,
  useAtomSubscribe,
  useAtomValue
} from "@effect/atom-solid"
import { assert, describe, it } from "@effect/vitest"
import { AsyncResult, Atom, AtomRef, AtomRegistry } from "effect/reactivity"
import { type Accessor, createRoot, createSignal, type Resource } from "solid-js"
import { flush, isSolid2, provideRegistry, watch } from "./utils/solid.ts"

describe("atom-solid", () => {
  describe("useAtomValue", () => {
    it("reads value from simple Atom", () => {
      const atom = Atom.make(42)
      let observed: number | undefined
      const dispose = renderAtomValue(atom, (value) => {
        observed = value
      })
      assert.strictEqual(observed, 42)
      dispose()
    })

    it("reads value with transform function", () => {
      const atom = Atom.make(42)
      let observed: number | undefined
      const dispose = renderAtomValue(atom, (value) => {
        observed = value
      }, { map: (value) => value * 2 })
      assert.strictEqual(observed, 84)
      dispose()
    })

    it("returns function values without calling them", () => {
      const registry = AtomRegistry.make()
      const first = () => "first"
      const second = () => "second"
      const useSecond = Atom.make(false)
      const atom = Atom.make((get) => get(useSecond) ? second : first)
      let observed: (() => string) | undefined
      const dispose = renderAtomValue(atom, (value) => {
        observed = value
      }, { registry })
      assert.strictEqual(observed, first)
      registry.set(useSecond, true)
      flush()
      assert.strictEqual(observed, second)
      dispose()
    })

    it("works with computed Atom", () => {
      const baseAtom = Atom.make(10)
      const computedAtom = Atom.make((get) => get(baseAtom) * 2)
      let observed: number | undefined
      const dispose = renderAtomValue(computedAtom, (value) => {
        observed = value
      })
      assert.strictEqual(observed, 20)
      dispose()
    })
  })

  describe("useAtom", () => {
    it("updates value with setter", () => {
      const atom = Atom.make(0)
      let observed: number | undefined
      const dispose = createRoot((dispose) => {
        const [value, setValue] = useAtom(() => atom)
        watch(value, (value) => {
          observed = value
        })
        watch(value, (value) => {
          if (value !== 0) {
            return
          }
          setValue(1)
          setValue((current) => current + 1)
        })
        return dispose
      })
      flush()
      assert.strictEqual(observed, 2)
      dispose()
    })
  })

  describe("lifecycle", () => {
    it("releases the previous atom when the atom changes and the current atom on dispose", async () => {
      const registry = AtomRegistry.make()
      const released: Array<string> = []
      const named = (name: string) =>
        Atom.make((get) => {
          get.addFinalizer(() => released.push(name))
          return name
        })
      const first = named("first")
      const second = named("second")
      let observed: Array<string> = []
      let select!: (atom: Atom.Atom<string>) => void
      const dispose = createRoot((dispose) => {
        provideRegistry(registry, () => {
          const [atom, setAtom] = createSignal(first)
          select = (atom) => setAtom(() => atom)
          watch(useAtomValue(atom), (value) => observed.push(value))
          return null
        })
        return dispose
      })
      flush()
      assert.deepStrictEqual(observed, ["first"])

      select(second)
      flush()
      await removals()
      assert.deepStrictEqual(observed, ["first", "second"])
      assert.deepStrictEqual(released, ["first"])

      dispose()
      await removals()
      assert.deepStrictEqual(released, ["first", "second"])
    })

    it("does not notify when the new atom holds an equal value", () => {
      const registry = AtomRegistry.make()
      const first = Atom.make(1)
      const second = Atom.make(1)
      const observed: Array<number> = []
      let select!: (atom: Atom.Atom<number>) => void
      const dispose = createRoot((dispose) => {
        provideRegistry(registry, () => {
          const [atom, setAtom] = createSignal<Atom.Atom<number>>(first)
          select = (atom) => setAtom(() => atom)
          watch(useAtomValue(atom), (value) => observed.push(value))
          return null
        })
        return dispose
      })
      flush()
      select(second)
      flush()
      registry.set(second, 2)
      flush()
      assert.deepStrictEqual(observed, [1, 2])
      dispose()
    })

    it("returns Promise values without awaiting them", async () => {
      const promise = Promise.resolve(42)
      const atom = Atom.make(() => promise)
      const observed: Array<Promise<number>> = []
      let value!: Accessor<Promise<number>>
      const dispose = createRoot((dispose) => {
        value = useAtomValue(() => atom)
        // Solid 2 effects await a Promise returned from their compute phase.
        watch(() => [value()] as const, ([value]) => observed.push(value))
        return dispose
      })
      flush()
      await promise
      await removals()
      flush()
      assert.strictEqual(value(), promise)
      assert.strictEqual(observed.length, 1)
      assert.strictEqual(observed[0], promise)
      dispose()
    })

    it("useAtomMount and useAtomSubscribe release on dispose", async () => {
      const registry = AtomRegistry.make()
      let released = false
      const mounted = Atom.make((get) => {
        get.addFinalizer(() => {
          released = true
        })
        return 0
      })
      const counter = Atom.make(0)
      const notified: Array<number> = []
      const dispose = createRoot((dispose) => {
        provideRegistry(registry, () => {
          useAtomMount(() => mounted)
          useAtomSubscribe(() => counter, (value) => notified.push(value))
          return null
        })
        return dispose
      })
      flush()
      registry.set(counter, 1)
      await removals()
      assert.isFalse(released)
      assert.deepStrictEqual(notified, [1])

      dispose()
      registry.set(counter, 2)
      await removals()
      assert.isTrue(released)
      assert.deepStrictEqual(notified, [1])
    })
  })

  describe("useAtomInitialValues", () => {
    it("applies initial values once per registry", () => {
      const registry = AtomRegistry.make()
      const atom = Atom.make(0)
      createRoot((dispose) => {
        provideRegistry(registry, () => {
          useAtomInitialValues([[atom, 1]])
          useAtomInitialValues([[atom, 2]])
          assert.strictEqual(registry.get(atom), 1)
          return null
        })
        return dispose
      })
    })
  })

  describe("AtomRef", () => {
    it("returns function values without calling them", () => {
      const first = () => "first"
      const second = () => "second"
      const ref = AtomRef.make(first)
      let observed: (() => string) | undefined
      const dispose = renderAtomRef(ref, (value) => {
        observed = value
      })
      assert.strictEqual(observed, first)
      ref.set(second)
      flush()
      assert.strictEqual(observed, second)
      dispose()
    })

    it("updates when AtomRef prop changes", () => {
      const ref = AtomRef.make({ count: 0, label: "a" })
      const propRef = useAtomRefProp(() => ref, "count")
      let observed: number | undefined
      const dispose = renderAtomRef(propRef(), (value) => {
        observed = value
      })
      assert.strictEqual(observed, 0)
      ref.set({ count: 1, label: "a" })
      flush()
      assert.strictEqual(observed, 1)
      dispose()
    })

    it("updates when AtomRef prop value changes", () => {
      const ref = AtomRef.make({ count: 0, label: "a" })
      let observed: number | undefined
      const dispose = renderAccessor(() => useAtomRefPropValue(() => ref, "count"), (value) => {
        observed = value
      })
      assert.strictEqual(observed, 0)
      ref.set({ count: 2, label: "a" })
      flush()
      assert.strictEqual(observed, 2)
      dispose()
    })
  })

  describe("useAtomResource", () => {
    it.skipIf(!isSolid2)("is unavailable on Solid 2", () => {
      const atom = Atom.make(AsyncResult.initial<number, Error>())
      assert.throws(() => renderAtomResource(() => atom), /requires Solid 1/)
    })

    it.skipIf(isSolid2)("suspends on Initial result", () => {
      const atom = Atom.make(AsyncResult.initial<number, Error>())
      const { resource, dispose } = renderAtomResource(() => atom)
      assert.strictEqual(resource.loading, true)
      assert.strictEqual(resource(), undefined)
      dispose()
    })
  })

  //
  //   it("suspends on waiting when suspendOnWaiting is true", () => {
  //     const atom = Atom.make(AsyncResult.success(1, { waiting: true }))
  //     const { resource, dispose } = renderAtomResource(atom, { suspendOnWaiting: true })
  //     assert.strictEqual(resource.loading, true)
  //     assert.strictEqual(resource(), undefined)
  //     dispose()
  //   })
  //
  //   it("returns success value by default", async () => {
  //     const atom = Atom.make(AsyncResult.success(5, { waiting: true }))
  //     const { resource, dispose } = renderAtomResource(atom)
  //     await Promise.resolve()
  //     await Promise.resolve()
  //     assert.strictEqual(resource.loading, false)
  //     assert.strictEqual(resource(), 5)
  //     dispose()
  //   })
  //
  //   it("surfaces failure via Cause.squash", async () => {
  //     const error = new Error("boom")
  //     const atom = Atom.make(AsyncResult.fail(error))
  //     let resource: ReturnType<typeof useAtomResource>[0] | undefined
  //     let caught: unknown
  //     const dispose = createRoot((dispose) => {
  //       catchError(() => {
  //         ;[resource] = useAtomResource(atom)
  //         createEffect(() => {
  //           resource?.()
  //         })
  //       }, (err) => {
  //         caught = err
  //       })
  //       return dispose
  //     })
  //     await Promise.resolve()
  //     await Promise.resolve()
  //     assert.ok(caught instanceof Error)
  //     assert.strictEqual(caught.message, "boom")
  //     assert.strictEqual(resource?.error, caught)
  //     assert.strictEqual(resource?.loading, false)
  //     dispose()
  //   })
  //
  //   it("preserves success result when preserveResult is true", async () => {
  //     const atom = Atom.make(Effect.succeed(7))
  //     const { resource, dispose } = renderAtomResource(atom, { preserveResult: true })
  //     await Promise.resolve()
  //     await Promise.resolve()
  //     const result = resource()!
  //     assert.strictEqual(AsyncResult.isSuccess(result), true)
  //     if (AsyncResult.isSuccess(result)) {
  //       assert.strictEqual(result.value, 7)
  //     }
  //     assert.strictEqual(resource.error, undefined)
  //     dispose()
  //   })
  //
  //   it("preserves failure result when preserveResult is true", async () => {
  //     const error = new Error("failure")
  //     const atom = Atom.make(Effect.fail(error))
  //     const { resource, dispose } = renderAtomResource(atom, { preserveResult: true })
  //     await Promise.resolve()
  //     await Promise.resolve()
  //     const result = resource()!
  //     assert.strictEqual(AsyncResult.isFailure(result), true)
  //     if (AsyncResult.isFailure(result)) {
  //       const squashed = Cause.squash(result.cause)
  //       assert.ok(squashed instanceof Error)
  //       assert.strictEqual(squashed.message, "failure")
  //     }
  //     assert.strictEqual(resource.error, undefined)
  //     dispose()
  //   })
  // })
})

const render = (f: (dispose: () => void) => () => void) => {
  const dispose = createRoot(f)
  flush()
  return dispose
}

const renderAtomRef = function<A>(ref: AtomRef.ReadonlyRef<A>, onValue: (_: A) => void) {
  return render((dispose) => {
    watch(useAtomRef(() => ref), onValue)
    return dispose
  })
}

const renderAccessor = function<A>(makeAccessor: () => Accessor<A>, onValue: (_: A) => void) {
  return render((dispose) => {
    watch(makeAccessor(), onValue)
    return dispose
  })
}

const renderAtomValue = function<A, B = A>(
  atom: Atom.Atom<A>,
  onValue: (_: B) => void,
  options?: { readonly registry?: AtomRegistry.AtomRegistry; readonly map?: (_: A) => B }
) {
  return render((dispose) => {
    const run = () => {
      const accessor = options?.map ? useAtomValue(() => atom, options.map) : useAtomValue(() => atom)
      watch(accessor as Accessor<B>, onValue)
      return null
    }

    if (options?.registry) {
      provideRegistry(options.registry, run)
    } else {
      run()
    }

    return dispose
  })
}

const renderAtomResource = function<A, E>(
  atom: () => Atom.Atom<AsyncResult.AsyncResult<A, E>>,
  options?: {
    readonly suspendOnWaiting?: boolean | undefined
  }
) {
  let resource:
    | Resource<A>
    | undefined
  const dispose = createRoot((dispose) => {
    ;[resource] = useAtomResource(atom, options)
    watch(resource!, () => {})
    return dispose
  })
  return { resource: resource!, dispose }
}

// Atom removal is scheduled on the registry's task queue.
const removals = () => new Promise((resolve) => setTimeout(resolve, 0))
