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
import * as Layer from "effect/Layer"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import { callSite } from "./CallSite.ts"
import * as Property from "./internal/property.ts"
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

export type { PropertyGenerator, PropertyInput, PropertyOptions, PropertyValue } from "./internal/property.ts"

/**
 * A property test: `body` must pass for every value generated from `input`, an Arbitrary
 * (`effect/Arbitrary`), a Schema, or a tuple or struct of those.
 *
 *   Test.property("a user survives a JSON round trip", User, (user) => {
 *     Assert.equal(decode(encode(user)), user)
 *   })
 *
 * - The body makes assertions, or returns `false`, fails, dies or rejects: every way of failing
 *   falsifies the property, and the failing value is shrunk to a smallest one.
 * - The test fails once, located at the failing assertion, with the counterexample as data (the
 *   shrunk input, the first failing input, runs, shrinks, and a replay token).
 * - Values come from the test's seeded `Random`, so `--seed` reproduces a failing run; the
 *   `replay` option re-runs exactly the shrunk case. Each value gets a fresh TestClock.
 * - Options: `runs`, `size`, `maxDiscards`, `maxShrinks`, `replay`, `label`, and the usual test
 *   options. A fixture per value is `Effect.provide(Layer.fresh(layer))` inside the body.
 */
export const property = <const I extends Property.PropertyInput, E = never, R = never>(
  name: string,
  input: I,
  body: (
    value: Property.PropertyValue<I>
  ) => void | boolean | PromiseLike<void | boolean> | Effect.Effect<void | boolean, E, R>,
  options?: Property.PropertyOptions & Options
): TestNode<Exclude<R, Scope.Scope>> => {
  const { label, maxDiscards, maxShrinks, replay, runs, size, ...rest } = options ?? {}
  return test(name, Property.check(input, body, { label, maxDiscards, maxShrinks, replay, runs, size }), rest)
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

/** A whole number, at least `minimum`. */
const Count = (minimum: number) => Schema.Int.check(Schema.isGreaterThanOrEqualTo(minimum))

/** A duration as written in a config: a `Duration`, milliseconds, or a string such as `"30 seconds"`. */
const DurationInput = Schema.Union([Schema.Duration, Schema.DurationFromMillis, Schema.DurationFromString])

const SharedLayer = Schema.declare(
  (u): u is Layer.Layer<never, unknown, never> => Layer.isLayer(u),
  { expected: "a Layer" }
)

/**
 * The test config: the default export of `etest.config.ts`, decoded with this Schema wherever
 * it is loaded (`decodeConfig`). Its directory is a project's root, and a test file belongs to
 * the nearest one above it (its ids are relative to that root). The outermost one, up to the
 * repository root, is the workspace root: it alone sets `workers`, and its `defaults` and
 * `shared` layers apply to every project. Every key is optional, and an unknown key is an error.
 */
export const Config = Schema.Struct({
  /**
   * Where this project's `*.test.ts` files are when it is searched without paths (default: all of
   * it), relative to its root. Paths given on the command line replace these.
   */
  paths: Schema.optionalKey(Schema.Array(Schema.String)),
  /**
   * Glob patterns of files and directories to skip while searching this project's directories.
   * They are matched against paths relative to its root: `*` matches within a path segment, `**`
   * across segments (so a pattern of `**`, `/fixtures/`, `**` skips every `fixtures` directory).
   * `node_modules` and dot-directories are always skipped. A file named on the command line
   * is never excluded.
   */
  exclude: Schema.optionalKey(Schema.Array(Schema.String)),
  /**
   * How many executors (worker threads) a run uses, unless the run says otherwise (`etest
   * --workers`; default 2). Only in the workspace root's config: a nested project's config that
   * sets it is an error.
   */
  workers: Schema.optionalKey(Count(1)),
  /**
   * Defaults for test options, for every test in the project. An option set on a suite or
   * test wins (the nearest one); then this config's value, then the workspace root's config's
   * (one key at a time), then the built-in default (timeout 60 seconds, no retries).
   */
  defaults: Schema.optionalKey(Schema.Struct({
    timeout: Schema.optionalKey(DurationInput),
    retries: Schema.optionalKey(Count(0))
  })),
  /**
   * Layers shared by the run: in the workspace root's config by every project, in a nested
   * project's config by that project's files. Each is built lazily, the first time any file provides
   * that same Layer value, and kept until the run ends. A file that must not share provides
   * `Layer.fresh(layer)` instead. Shared layers only optimise: every test file still provides
   * everything it needs, and passes without the config. They must be self-contained (no
   * requirements): they are built from the run's context, never from the file that happened
   * to ask first.
   */
  shared: Schema.optionalKey(Schema.Array(SharedLayer))
})

/** A test config as written: the argument of `Test.config`. */
export type Config = typeof Config.Encoded

export const config = (config: Config): Config => config

/** Decodes a config module's default export. Every problem is reported, an unknown key included. */
export const decodeConfig = Schema.decodeUnknownEffect(Config, { onExcessProperty: "error", errors: "all" })

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
