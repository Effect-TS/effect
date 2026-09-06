import type { DestroyRef, Signal, ValueEqualityFn } from "@angular/core"
import { createEnvironmentInjector, EnvironmentInjector, runInInjectionContext } from "@angular/core"
import { TestBed } from "@angular/core/testing"
import type {
  AsyncAtomStore,
  AtomComputedOptions,
  AtomExit,
  AtomFailure,
  AtomRegistryOptions,
  AtomResultStatus,
  AtomResultView,
  AtomResultViewOptions,
  AtomSubscribeOptions,
  AtomSuccess,
  AtomValue,
  AtomWriteValue,
  ReadableAtomStore,
  RegistryOptions,
  ResultAtomStore,
  WritableAtomStore
} from "@effect/atom-angular"
import {
  ATOM_REGISTRY,
  ATOM_RESULT_STATUS,
  atomMatchResult,
  injectAtomComputed,
  injectAtomMount,
  injectAtomRef,
  injectAtomRefresh,
  injectAtomRegistry,
  injectAtomSet,
  injectAtomSetExit,
  injectAtomSetPromise,
  injectAtomSubscribe,
  injectAtomUpdate,
  injectAtomValue,
  injectDestroyRef,
  injectMakeAtom,
  injectRegistryOptions,
  provideAtomRegistry,
  REGISTRY_OPTIONS
} from "@effect/atom-angular"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import { Atom, AtomRef } from "effect/unstable/reactivity"
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult"
import { describe, expect, expectTypeOf, it, vi } from "vitest"

/** Runs `f` in a child injection context that can be destroyed independently. */
const scoped = <A>(f: () => A): readonly [value: A, destroy: () => void] => {
  const injector = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector))
  return [runInInjectionContext(injector, f), () => injector.destroy()] as const
}

/**
 * Compile-time contract for the store type derived by `injectMakeAtom`.
 *
 * `tsc` is the assertion engine here, not the runner: a regression surfaces as
 * a build failure. Negative cases use `@ts-expect-error`, which fails the build
 * if the line it guards ever stops erroring. Every assertion therefore lives in
 * a function that is declared but never invoked — the guarded lines must be
 * type-checked without ever executing.
 */

const readOnlyAtom = Atom.make(() => 1)
const valueAtom = Atom.make(2)
const resultAtom = Atom.fn((n: number) => Effect.succeed(n > 0))
const failingAtom = Atom.fn((n: number) => n > 0 ? Effect.succeed(n) : Effect.fail("negative" as const))
const readOnlyResultAtom = Atom.make(Effect.succeed(1))
const readWriteAtom = Atom.writable<number, string>(
  () => 0,
  () => {}
)

type StoreOf<A extends Atom.Atom<any>> = ReturnType<typeof injectMakeAtom<A>>

// A read-only atom exposes the readable surface and nothing else
const _readOnlyContract = (store: StoreOf<typeof readOnlyAtom>) => {
  expectTypeOf<StoreOf<typeof readOnlyAtom>>().toEqualTypeOf<ReadableAtomStore<number>>()
  expectTypeOf(store.value()).toEqualTypeOf<Signal<number>>()
  expectTypeOf(store.computed((n) => `${n}`)).toEqualTypeOf<Signal<string>>()
  // Refreshing and mounting are read concerns, so they are readable-surface too
  expectTypeOf(store.refresh()).toBeVoid()
  expectTypeOf(store.mount()).toBeVoid()
  expectTypeOf(store.subscribe).parameter(0).toEqualTypeOf<(value: number) => void>()
  expectTypeOf(store.subscribe((n) => void n)).toBeVoid()

  // @ts-expect-error a read-only atom has no `set`
  store.set(1)
  // @ts-expect-error a read-only atom has no `update`
  store.update((n: number) => n + 1)
  // @ts-expect-error a read-only atom has no `setPromise`
  store.setPromise(1)
  // @ts-expect-error a read-only atom has no `setExit`
  store.setExit(1)
}

// The exposed registry allows reads and subscriptions but no writes or disposal
const _registryViewContract = (store: StoreOf<typeof valueAtom>) => {
  expectTypeOf(store.registry.get(valueAtom)).toEqualTypeOf<number>()
  expectTypeOf(store.registry.subscribe).toBeFunction()
  expectTypeOf(store.registry.refresh).toBeFunction()

  // @ts-expect-error lifetime belongs to the registry owner
  store.registry.dispose()
  // @ts-expect-error lifetime belongs to the registry owner
  store.registry.reset()
  // @ts-expect-error writes go through the store so they stay typed
  store.registry.set(valueAtom, 1)
  // @ts-expect-error writes go through the store so they stay typed
  store.registry.update(valueAtom, (n: number) => n + 1)
  // @ts-expect-error writes go through the store so they stay typed
  store.registry.modify(valueAtom, (n: number) => [n, n + 1])
}

// A writable non-Result atom gains the write surface but no async surface
const _writableValueContract = (store: StoreOf<typeof valueAtom>) => {
  expectTypeOf<StoreOf<typeof valueAtom>>().toEqualTypeOf<WritableAtomStore<number, number>>()
  expectTypeOf(store.value()).toEqualTypeOf<Signal<number>>()
  expectTypeOf(store.set).parameter(0).toEqualTypeOf<number>()
  expectTypeOf(store.update).parameter(0).toEqualTypeOf<(current: number) => number>()

  // @ts-expect-error a non-Result atom has no `setPromise`
  store.setPromise(1)
  // @ts-expect-error a non-Result atom has no `setExit`
  store.setExit(1)
  // @ts-expect-error the written value must match W
  store.set("nope")
}

// A writable Result atom gains the async surface with both channels typed
const _asyncContract = (store: StoreOf<typeof resultAtom>) => {
  expectTypeOf<StoreOf<typeof resultAtom>>().toExtend<
    AsyncAtomStore<AsyncResult.AsyncResult<boolean, never>, number>
  >()
  expectTypeOf(store.value()).toEqualTypeOf<Signal<AsyncResult.AsyncResult<boolean, never>>>()
  expectTypeOf(store.setPromise(1)).toEqualTypeOf<Promise<boolean>>()
  expectTypeOf(store.setExit(1)).toEqualTypeOf<Promise<Exit.Exit<boolean, never>>>()
}

// The failure channel survives into `setExit` and is flattened away by `setPromise`
const _errorChannelContract = (store: StoreOf<typeof failingAtom>) => {
  expectTypeOf(store.setPromise(1)).toEqualTypeOf<Promise<number>>()
  expectTypeOf(store.setExit(1)).toEqualTypeOf<Promise<Exit.Exit<number, "negative">>>()
}

// Read and write types stay distinct when the atom separates them
const _readWriteContract = (store: StoreOf<typeof readWriteAtom>) => {
  expectTypeOf(store.value()).toEqualTypeOf<Signal<number>>()
  expectTypeOf(store.set).parameter(0).toEqualTypeOf<string>()
  expectTypeOf(store.update).parameter(0).toEqualTypeOf<(current: number) => string>()

  // @ts-expect-error `set` takes W, not R
  store.set(1)
}

// `computed` widens to any type the transform returns
const _computedContract = (store: StoreOf<typeof valueAtom>) => {
  expectTypeOf(store.computed((n) => n > 1)).toEqualTypeOf<Signal<boolean>>()
  expectTypeOf(store.computed((n) => ({ n }))).toEqualTypeOf<Signal<{ n: number }>>()
  expectTypeOf(store.computed).parameter(0).parameter(0).toEqualTypeOf<number>()
}

/**
 * The equality bag is typed by what the transform returns, not by the atom's
 * own value — the comparator never sees the upstream type.
 */
const _computedEqualContract = (store: StoreOf<typeof valueAtom>) => {
  expectTypeOf<AtomComputedOptions<string>>().toEqualTypeOf<{
    readonly equal?: ValueEqualityFn<string>
  }>()

  expectTypeOf(store.computed((n) => ({ n }), { equal: (a, b) => a.n === b.n })).toEqualTypeOf<
    Signal<{ n: number }>
  >()

  expectTypeOf(
    injectAtomComputed(valueAtom, (n) => `${n}`, { equal: (a, b) => a === b })
  ).toEqualTypeOf<Signal<string>>()

  // @ts-expect-error the comparator takes the projection, not the atom's value
  store.computed((n) => `${n}`, { equal: (a: number, b: number) => a === b })
  // @ts-expect-error the only option is `equal`
  store.computed((n) => `${n}`, { equals: (a: string, b: string) => a === b })
}

// The exported value helpers resolve independently of the store type
const _helperContract = () => {
  expectTypeOf<AtomValue<Atom.Atom<number>>>().toEqualTypeOf<number>()
  expectTypeOf<AtomValue<Atom.Writable<number, string>>>().toEqualTypeOf<number>()
  expectTypeOf<AtomWriteValue<Atom.Writable<number, string>>>().toEqualTypeOf<string>()
  expectTypeOf<AtomWriteValue<Atom.Atom<number>>>().toEqualTypeOf<never>()
}

/**
 * The Result-channel aliases, asserted by name. `setExit`/`setPromise` cover
 * them structurally, but only here does a rename or a dropped export fail with
 * a message that names the type.
 */
const _channelAliasContract = () => {
  expectTypeOf<AtomSuccess<AsyncResult.AsyncResult<number, "negative">>>().toEqualTypeOf<number>()
  expectTypeOf<AtomFailure<AsyncResult.AsyncResult<number, "negative">>>().toEqualTypeOf<"negative">()
  expectTypeOf<AtomExit<AsyncResult.AsyncResult<number, "negative">>>().toEqualTypeOf<
    Exit.Exit<number, "negative">
  >()

  // Off the Result path they collapse rather than leaking `unknown`
  expectTypeOf<AtomSuccess<number>>().toEqualTypeOf<never>()
  expectTypeOf<AtomFailure<number>>().toEqualTypeOf<never>()

  /**
   * Guarded, so a union of Results is matched once as a whole and `infer`
   * collects both channels — not distributed into a union of two aliases.
   */
  expectTypeOf<
    AtomSuccess<AsyncResult.AsyncResult<number, never> | AsyncResult.AsyncResult<string, never>>
  >().toEqualTypeOf<number | string>()
}

/**
 * `ATOM_RESULT_STATUS` must stay the exact set of tags `AtomResultView` is
 * discriminated by — a tag added to one and not the other is the failure the
 * constant exists to prevent.
 */
const _statusConstantContract = () => {
  // Each member is its own literal, not the widened union
  expectTypeOf(ATOM_RESULT_STATUS.INITIAL).toEqualTypeOf<"initial">()
  expectTypeOf(ATOM_RESULT_STATUS.SUCCESS).toEqualTypeOf<"success">()
  expectTypeOf(ATOM_RESULT_STATUS.FAILURE).toEqualTypeOf<"failure">()

  /**
   * Spelled out rather than derived. `AtomResultStatus` *is*
   * `(typeof ATOM_RESULT_STATUS)[keyof typeof ATOM_RESULT_STATUS]`, and
   * `AtomResultView` is tagged from the same constant, so asserting either
   * against the other compares a type to itself and holds for any tag set.
   * Only an independent spelling fails when a tag is renamed, added or dropped.
   */
  expectTypeOf<AtomResultStatus>().toEqualTypeOf<"initial" | "success" | "failure">()
  expectTypeOf<AtomResultView<number, string>["status"]>().toEqualTypeOf<
    "initial" | "success" | "failure"
  >()

  // @ts-expect-error the table is closed
  expectTypeOf(ATOM_RESULT_STATUS.PENDING)
}

/**
 * Both options aliases are derived from upstream, so this pins the shape they
 * currently resolve to — an upstream change surfaces here rather than silently
 * widening the store surface.
 */
const _registryOptionsContract = () => {
  expectTypeOf<AtomSubscribeOptions>().toEqualTypeOf<{ readonly immediate?: boolean }>()
  expectTypeOf<Parameters<ReadableAtomStore<number>["subscribe"]>[1]>().toEqualTypeOf<
    AtomSubscribeOptions | undefined
  >()
  expectTypeOf<AtomRegistryOptions>().toEqualTypeOf<{ readonly registry?: RegistryOptions }>()
  expectTypeOf<Parameters<typeof injectMakeAtom<typeof valueAtom>>[1]>().toEqualTypeOf<
    AtomRegistryOptions | undefined
  >()
}

// Options cover the registry only — there is no injectable to scope any more
const _optionsContract = () => {
  expectTypeOf(injectMakeAtom(valueAtom, { registry: {} })).toEqualTypeOf<
    WritableAtomStore<number, number>
  >()

  // @ts-expect-error the functional form has no `providedIn`
  injectMakeAtom(valueAtom, { providedIn: "root" })
}

// The granular helpers each constrain the atom to what they can do with it
const _granularContract = () => {
  expectTypeOf(injectAtomValue(readOnlyAtom)).toEqualTypeOf<Signal<number>>()
  expectTypeOf(injectAtomComputed(valueAtom, (n) => `${n}`)).toEqualTypeOf<Signal<string>>()
  expectTypeOf(injectAtomSet(readWriteAtom)).parameter(0).toEqualTypeOf<string>()
  expectTypeOf(injectAtomUpdate(readWriteAtom))
    .parameter(0)
    .toEqualTypeOf<(current: number) => string>()
  expectTypeOf(injectAtomSetPromise(failingAtom)).returns.toEqualTypeOf<Promise<number>>()
  expectTypeOf(injectAtomSetExit(failingAtom)).returns.toEqualTypeOf<
    Promise<Exit.Exit<number, "negative">>
  >()

  // @ts-expect-error a read-only atom cannot be written
  injectAtomSet(readOnlyAtom)
  // @ts-expect-error the async setters need a Result-shaped atom
  injectAtomSetPromise(valueAtom)
  // @ts-expect-error the async setters need a Result-shaped atom
  injectAtomSetExit(valueAtom)
}

// The helpers that return nothing, and the ref reader that touches no registry
const _voidHelperContract = () => {
  expectTypeOf(injectDestroyRef()).toEqualTypeOf<DestroyRef>()
  expectTypeOf(injectAtomMount(readOnlyAtom)).toBeVoid()
  expectTypeOf(injectAtomSubscribe(readOnlyAtom, (n) => void n)).toBeVoid()
  expectTypeOf(injectAtomSubscribe<number>)
    .parameter(1)
    .toEqualTypeOf<(value: number) => void>()
  expectTypeOf(injectAtomRefresh(readOnlyAtom)).toEqualTypeOf<() => void>()

  // A ref is read off the ref itself, so it takes no atom and no registry
  expectTypeOf(injectAtomRef(AtomRef.make(1))).toEqualTypeOf<Signal<number>>()

  // @ts-expect-error a ref is not an atom
  injectAtomRef(readOnlyAtom)
  // @ts-expect-error an atom is not a ref
  injectAtomValue(AtomRef.make(1))
}

/**
 * The view keeps the atom's own success and failure types when no transform is
 * given, and takes them from the transforms when they are.
 */
const _matchResultContract = (store: StoreOf<typeof failingAtom>) => {
  expectTypeOf(atomMatchResult(store)).toEqualTypeOf<Signal<AtomResultView<number, string>>>()

  expectTypeOf(
    atomMatchResult(store, {
      transformSuccess: (value) => `#${value}`,
      transformFailure: (cause) => Cause.squash(cause)
    })
  ).toEqualTypeOf<Signal<AtomResultView<string, unknown>>>()

  // Each transform sees the atom's own channel, not `unknown`
  expectTypeOf(atomMatchResult<AsyncResult.AsyncResult<number, "negative">>)
    .parameter(1)
    .toExtend<{ transformSuccess?: (value: number) => unknown } | undefined>()

  /**
   * The generic branch alias must stay a plain literal union: an intersection
   * would still assign, but would narrow and print worse.
   */
  expectTypeOf<Extract<AtomResultView<number, string>, { status: "success" }>>().toEqualTypeOf<{
    readonly status: "success"
    readonly waiting: boolean
    readonly value: number
    readonly error: null
  }>()

  // The tag is what narrows: no non-null assertion needed to read `value`
  const view = atomMatchResult(store)()
  if (view.status === "success") expectTypeOf(view.value).toEqualTypeOf<number>()
  if (view.status === "failure") expectTypeOf(view.error).toEqualTypeOf<string>()
  if (view.status === "initial") expectTypeOf(view.value).toEqualTypeOf<null>()

  // @ts-expect-error the view needs a Result-shaped store
  atomMatchResult(_nonResultStore)
  // @ts-expect-error the transform must accept the atom's success type
  atomMatchResult(store, { transformSuccess: (value: string) => value })

  /**
   * The comparator sees the finished view, with `S` and `F` already decided by
   * the transforms in the same bag — not the atom's own channels.
   */
  expectTypeOf<AtomResultViewOptions<AsyncResult.AsyncResult<number, "negative">, boolean, string>>()
    .toHaveProperty("equal")
    .toEqualTypeOf<ValueEqualityFn<AtomResultView<boolean, string>> | undefined>()

  expectTypeOf(
    atomMatchResult(store, {
      transformSuccess: (value) => value > 1,
      equal: (a, b) => a.value === b.value
    })
  ).toEqualTypeOf<Signal<AtomResultView<boolean, string>>>()

  // @ts-expect-error the comparator takes the view, not the success payload
  atomMatchResult(store, { equal: (a: number, b: number) => a === b })
}

/**
 * `matchResult` follows Result-shapedness, not writability: a read-only query
 * atom keeps it, a writable non-Result atom never had it.
 */
const _storeMatchResultContract = (store: StoreOf<typeof failingAtom>) => {
  expectTypeOf(store.matchResult()).toEqualTypeOf<Signal<AtomResultView<number, string>>>()
  expectTypeOf(store.matchResult({ transformSuccess: (value) => value > 1 })).toEqualTypeOf<
    Signal<AtomResultView<boolean, string>>
  >()

  // The comparator rides in the same bag, and does not disturb the inference
  expectTypeOf(
    store.matchResult({
      transformSuccess: (value) => value > 1,
      equal: (a, b) => a.status === b.status
    })
  ).toEqualTypeOf<Signal<AtomResultView<boolean, string>>>()

  // The same member on a read-only Result atom
  expectTypeOf<StoreOf<typeof readOnlyResultAtom>>().toExtend<
    ResultAtomStore<AsyncResult.AsyncResult<number, never>>
  >()

  // @ts-expect-error a writable non-Result atom has no `matchResult`
  _nonResultStore.matchResult()
  // @ts-expect-error a plain read-only atom has no `matchResult` either
  _plainReadOnlyStore.matchResult()
}

declare const _plainReadOnlyStore: StoreOf<typeof readOnlyAtom>

declare const _nonResultStore: StoreOf<typeof valueAtom>

describe("atom-angular", () => {
  describe("registry wiring", () => {
    it("hands every injection in the scope the same registry", () => {
      const registry = TestBed.inject(ATOM_REGISTRY)

      expect(TestBed.runInInjectionContext(() => injectAtomRegistry())).toBe(registry)
    })

    it("gives a child injector a registry of its own", () => {
      const countAtom = Atom.make(0)
      const parent = TestBed.inject(ATOM_REGISTRY)

      const injector = createEnvironmentInjector(
        [provideAtomRegistry()],
        TestBed.inject(EnvironmentInjector)
      )
      const child = injector.get(ATOM_REGISTRY)

      expect(child).not.toBe(parent)

      // Two registries are two copies of the same atom, so the write stays put
      child.set(countAtom, 1)
      expect(parent.get(countAtom)).toBe(0)

      injector.destroy()
    })

    it("seeds the scope registry from the options it was provided with", () => {
      const countAtom = Atom.make(0)

      TestBed.configureTestingModule({
        providers: [provideAtomRegistry({ initialValues: [[countAtom, 10]] })]
      })

      expect(TestBed.runInInjectionContext(() => injectAtomValue(countAtom))()).toBe(10)
    })

    it("reads back the options of the scope, and null when none were provided", () => {
      expect(TestBed.runInInjectionContext(() => injectRegistryOptions())).toBeNull()

      const options: RegistryOptions = { defaultIdleTTL: 500 }
      const injector = createEnvironmentInjector(
        [provideAtomRegistry(options)],
        TestBed.inject(EnvironmentInjector)
      )

      expect(runInInjectionContext(injector, () => injectRegistryOptions())).toEqual(options)

      injector.destroy()
    })

    it("resolves without setup, and reaches a child that provides no registry", () => {
      const countAtom = Atom.make(0)
      const root = TestBed.inject(ATOM_REGISTRY)

      const injector = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector))

      // The token is tree-shakable and providedIn root, so it resolves at the
      // root injector and both scopes read one atom graph
      expect(injector.get(ATOM_REGISTRY)).toBe(root)

      runInInjectionContext(injector, () => injectAtomRegistry()).set(countAtom, 1)
      expect(root.get(countAtom)).toBe(1)

      injector.destroy()
    })

    it("builds the default registry from the REGISTRY_OPTIONS it finds", () => {
      const countAtom = Atom.make(0)

      TestBed.configureTestingModule({
        providers: [{ provide: REGISTRY_OPTIONS, useValue: { initialValues: [[countAtom, 10]] } }]
      })

      expect(TestBed.inject(ATOM_REGISTRY).get(countAtom)).toBe(10)
    })

    it("creates the scope registry once, however often it is injected", () => {
      const injector = createEnvironmentInjector(
        [provideAtomRegistry()],
        TestBed.inject(EnvironmentInjector)
      )

      const registry = injector.get(ATOM_REGISTRY)
      expect(injector.get(ATOM_REGISTRY)).toBe(registry)
      expect(runInInjectionContext(injector, () => injectAtomRegistry())).toBe(registry)

      injector.destroy()
    })

    it("provides the options alongside the registry, and defaults them to empty", () => {
      const options: RegistryOptions = { defaultIdleTTL: 500 }
      const configured = createEnvironmentInjector(
        [provideAtomRegistry(options)],
        TestBed.inject(EnvironmentInjector)
      )
      const bare = createEnvironmentInjector(
        [provideAtomRegistry()],
        TestBed.inject(EnvironmentInjector)
      )

      expect(configured.get(REGISTRY_OPTIONS)).toBe(options)
      expect(bare.get(REGISTRY_OPTIONS)).toEqual({})

      configured.destroy()
      bare.destroy()
    })

    it("ignores the options of the parent scope, even when given none of its own", () => {
      const countAtom = Atom.make(0)

      TestBed.configureTestingModule({
        providers: [{ provide: REGISTRY_OPTIONS, useValue: { initialValues: [[countAtom, 10]] } }]
      })
      const injector = createEnvironmentInjector(
        [provideAtomRegistry()],
        TestBed.inject(EnvironmentInjector)
      )

      // The scope was configured with `{}`, which is an answer, not an absence
      expect(injector.get(ATOM_REGISTRY).get(countAtom)).toBe(0)
      expect(TestBed.inject(ATOM_REGISTRY).get(countAtom)).toBe(10)

      injector.destroy()
    })

    it("prefers its own options over the ones the parent scope was configured with", () => {
      const countAtom = Atom.make(0)

      TestBed.configureTestingModule({
        providers: [{ provide: REGISTRY_OPTIONS, useValue: { initialValues: [[countAtom, 10]] } }]
      })
      const injector = createEnvironmentInjector(
        [provideAtomRegistry({ initialValues: [[countAtom, 20]] })],
        TestBed.inject(EnvironmentInjector)
      )

      expect(injector.get(ATOM_REGISTRY).get(countAtom)).toBe(20)

      injector.destroy()
    })

    it("reads its options once, when the registry is created", () => {
      const countAtom = Atom.make(0)
      const lateAtom = Atom.make(0)
      const initialValues: Array<readonly [Atom.Atom<any>, any]> = [[countAtom, 10]]

      const injector = createEnvironmentInjector(
        [provideAtomRegistry({ initialValues })],
        TestBed.inject(EnvironmentInjector)
      )
      const registry = injector.get(ATOM_REGISTRY)
      initialValues.push([lateAtom, 20])

      expect(injector.get(ATOM_REGISTRY)).toBe(registry)
      expect(registry.get(countAtom)).toBe(10)
      expect(registry.get(lateAtom)).toBe(0)

      injector.destroy()
    })

    it("disposes the scope registry when its injector is destroyed", () => {
      const injector = createEnvironmentInjector(
        [provideAtomRegistry()],
        TestBed.inject(EnvironmentInjector)
      )
      const registry = injector.get(ATOM_REGISTRY)

      injector.destroy()

      expect(() => registry.get(Atom.make(0))).toThrow(/registry is disposed/)
      // The parent owns its own lifetime, and the child's destruction is not it
      expect(TestBed.inject(ATOM_REGISTRY).get(Atom.make(1))).toBe(1)
    })

    it("reads the registry and the options only from an injection context", () => {
      expect(() => injectAtomRegistry()).toThrow()
      expect(() => injectRegistryOptions()).toThrow()
    })
  })

  describe("injectMakeAtom", () => {
    it("joins the registry of its injector scope", () => {
      const countAtom = Atom.make(1)
      const doubledAtom = Atom.make((get) => get(countAtom) * 2)

      const { count, doubled, registry } = TestBed.runInInjectionContext(() => ({
        count: injectMakeAtom(countAtom),
        doubled: injectMakeAtom(doubledAtom),
        registry: injectAtomRegistry()
      }))

      expect(count.registry).toBe(registry)
      expect(doubled.registry).toBe(registry)

      const doubledSignal = doubled.value()
      expect(doubledSignal()).toBe(2)

      count.set(5)
      expect(doubledSignal()).toBe(10)
    })

    it("isolates a store that opts into its own registry", () => {
      const countAtom = Atom.make(1)

      const { isolated, shared } = TestBed.runInInjectionContext(() => ({
        shared: injectMakeAtom(countAtom),
        isolated: injectMakeAtom(countAtom, { registry: {} })
      }))

      expect(shared.registry).not.toBe(isolated.registry)

      isolated.set(9)
      expect(isolated.value()()).toBe(9)
      expect(shared.value()()).toBe(1)
    })

    it("keeps everything it needs from the injector, so methods outlive the context", () => {
      const countAtom = Atom.make(0)

      const store = TestBed.runInInjectionContext(() => injectMakeAtom(countAtom))

      // Neither call is inside an injection context any more
      const value = store.value()
      store.update((n) => n + 3)

      expect(value()).toBe(3)
    })

    it("returns one signal per store, however often value() is called", () => {
      const store = TestBed.runInInjectionContext(() => injectMakeAtom(Atom.make(0)))

      expect(store.value()).toBe(store.value())
    })

    it("derives a projection through the atom graph", () => {
      const store = TestBed.runInInjectionContext(() => injectMakeAtom(Atom.make(2)))

      const label = store.computed((n) => `n=${n}`)
      expect(label()).toBe("n=2")

      store.set(4)
      expect(label()).toBe("n=4")
    })

    it("re-runs the atom read on refresh", () => {
      let reads = 0
      const store = TestBed.runInInjectionContext(() => injectMakeAtom(Atom.make(() => ++reads)))

      const value = store.value()
      expect(value()).toBe(1)

      store.refresh()
      expect(value()).toBe(2)
    })

    it("drops a write on refresh, because the read is what runs again", () => {
      const store = TestBed.runInInjectionContext(() => injectMakeAtom(Atom.make(0)))

      const value = store.value()
      store.set(7)
      expect(value()).toBe(7)

      store.refresh()
      expect(value()).toBe(0)
    })

    it("observes writes, and stops when its injector is destroyed", () => {
      const countAtom = Atom.make(0)
      const seen: Array<number> = []

      const [store, destroy] = scoped(() => injectMakeAtom(countAtom))

      store.subscribe((n) => seen.push(n))

      store.set(1)
      store.set(2)
      expect(seen).toEqual([1, 2])

      /**
       * The registry outlives the child injector, so the writes below still land
       * — what has gone is this store's subscription to them.
       */
      destroy()
      store.set(3)
      expect(seen).toEqual([1, 2])
      expect(TestBed.inject(ATOM_REGISTRY).get(countAtom)).toBe(3)
    })

    it("delivers the current value first when asked to", () => {
      const seen: Array<number> = []
      const store = TestBed.runInInjectionContext(() => injectMakeAtom(Atom.make(7)))

      store.subscribe((n) => seen.push(n), { immediate: true })
      expect(seen).toEqual([7])

      store.set(8)
      expect(seen).toEqual([7, 8])
    })

    it("computes the atom on mount, with no value signal in play", () => {
      let reads = 0
      const store = TestBed.runInInjectionContext(() => injectMakeAtom(Atom.make(() => ++reads)))

      expect(reads).toBe(0)

      store.mount()
      expect(reads).toBe(1)
    })

    it("makes refresh eager, where an unmounted atom waits to be read", () => {
      let mountedReads = 0
      let lazyReads = 0

      const lazyAtom = Atom.make(() => ++lazyReads)

      const { lazy, mounted } = TestBed.runInInjectionContext(() => ({
        mounted: injectMakeAtom(Atom.make(() => ++mountedReads)),
        lazy: injectMakeAtom(lazyAtom)
      }))

      mounted.mount()
      mounted.refresh()
      expect(mountedReads).toBe(2)

      /**
       * Nothing holds the unmounted atom — `value()` would mount it too, so the
       * read goes through the registry — and a refresh only marks it stale, with
       * the recomputation deferred to whoever reads it next.
       */
      expect(lazy.registry.get(lazyAtom)).toBe(1)
      lazy.refresh()
      expect(lazyReads).toBe(1)
      expect(lazy.registry.get(lazyAtom)).toBe(2)
    })

    it("lets computed decide for itself what counts as a change", () => {
      const store = TestBed.runInInjectionContext(() => injectMakeAtom(Atom.make(2)))

      const parity = store.computed((n) => ({ even: n % 2 === 0 }), {
        equal: (a, b) => a.even === b.even
      })

      const first = parity()

      // Same parity: the projection is a new object, but nothing downstream changed
      store.set(4)
      expect(parity()).toBe(first)

      store.set(5)
      expect(parity()).not.toBe(first)
      expect(parity()).toEqual({ even: false })
    })

    // Without an `equal`, every recompute is a new object and so a new notification
    it("defaults computed to reference identity", () => {
      const store = TestBed.runInInjectionContext(() => injectMakeAtom(Atom.make(2)))
      const boxed = store.computed((n) => ({ n }))

      const first = boxed()
      store.set(3)
      expect(boxed()).not.toBe(first)
    })

    it("mounts once, however often mount() is called", () => {
      let reads = 0
      const store = TestBed.runInInjectionContext(() => injectMakeAtom(Atom.make(() => ++reads)))

      store.mount()
      store.mount()
      store.mount()

      expect(reads).toBe(1)
    })

    it("resolves each async write against its own run", async () => {
      const slowDouble = Atom.fn((n: number) => Effect.succeed(n * 2).pipe(Effect.delay("10 millis")))

      const store = TestBed.runInInjectionContext(() => injectMakeAtom(slowDouble))

      // Mount the atom the way a component would, so writes go Waiting-over-Success
      store.value()

      await expect(store.setPromise(1)).resolves.toBe(2)
      await expect(store.setPromise(5)).resolves.toBe(10)
    })

    it("keeps the failure in the Exit channel and rejects from setPromise", async () => {
      const mayFail = Atom.fn((n: number) => n > 0 ? Effect.succeed(n) : Effect.fail("negative" as const))

      const store = TestBed.runInInjectionContext(() => injectMakeAtom(mayFail))

      expect(Exit.isFailure(await store.setExit(-1))).toBe(true)
      await expect(store.setPromise(-1)).rejects.toBe("negative")
    })

    it("rejects writes the store type already hides", () => {
      const readOnly = TestBed.runInInjectionContext(() => injectMakeAtom(Atom.make(() => 1)))
      const plain = TestBed.runInInjectionContext(() => injectMakeAtom(Atom.make(1)))

      /**
       * Both are hidden from the public type and only reachable through an `any`
       * leak — the guards are what turn a silent misbehaviour into a precise
       * error.
       */
      const unsafeReadOnly = readOnly as unknown as { set: (value: number) => void }
      expect(() => unsafeReadOnly.set(2)).toThrow(/read-only atom/)

      const unsafePlain = plain as unknown as { setExit: (value: number) => Promise<unknown> }
      expect(() => unsafePlain.setExit(2)).toThrow(/not Result-shaped/)
    })

    it("applies provideAtomRegistry options to the scope registry", () => {
      // The registry expects a cancel handle back; the task itself runs eagerly here
      const scheduleTask = vi.fn((f: () => void) => {
        f()
        return () => {}
      })

      TestBed.configureTestingModule({ providers: [provideAtomRegistry({ scheduleTask })] })

      const store = TestBed.runInInjectionContext(() => injectMakeAtom(Atom.make(0)))
      const value = store.value()

      store.set(1)
      expect(value()).toBe(1)
      expect(scheduleTask).toHaveBeenCalled()
    })
  })

  describe("granular atom injects", () => {
    it("read, derive, write and refresh over the shared registry", () => {
      const countAtom = Atom.make(1)

      const bound = TestBed.runInInjectionContext(() => ({
        value: injectAtomValue(countAtom),
        doubled: injectAtomComputed(countAtom, (n) => n * 2),
        set: injectAtomSet(countAtom),
        update: injectAtomUpdate(countAtom),
        refresh: injectAtomRefresh(countAtom)
      }))

      expect(bound.value()).toBe(1)
      expect(bound.doubled()).toBe(2)

      bound.set(4)
      expect(bound.value()).toBe(4)
      expect(bound.doubled()).toBe(8)

      bound.update((n) => n + 1)
      expect(bound.value()).toBe(5)

      // A refresh re-runs the atom's read, which for a state atom re-seeds it
      bound.refresh()
      expect(bound.value()).toBe(1)
      expect(bound.doubled()).toBe(2)
    })

    it("stops reading the atom once its injector is destroyed", () => {
      const countAtom = Atom.make(1)

      const [value, destroy] = scoped(() => injectAtomValue(countAtom))
      const registry = TestBed.inject(ATOM_REGISTRY)

      registry.set(countAtom, 2)
      expect(value()).toBe(2)

      destroy()
      registry.set(countAtom, 3)
      expect(value()).toBe(2)
    })

    it("subscribes without materialising a signal", () => {
      const countAtom = Atom.make(0)
      const seen: Array<number> = []

      const set = TestBed.runInInjectionContext(() => {
        injectAtomSubscribe(countAtom, (n) => seen.push(n))
        return injectAtomSet(countAtom)
      })

      set(1)
      set(2)

      expect(seen).toEqual([1, 2])
    })

    it("keeps an atom computing for the lifetime of the injector", () => {
      let reads = 0
      const countAtom = Atom.make(() => ++reads)

      const [, destroy] = scoped(() => injectAtomMount(countAtom))
      const registry = TestBed.inject(ATOM_REGISTRY)

      // Mounting alone computes the atom, with nothing reading it
      expect(reads).toBe(1)

      // A mounted atom recomputes eagerly; once released, it waits to be read
      registry.refresh(countAtom)
      expect(reads).toBe(2)

      destroy()
      registry.refresh(countAtom)
      expect(reads).toBe(2)
    })

    it("reads an AtomRef, and its props, as signals", () => {
      const userRef = AtomRef.make({ name: "ada", age: 36 })
      const nameRef = userRef.prop("name")

      const { name, upper, user } = TestBed.runInInjectionContext(() => ({
        user: injectAtomRef(userRef),
        name: injectAtomRef(nameRef),
        upper: injectAtomRef(nameRef.map((n) => n.toUpperCase()))
      }))

      expect(user()).toEqual({ name: "ada", age: 36 })
      expect(name()).toBe("ada")
      expect(upper()).toBe("ADA")

      userRef.update((u) => ({ ...u, name: "grace" }))
      expect(name()).toBe("grace")
      expect(upper()).toBe("GRACE")
    })

    it("stops following a ref once its injector is destroyed", () => {
      const userRef = AtomRef.make({ name: "ada" })

      const [name, destroy] = scoped(() => injectAtomRef(userRef.prop("name")))

      userRef.update(() => ({ name: "grace" }))
      expect(name()).toBe("grace")

      // The ref keeps changing; the signal is no longer listening
      destroy()
      userRef.update(() => ({ name: "ada" }))
      expect(userRef.value.name).toBe("ada")
      expect(name()).toBe("grace")
    })

    it("awaits a Result-shaped write", async () => {
      const double = Atom.fn((n: number) => Effect.succeed(n * 2))

      const { setPromise } = TestBed.runInInjectionContext(() => {
        injectAtomValue(double)
        return { setPromise: injectAtomSetPromise(double) }
      })

      await expect(setPromise(3)).resolves.toBe(6)
    })

    it("keeps the typed failure when the write is awaited as an Exit", async () => {
      const mayFail = Atom.fn((n: number) => n > 0 ? Effect.succeed(n) : Effect.fail("negative" as const))

      const { setExit } = TestBed.runInInjectionContext(() => {
        injectAtomValue(mayFail)
        return { setExit: injectAtomSetExit(mayFail) }
      })

      expect(await setExit(3)).toStrictEqual(Exit.succeed(3))

      const failed = await setExit(-1)
      expect(Exit.isFailure(failed)).toBe(true)
      expect(Exit.isFailure(failed) && Cause.findErrorOption(failed.cause)).toEqual(Option.some("negative"))
    })

    it("hands back the DestroyRef of the current injector", () => {
      const seen: Array<string> = []

      const [, destroy] = scoped(() => injectDestroyRef().onDestroy(() => seen.push("destroyed")))

      expect(seen).toEqual([])
      destroy()
      expect(seen).toEqual(["destroyed"])
    })
  })

  describe("atomMatchResult", () => {
    const failing = Atom.fn((n: number) => n > 0 ? Effect.succeed(n * 2) : Effect.fail("negative" as const))

    it("tags each Result state and defaults to a pretty-printed cause", async () => {
      const { store, view } = TestBed.runInInjectionContext(() => {
        const store = injectMakeAtom(failing)
        return { store, view: atomMatchResult(store) }
      })

      expect(view()).toEqual({ status: "initial", waiting: false, value: null, error: null })

      await store.setPromise(3)
      expect(view()).toMatchObject({ status: "success", value: 6, error: null })

      await store.setExit(-1)
      const failed = view()
      expect(failed.status).toBe("failure")
      expect(failed.value).toBeNull()
      expect(typeof failed.error).toBe("string")
      expect(failed.error).toContain("negative")
    })

    it("routes each branch through its transform", async () => {
      const { store, view } = TestBed.runInInjectionContext(() => {
        const store = injectMakeAtom(failing)
        return {
          store,
          view: atomMatchResult(store, {
            transformSuccess: (value) => `#${value}`,
            transformFailure: (cause) => Cause.findErrorOption(cause)
          })
        }
      })

      await store.setPromise(4)
      expect(view()).toMatchObject({ status: "success", value: "#8" })

      await store.setExit(-1)
      expect(view().error).toEqual(Option.some("negative"))
    })

    it("is reachable from the store itself, on read-only Result atoms too", async () => {
      const readOnlyResult = Atom.make(Effect.succeed(7))

      const { fromStore, writable } = TestBed.runInInjectionContext(() => ({
        fromStore: injectMakeAtom(readOnlyResult).matchResult(),
        writable: injectMakeAtom(failing)
      }))

      expect(fromStore()).toMatchObject({ status: "success", value: 7 })

      const view = writable.matchResult({ transformSuccess: (value) => `#${value}` })
      await writable.setPromise(3)
      expect(view()).toMatchObject({ status: "success", value: "#6" })
    })

    it("rejects a store over a non-Result atom when the view is bound", () => {
      const plain = TestBed.runInInjectionContext(() => injectMakeAtom(Atom.make(1)))

      // Both routes in: the free function, and the member the store type hides
      expect(() => atomMatchResult(plain as unknown as ReadableAtomStore<AsyncResult.AsyncResult<number, never>>))
        .toThrow(/not Result-shaped/)

      expect(() => (plain as unknown as ResultAtomStore<AsyncResult.AsyncResult<number, never>>).matchResult())
        .toThrow(/not Result-shaped/)
    })

    /**
     * A writable atom holding a `Result` directly, so a write lands in one step
     * with no `waiting` round-trip to churn the view in between. Driving these
     * through `Atom.fn` would emit an intermediate waiting view and make the
     * identity assertions below untestable.
     */
    const resultState = () => Atom.make(AsyncResult.success(1) as AsyncResult.AsyncResult<number, never>)

    const store_equalNotAFunction = () =>
      atomMatchResult(injectMakeAtom(resultState()), {
        equal: "nope" as unknown as (a: unknown, b: unknown) => boolean
      } as never)

    it("keeps the view object when a transform collapses two distinct values", () => {
      const { store, view } = TestBed.runInInjectionContext(() => {
        const store = injectMakeAtom(resultState())
        return { store, view: store.matchResult({ transformSuccess: (value) => value > 0 }) }
      })

      const first = view()
      expect(first).toMatchObject({ status: "success", value: true })

      // A different Result, but the same rendered view — no new object, no notification
      store.set(AsyncResult.success(2))
      expect(view()).toBe(first)
    })

    it("still emits when the collapsed view actually changes", () => {
      const { store, view } = TestBed.runInInjectionContext(() => {
        const store = injectMakeAtom(resultState())
        return { store, view: store.matchResult({ transformSuccess: (value) => value > 0 }) }
      })

      const first = view()

      store.set(AsyncResult.success(-1))
      expect(view()).not.toBe(first)
      expect(view()).toMatchObject({ status: "success", value: false })

      // ...and a change of branch is a change of view, whatever the payload
      const second = view()
      store.set(AsyncResult.initial())
      expect(view()).not.toBe(second)
      expect(view()).toMatchObject({ status: "initial", value: null })
    })

    /**
     * The default comparator is `Equal.equals`, so a transform returning a
     * trait-bearing value dedupes without the caller supplying one.
     *
     * It has to be a *transform* to isolate the comparator: with no transform the
     * view's value is the payload itself, so an `Equal`-equal payload makes the
     * whole `Result` equal and the registry drops it upstream — `Object.is` here
     * would look just as good while proving nothing.
     */
    it("dedupes a projection that carries its own equality", () => {
      const { store, view } = TestBed.runInInjectionContext(() => {
        const store = injectMakeAtom(resultState())
        return { store, view: store.matchResult({ transformSuccess: (n) => Option.some(n % 2) }) }
      })

      const first = view()
      expect(first).toMatchObject({ status: "success", value: Option.some(1) })

      // A different Result, a different Option instance, the same structure
      store.set(AsyncResult.success(3))
      expect(view()).toBe(first)

      store.set(AsyncResult.success(4))
      expect(view()).not.toBe(first)
      expect(view()).toMatchObject({ value: Option.some(0) })
    })

    /**
     * The default comparator is structural, not referential, so a fresh-but-equal
     * payload already dedupes without any help. What a caller comparator adds is
     * the freedom to ignore part of the payload — here a timestamp that changes on
     * every refetch while the rows themselves do not.
     */
    it("lets the caller decide equality, for payloads that differ where it does not matter", () => {
      type Row = { readonly id: number; readonly fetchedAt: number }

      const listState = Atom.make(
        AsyncResult.success([{ id: 1, fetchedAt: 0 }]) as AsyncResult.AsyncResult<ReadonlyArray<Row>, never>
      )

      // A stand-in for the case this exists for: a refetch returning the same rows
      const sameIds = (a: { readonly value: unknown }, b: { readonly value: unknown }): boolean => {
        // Hoisted: narrowing a property access does not survive into the callback
        const left = a.value
        const right = b.value

        if (!Array.isArray(left) || !Array.isArray(right)) return false

        return left.length === right.length && left.every((row, index) => row.id === right[index].id)
      }

      const { byDefault, byIds, store } = TestBed.runInInjectionContext(() => {
        const store = injectMakeAtom(listState)
        return { store, byDefault: store.matchResult(), byIds: store.matchResult({ equal: sameIds }) }
      })

      const defaultFirst = byDefault()
      const idsFirst = byIds()

      // Same rows, a new timestamp — the default sees a change, the comparator does not
      store.set(AsyncResult.success([{ id: 1, fetchedAt: 1 }]))
      expect(byDefault()).not.toBe(defaultFirst)
      expect(byIds()).toBe(idsFirst)

      // A real change still lands on both
      store.set(AsyncResult.success([{ id: 1, fetchedAt: 1 }, { id: 2, fetchedAt: 1 }]))
      expect(byIds()).not.toBe(idsFirst)
      expect(byIds()).toMatchObject({
        status: "success",
        value: [{ id: 1 }, { id: 2 }]
      })
    })

    it("takes the same comparator through the free function", () => {
      const view = TestBed.runInInjectionContext(() =>
        atomMatchResult(injectMakeAtom(resultState()), {
          transformSuccess: (value) => ({ boxed: value }),
          equal: (a, b) => a.value?.boxed === b.value?.boxed
        })
      )

      expect(view()).toMatchObject({ status: "success", value: { boxed: 1 } })
    })

    it("rejects a non-function comparator when the view is bound", () => {
      expect(() =>
        TestBed.runInInjectionContext(() =>
          // Only reachable from an untyped caller, like the transforms
          store_equalNotAFunction()
        )
      ).toThrow(/equal must be a function/)
    })

    it("shares one view between bare calls, and builds a fresh one per transform", () => {
      const store = TestBed.runInInjectionContext(() => injectMakeAtom(resultState()))

      expect(store.matchResult()).toBe(store.matchResult())

      /**
       * Two callers passing different closures want different views, so there is
       * no sound key to memoise on — each call subscribes for itself.
       */
      const transform = { transformSuccess: (value: number) => value }
      expect(store.matchResult(transform)).not.toBe(store.matchResult(transform))
    })

    it("rejects a non-function transform when the view is bound, not on emission", () => {
      expect(() =>
        TestBed.runInInjectionContext(() =>
          atomMatchResult(injectMakeAtom(failing), {
            // Only reachable from an untyped caller
            transformSuccess: "nope" as unknown as (value: number) => string
          })
        )
      ).toThrow(/transformSuccess must be a function/)
    })
  })

  describe("type contract", () => {
    it("is enforced by the compiler, not the runner", () => {
      expect([
        _readOnlyContract,
        _registryViewContract,
        _writableValueContract,
        _asyncContract,
        _errorChannelContract,
        _readWriteContract,
        _computedContract,
        _helperContract,
        _optionsContract,
        _granularContract,
        _matchResultContract,
        _storeMatchResultContract,
        _channelAliasContract,
        _statusConstantContract,
        _registryOptionsContract,
        _voidHelperContract,
        _computedEqualContract
      ]).toHaveLength(17)
    })
  })
})
