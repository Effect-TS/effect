// The executor: loads test files, lists their tree, and runs selected
// tests as fibers. It knows nothing about filtering, seeds or reporting; the
// coordinator sends it fully resolved per-test instructions.
import { Cause, Console, Context, Deferred, Effect, Exit, Layer, Option, Queue, Random, Scope, Semaphore, Stream } from "effect"
import * as TestClock from "effect/testing/TestClock"
import * as TestConsole from "effect/testing/TestConsole"
import * as path from "node:path"
import { pathToFileURL } from "node:url"
import { AssertionError, CurrentSink, show, Sink, sinkStorage } from "./Assert.ts"
import { locationFromStack } from "./CallSite.ts"
import type { Failure, ListedNode, RunFileTest, Status, TestFinished } from "./Protocol.ts"
import { LoadError } from "./Protocol.ts"
import type { Fixture, Node, SuiteNode, TestNode } from "./Test.ts"
import { isConfig, isNode, toMillis } from "./Test.ts"

Error.stackTraceLimit = 50

// --- loading

const load = (file: string) =>
  Effect.tryPromise({
    try: () => import(pathToFileURL(file).href),
    catch: (e) => new LoadError({ path: file, message: e instanceof Error ? e.stack ?? e.message : String(e) })
  }).pipe(
    Effect.flatMap((mod): Effect.Effect<SuiteNode<any>, LoadError> => {
      const root = mod.default
      if (!isNode(root)) {
        return Effect.fail(
          new LoadError({ path: file, message: `no tests exported from ${path.relative(process.cwd(), file)}` })
        )
      }
      // a single exported Test gets an anonymous root (omitted from ids)
      return Effect.succeed(
        root._tag === "Suite"
          ? root as SuiteNode<any>
          : { _tag: "Suite", name: "", children: [root], options: {}, layers: [], location: undefined } as any
      )
    })
  )

const childId = (parent: string, node: Node<any>) => node.name === "" ? parent : `${parent} > ${node.name}`

// --- listing (no fixture is acquired, no test body runs)

export const listFile = (file: string) =>
  Effect.map(load(file), (root) => {
    const rel = path.relative(process.cwd(), file)
    const nodes: Array<ListedNode> = []
    const visit = (node: Node<any>, parentId: string | undefined, id: string) => {
      const o = node.options
      nodes.push({
        id,
        ...(parentId !== undefined ? { parent: parentId } : {}),
        kind: node._tag === "Suite" ? "suite" : "test",
        name: parentId === undefined ? (node.name === "" ? rel : `${rel} (${node.name})`) : node.name,
        tags: [...(o.tags ?? [])],
        fixtures: node.layers.map((f) => ({ name: f.name })),
        ...(o.timeout !== undefined ? { timeoutMs: toMillis(o.timeout) } : {}),
        ...(o.retries !== undefined ? { retries: o.retries } : {}),
        ...(o.skip ? { skip: typeof o.skip === "string" ? o.skip : "skipped" } : {}),
        ...(o.only ? { only: true } : {}),
        ...(o.noAssertions ? { noAssertions: true } : {}),
        ...(node.location ? { location: `${node.location.file}:${node.location.line}` } : {})
      })
      if (node._tag === "Suite") for (const c of node.children) visit(c, id, childId(id, c))
    }
    visit(root, undefined, rel)
    return { file: rel, nodes }
  })

// --- running

/** Per-executor state: the run's MemoMap and Scope live as long as the executor. */
export class ExecutorState extends Context.Service<ExecutorState, {
  readonly runMemo: Layer.MemoMap
  readonly shared: ReadonlySet<Layer.Layer<any, any, any>>
}>()("effect/test/ExecutorState") {
  static layer = Layer.effect(ExecutorState)(Effect.gen(function*() {
    const shared = new Set<Layer.Layer<any, any, any>>(yield* loadConfig(process.env.EFFECT_TEST_CONFIG))
    const runScope = yield* Effect.scope
    const runContext = yield* Effect.context<never>()
    return { runMemo: makeRunMemoMap(shared, runScope, runContext), shared }
  }))
}

/** The config's shared layers. The path comes from the coordinator (worker threads inherit env). */
const loadConfig = (file: string | undefined) =>
  file === undefined ? Effect.succeed([]) : Effect.tryPromise({
    try: () => import(pathToFileURL(file).href),
    catch: (e) => new LoadError({ path: file, message: e instanceof Error ? e.stack ?? e.message : String(e) })
  }).pipe(
    Effect.flatMap((mod) =>
      isConfig(mod.default)
        ? Effect.succeed(mod.default.shared ?? [])
        : Effect.fail(new LoadError({ path: file, message: "the config's default export is not a Test.config(...)" }))
    ),
    Effect.orDie
  )

/**
 * The run's MemoMap: the root that every suite's and test's MemoMap forks from.
 * A layer declared as shared in the config is built lazily, the first time any
 * build looks that Layer value up, in the run's Scope and context (detached from
 * the test that asked first, so its timeout or interruption can't abort it). It is
 * kept until the run ends, and a failed build is recorded for the rest of the run.
 * Everything else behaves like a plain MemoMap.
 */
const makeRunMemoMap = (
  shared: ReadonlySet<Layer.Layer<any, any, any>>,
  runScope: Scope.Scope,
  runContext: Context.Context<never>
): Layer.MemoMap => {
  const inner = Layer.makeMemoMapUnsafe()
  const builds = new Map<Layer.Layer<any, any, any>, Deferred.Deferred<Context.Context<any>, unknown>>()
  return {
    "~effect/Layer/MemoMap": "~effect/Layer/MemoMap",
    get: (layer, scope) => {
      if (!shared.has(layer)) return inner.get(layer, scope)
      let deferred = builds.get(layer)
      if (deferred === undefined) {
        const created = Deferred.makeUnsafe<Context.Context<any>, unknown>()
        builds.set(layer, created)
        deferred = created
        return Layer.buildWithMemoMap(layer, inner, runScope).pipe(
          Deferred.into(created),
          Effect.updateContext(() => runContext as Context.Context<any>),
          Effect.forkIn(runScope),
          Effect.andThen(Deferred.await(created))
        ) as any
      }
      return Deferred.await(deferred) as any
    },
    getOrElseMemoize: (layer, scope, build) => inner.getOrElseMemoize(layer, scope, build)
  }
}

/**
 * Builds each key at most once (concurrent tests wait for the first build). The
 * MemoMap alone is not enough: a layer that opts out of memoisation (`Layer.fresh`)
 * would otherwise be rebuilt by every test. A failed build is not cached.
 */
interface Once<K> {
  readonly lock: Semaphore.Semaphore
  readonly built: Map<K, Context.Context<any>>
}
const makeOnce = <K>(): Once<K> => ({ lock: Semaphore.makeUnsafe(1), built: new Map() })
const once = <K, E, R>(self: Once<K>, key: K, build: Effect.Effect<Context.Context<any>, E, R>) =>
  self.lock.withPermits(1)(Effect.suspend(() => {
    const done = self.built.get(key)
    return done ? Effect.succeed(done) : Effect.tap(build, (ctx) => Effect.sync(() => self.built.set(key, ctx)))
  }))

interface Frame {
  readonly memo: Layer.MemoMap
  readonly scope: Scope.Closeable
  /** `Test.provide` layers attached to this suite, built once per Fixture */
  readonly once: Once<Fixture>
}

type Event = { readonly _tag: "TestStarted"; readonly id: string; readonly attempt: number } | TestFinished

const TestEnv = Layer.mergeAll(TestConsole.layer, TestClock.layer())

class FixtureFailure {
  readonly fixture: Fixture
  readonly cause: Cause.Cause<unknown>
  constructor(fixture: Fixture, cause: Cause.Cause<unknown>) {
    this.fixture = fixture
    this.cause = cause
  }
}

export const runFile = (file: string, concurrency: number, tests: ReadonlyArray<RunFileTest>) =>
  Stream.callback<Event, LoadError, ExecutorState>((queue) =>
    Effect.gen(function*() {
      const { runMemo, shared } = yield* ExecutorState
      const root = yield* load(file)
      const rel = path.relative(process.cwd(), file)
      const selected = new Map(tests.map((t) => [t.id, t]))
      const permits = yield* Semaphore.make(concurrency)
      const emit = (e: Event) => Queue.offer(queue, e)

      const hasSelected = (node: Node<any>, id: string): boolean =>
        node._tag === "Test" ? selected.has(id) : node.children.some((c) => hasSelected(c, childId(id, c)))

      // `Test.provide` on a suite: built once (lazily) in the suite's MemoMap + Scope; the Scope
      // closes when the suite's last test is done. On a test: built per attempt (frame `undefined`).
      // MemoMaps are forked down the tree (run -> suite -> ... -> test attempt), exactly as nested
      // `Effect.provide`s fork `CurrentMemoMap`: a layer value already built above is reused below,
      // including by `Effect.provide` inside a test body. `Layer.fresh` opts out.
      const walk = (
        node: Node<any>,
        id: string,
        fixtures: ReadonlyArray<[Fixture, Frame | undefined]>,
        parentMemo: Layer.MemoMap
      ): Effect.Effect<void> =>
        Effect.suspend(() => {
          if (!hasSelected(node, id)) return Effect.void
          if (node._tag === "Test") {
            const own = node.layers.map((f): [Fixture, Frame | undefined] => [f, undefined])
            return permits.withPermits(1)(runTest(node, id, [...fixtures, ...own], parentMemo, selected.get(id)!))
          }
          return Effect.gen(function*() {
            const sf: Frame = { memo: yield* Layer.forkMemoMap(parentMemo), scope: yield* Scope.make(), once: makeOnce() }
            const own = node.layers.map((f): [Fixture, Frame | undefined] => [f, sf])
            yield* Effect.forEach(node.children, (c) => walk(c, childId(id, c), [...fixtures, ...own], sf.memo), {
              concurrency: "unbounded",
              discard: true
            }).pipe(Effect.ensuring(Scope.close(sf.scope, Exit.void)))
          })
        })

      // Build the fixture chain outer-first; each layer may depend on those above it.
      const buildFixtures = (
        fixtures: ReadonlyArray<[Fixture, Frame | undefined]>,
        parentMemo: Layer.MemoMap,
        testScope: Scope.Scope
      ) =>
        Effect.gen(function*() {
          const testMemo = yield* Layer.forkMemoMap(parentMemo)
          let ctx = Context.empty() as Context.Context<any>
          for (const [fixture, frame] of fixtures) {
            const build = (memo: Layer.MemoMap, scope: Scope.Scope) =>
              Layer.buildWithMemoMap(fixture.layer, memo, scope).pipe(
                Effect.provideContext(ctx),
                Effect.catchCause((cause) => Effect.fail(new FixtureFailure(fixture, cause)))
              )
            const built = yield* (frame
              ? once(frame.once, fixture, build(frame.memo, frame.scope))
              : build(testMemo, testScope))
            ctx = Context.merge(ctx, built)
          }
          return { ctx, testMemo }
        })

      const runTest = (
        node: TestNode<any>,
        id: string,
        fixtures: ReadonlyArray<[Fixture, Frame | undefined]>,
        memo: Layer.MemoMap,
        plan: RunFileTest
      ) =>
        Effect.gen(function*() {
          const previousAttempts: Array<{ attempt: number; status: Status }> = []
          for (let attempt = 1;; attempt++) {
            yield* emit({ _tag: "TestStarted", id, attempt })
            const start = Date.now()
            const r = yield* runAttempt(node, fixtures, memo, plan)
            const done = r.status === "passed" || attempt > plan.retries
            if (done) {
              return yield* emit({
                _tag: "TestFinished",
                id,
                status: r.status,
                durationMs: Date.now() - start,
                seed: plan.seed,
                attempt,
                previousAttempts,
                failures: r.failures,
                console: r.console
              })
            }
            previousAttempts.push({ attempt, status: r.status })
          }
        })

      const runAttempt = (
        node: TestNode<any>,
        fixtures: ReadonlyArray<[Fixture, Frame | undefined]>,
        memo: Layer.MemoMap,
        plan: RunFileTest
      ) =>
        Effect.scoped(Effect.gen(function*() {
          const scope = yield* Effect.scope
          const sink = new Sink()
          const fx = yield* Effect.result(buildFixtures(fixtures, memo, scope))
          if (fx._tag === "Failure") {
            const f = fx.failure
            return {
              status: "failed" as Status,
              console: [],
              failures: [{
                kind: "fixture" as const,
                message: `fixture "${f.fixture.name}"${shared.has(f.fixture.layer) ? " (shared, from the test config)" : ""} failed to build:\n${Cause.pretty(f.cause)}`
              }]
            }
          }
          const env = yield* Layer.buildWithScope(TestEnv, scope)
          const testConsole = Context.get(env, Console.Console) as unknown as TestConsole.TestConsole
          const exit = yield* bodyEffect(node, sink).pipe(
            Effect.scoped, // the body's own Scope closes (finalizers run) before results are read
            // the body's own `Effect.provide`s fork from the test's MemoMap (added last: every built
            // context, TestEnv's included, carries the MemoMap it was built with)
            Effect.provideContext(Context.add(Context.merge(fx.success.ctx, env), Layer.CurrentMemoMap, fx.success.testMemo)),
            Random.withSeed(plan.seed),
            Effect.provideService(CurrentSink, sink),
            Effect.timeoutOption(plan.timeoutMs), // outside the TestClock: real time
            Effect.exit
          )
          const consoleLines = [
            ...(yield* testConsole.logLines).map(line),
            ...(yield* testConsole.errorLines).map((l) => `[error] ${line(l)}`)
          ]
          return { ...classify(exit, sink, plan, node), console: consoleLines }
        }))

      yield* walk(root, rel, [], runMemo)
      yield* Queue.end(queue)
    })
  )

const line = (args: unknown): string =>
  Array.isArray(args) ? args.map(line).join(" ") : typeof args === "string" ? args : show(args)

// --- body: an Effect, or a plain function (sync / Promise)

const isGenerator = (u: unknown): u is Generator =>
  typeof u === "object" && u !== null && typeof (u as any).next === "function" &&
  typeof (u as any)[Symbol.iterator] === "function"

const bodyEffect = (node: TestNode<any>, sink: Sink): Effect.Effect<unknown, unknown> => {
  if (node.body._tag === "Effect") return node.body.effect as Effect.Effect<unknown, unknown>
  const run = node.body.run
  return Effect.flatMap(
    Effect.sync(() => sinkStorage.run(sink, run)),
    (result) => {
      // an Effect or a generator in the result is reported by `classify`: it never ran
      if (result instanceof Promise) return Effect.promise(() => sinkStorage.run(sink, () => result))
      return Effect.succeed(result)
    }
  )
}

// --- Cause-aware classification

const userFrameOf = (u: unknown) => u instanceof Error ? locationFromStack(u.stack) : undefined

const classify = (
  exit: Exit.Exit<Option.Option<unknown>, unknown>,
  sink: Sink,
  plan: RunFileTest,
  node: TestNode<any>
): { status: Status; failures: Array<Failure> } => {
  const failures: Array<Failure> = []
  let mainAssertion: AssertionError | undefined
  if (Exit.isSuccess(exit) && Option.isNone(exit.value)) {
    return {
      status: "timedOut",
      failures: [{
        kind: "timeout",
        message: `test exceeded its timeout of ${plan.timeoutMs}ms; its fiber was interrupted and finalizers ran`,
        ...(node.location ? { location: node.location } : {})
      }, ...sink.failures.map((f) => f.failure)]
    }
  }
  if (Exit.isFailure(exit)) {
    if (Cause.hasInterruptsOnly(exit.cause)) {
      return { status: "interrupted", failures: [{ kind: "interrupted", message: "test fiber was interrupted" }] }
    }
    for (const reason of exit.cause.reasons) {
      if (Cause.isFailReason(reason)) {
        const e = reason.error as any
        const tag = typeof e === "object" && e !== null && typeof e._tag === "string" ? e._tag : undefined
        const fields = typeof e === "object" && e !== null
          ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== "_tag" && k !== "stack"))
          : undefined
        const loc = userFrameOf(e)
        failures.push({
          kind: "typedError",
          message: tag ? `test failed with typed error ${tag}` : `test failed with error ${show(e)}`,
          ...(tag ? { errorTag: tag } : {}),
          ...(fields ? { errorFields: show(fields) } : {}),
          ...(loc ? { location: loc } : {})
        })
      } else if (Cause.isDieReason(reason)) {
        if (reason.defect instanceof AssertionError) {
          mainAssertion = reason.defect
          continue // reported through the sink
        }
        const d = reason.defect as any
        const loc = userFrameOf(d)
        failures.push({
          kind: "defect",
          message: d instanceof Error ? `${d.name}: ${d.message}` : show(d),
          ...(loc ? { location: loc } : {})
        })
      }
    }
  }
  const assertionFailures = sink.failures.map(({ error, failure }) =>
    error === mainAssertion
      ? failure
      : { ...failure, forked: true, message: `${failure.message} (in a forked fiber)` }
  )
  failures.unshift(...assertionFailures)
  if (Exit.isSuccess(exit)) {
    const value = Option.getOrUndefined(exit.value)
    if (isGenerator(value)) {
      failures.push({
        kind: "discardedEffect",
        message: "test body is a generator function, so it never ran: write `Effect.gen(function*() {...})`",
        ...(node.location ? { location: node.location } : {})
      })
    } else if (Effect.isEffect(value)) {
      failures.push({
        kind: "discardedEffect",
        message: "test body produced an Effect that was never run (pass the Effect itself as the body, or `yield*` it)",
        ...(node.location ? { location: node.location } : {})
      })
    } else if (sink.count === 0 && !plan.noAssertions && failures.length === 0) {
      failures.push({
        kind: "noAssertions",
        message: "test made no assertions (pass `noAssertions: true` if that is intended)",
        ...(node.location ? { location: node.location } : {})
      })
    }
  }
  return { status: failures.length > 0 ? "failed" : "passed", failures }
}
