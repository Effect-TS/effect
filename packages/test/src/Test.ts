// Authoring API, syntax "B": a test file's `export default` IS its
// tree (a Suite or a single Test). Nothing registers on import. Options and
// fixtures are plain data on the nodes; the coordinator resolves options
// (nearest wins) and the executor acquires fixtures.
//
// Typing: every node carries a phantom `R`, the services its tests still need.
// `Test.suite` unions its children's `R`; `Test.provide(layer)` removes what the
// layer provides and adds what the layer itself needs. A file is runnable when
// its default export is a `Node<never>` (see `Runnable`).
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import type * as Scope from "effect/Scope"
import { callSite } from "./CallSite.ts"
import type { Location } from "./Protocol.ts"

/**
 * A Layer attached with `Test.provide`. Its lifetime is the node it is attached
 * to, exactly like `Effect.provide`: built once for a suite, per attempt for a test.
 */
export interface Fixture {
  readonly name: string
  readonly layer: Layer.Layer<any, any, any>
}

export interface Options {
  readonly timeout?: Duration.Input
  readonly retries?: number
  readonly tags?: ReadonlyArray<string>
  /** `true` or a reason */
  readonly skip?: boolean | string
  readonly only?: boolean
  /** opt out of the "a test must make at least one assertion" rule */
  readonly noAssertions?: boolean
}

export type Body =
  | { readonly _tag: "Effect"; readonly effect: Effect.Effect<unknown, unknown, any> }
  /** a plain function: its result is awaited if it is a Promise */
  | { readonly _tag: "Plain"; readonly run: () => unknown }

/** Phantom, covariant marker for the services a node still requires. */
interface Requires<out R> extends Pipeable {
  readonly "~requires": (_: never) => R // type-only, never set at runtime
  readonly options: Options
  /** fixtures attached to this node, outermost first */
  readonly layers: ReadonlyArray<Fixture>
  readonly location: Location | undefined
}

export interface TestNode<out R = never> extends Requires<R> {
  readonly _tag: "Test"
  readonly name: string
  readonly body: Body
}

export interface SuiteNode<out R = never> extends Requires<R> {
  readonly _tag: "Suite"
  readonly name: string
  readonly children: ReadonlyArray<Node<any>>
}

export type Node<R = never> = TestNode<R> | SuiteNode<R>

/** What a test file must `export default`: a tree with every requirement provided. */
export type Runnable = Node<never>

export type Requirements<N> = N extends { readonly "~requires": (_: never) => infer R } ? R : never

// --- construction (nodes are immutable objects with a `pipe` method)

const Proto = {
  pipe() {
    return pipeArguments(this, arguments)
  }
}
const make = <N>(fields: object): N => Object.assign(Object.create(Proto), fields)
const update = <N extends Node<any>>(node: N, patch: Partial<Node<any>>): N =>
  Object.assign(Object.create(Proto), node, patch)

/**
 * A test. The body is either an Effect (a generator is written as
 * `Effect.gen(function*() {...})`) or a plain function, synchronous or returning
 * a Promise. A plain function that produces an Effect fails the test: the Effect
 * would never run, so pass the Effect itself.
 * Every test runs with TestClock, TestConsole, a seeded Random and its own Scope.
 */
export function test<A, E, R>(
  name: string,
  body: Effect.Effect<A, E, R>,
  options?: Options
): TestNode<Exclude<R, Scope.Scope>>
export function test(name: string, body: () => unknown, options?: Options): TestNode<never>
export function test(name: string, body: any, options: Options = {}): TestNode<any> {
  const node: Body = Effect.isEffect(body) ? { _tag: "Effect", effect: body } : { _tag: "Plain", run: body }
  return make({ _tag: "Test", name, body: node, options, layers: [], location: callSite() })
}

export const suite = <const Children extends ReadonlyArray<Node<any>>>(
  name: string,
  children: Children,
  options: Options = {}
): SuiteNode<Requirements<Children[number]>> =>
  make({ _tag: "Suite", name, children, options, layers: [], location: callSite() })

// --- fixtures

type Provided<N, ROut, RIn> = N extends SuiteNode<infer R> ? SuiteNode<Exclude<R, ROut> | RIn>
  : N extends TestNode<infer R> ? TestNode<Exclude<R, ROut> | RIn>
  : never

/**
 * Provide a Layer to a node, like `Effect.provide`: on a suite it is built once (on
 * first use) and shared by every test below it, and released when the last of them
 * is done; on a test it is built for every attempt.
 *
 * Reuse follows Effect's MemoMap semantics: a Layer value already built further out
 * (an enclosing suite, or a shared layer from the test config) is reused rather than
 * built again. `Layer.fresh(layer)` opts out.
 *
 * As with `Effect.provide`, provide once per node: compose the layers first
 * (`Layer.provide`, `Layer.provideMerge`, `Layer.mergeAll`). Providing at different
 * levels (a suite and a test below it) is how lifetimes are chosen.
 */
export const provide = <ROut, E, RIn>(
  layer: Layer.Layer<ROut, E, RIn>,
  options?: { readonly name?: string }
): <N extends Node<any>>(self: N) => Provided<N, ROut, RIn> => {
  // A Layer has no runtime record of what it provides, so a fixture is labelled by
  // where it was attached (`file:line`) unless the user names it.
  const at = callSite()
  const fixture: Fixture = { name: options?.name ?? (at ? `${at.file}:${at.line}` : "layer"), layer }
  return ((self: Node<any>) =>
    // later `provide`s wrap earlier ones, so they are built first (they may feed them)
    update(self, { layers: [fixture, ...self.layers] })) as any
}

// --- config

/**
 * The test config: the default export of `etest.config.ts`. It only ever
 * optimises: every test file still provides everything it needs.
 */
export interface Config {
  /**
   * Layers shared by the whole run. Each is built lazily, the first time any file
   * provides that same Layer value, and kept until the run ends. A file that must
   * not share provides `Layer.fresh(layer)` instead. Shared layers must be
   * self-contained (no requirements): they are built from the run's context, never
   * from the file that happened to ask first.
   */
  readonly shared?: ReadonlyArray<Layer.Layer<any, any, never>>
}

export const config = <const C extends Config>(config: C): C => config

export const isConfig = (u: unknown): u is Config =>
  typeof u === "object" && u !== null && (!("shared" in u) || Array.isArray((u as Config).shared))

// --- options transformers (pipeable, type-preserving)

export const withOptions = (extra: Options) => <N extends Node<any>>(self: N): N =>
  update(self, {
    options: { ...self.options, ...extra, tags: [...(self.options.tags ?? []), ...(extra.tags ?? [])] }
  })
export const tags = (...tags: Array<string>) => withOptions({ tags })
export const timeout = (timeout: Duration.Input) => withOptions({ timeout })
export const retries = (retries: number) => withOptions({ retries })
export const skip = (reason: string | boolean = true) => withOptions({ skip: reason })
export const only = withOptions({ only: true })
/** This test (or every test below this suite) makes no assertions, on purpose. */
export const noAssertions = withOptions({ noAssertions: true })

export const isNode = (u: unknown): u is Node<unknown> =>
  typeof u === "object" && u !== null && ((u as any)._tag === "Suite" || (u as any)._tag === "Test") &&
  Array.isArray((u as any).layers)

export const toMillis = (d: Duration.Input): number => Duration.toMillis(Duration.fromInputUnsafe(d))
