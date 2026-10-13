// The executor: loads test files, lists their tree, and runs selected
// tests as fibers. It knows nothing about filtering, seeds or reporting; the
// coordinator sends it fully resolved per-test instructions.
import * as Cause from "effect/Cause"
import * as Console from "effect/Console"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Formatter from "effect/Formatter"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Random from "effect/Random"
import * as RpcServer from "effect/rpc/RpcServer"
import * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/testing/TestClock"
import * as TestConsole from "effect/testing/TestConsole"
import * as path from "node:path"
import { pathToFileURL } from "node:url"
import { type AssertionError, formatPath, isAssertionError } from "./AssertionError.ts"
import { AssertionRecord, CurrentRecord, setPlainRecord } from "./AssertionRecord.ts"
import { locationFromStack } from "./CallSite.ts"
import type { Failure, ListedNode, RunFileTest, Status, TestFinished } from "./Protocol.ts"
import { ExecutorRpcs, LoadError } from "./Protocol.ts"
import type { Fixture, Node, SuiteNode, TestNode } from "./Test.ts"
import { isConfig, isNode, toMillis } from "./Test.ts"

Error.stackTraceLimit = 50

// --- loading

const load = (file: string, projectRoot: string) =>
  Effect.tryPromise({
    try: () => import(pathToFileURL(file).href),
    catch: (e) => new LoadError({ path: file, message: e instanceof Error ? e.stack ?? e.message : String(e) })
  }).pipe(
    Effect.flatMap((mod): Effect.Effect<SuiteNode<any>, LoadError> => {
      const root = mod.default
      if (!isNode(root)) {
        return Effect.fail(
          new LoadError({ path: file, message: `no tests exported from ${path.relative(projectRoot, file)}` })
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

/** The file's tree; ids start with the file's path relative to `root` (its project's root). */
export const listFile = (file: string, root: string = process.cwd()) =>
  Effect.map(load(file, root), (tree) => {
    const rel = path.relative(root, file).split(path.sep).join("/")
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
      if (node._tag === "Suite") { for (const c of node.children) visit(c, id, childId(id, c)) }
    }
    visit(tree, undefined, rel)
    return { file: rel, nodes }
  })

// --- running

/** Per-executor state: the run's MemoMap and Scope live as long as the executor. */
interface RunState {
  readonly runMemo: Layer.MemoMap
  /** the shared layers of every config in the chain (for reporting a fixture as shared) */
  readonly shared: ReadonlySet<Layer.Layer<any, any, any>>
}

export class ExecutorState extends Context.Service<ExecutorState, {
  /**
   * The run's MemoMap and shared layers for a chain of configs (the workspace root's first, then
   * the project's), set up on first use. Each config's MemoMap forks from the one before it, so a
   * layer shared by the workspace is shared by every project, and a project's only by its files.
   */
  readonly forConfigs: (files: ReadonlyArray<string>) => Effect.Effect<RunState, LoadError>
}>()("effect/test/ExecutorState") {
  static layer = Layer.effect(ExecutorState)(Effect.gen(function*() {
    const runScope = yield* Effect.scope
    const runContext = yield* Effect.context<never>()
    const lock = Semaphore.makeUnsafe(1)
    const states = new Map<string, RunState>()
    const empty: RunState = { runMemo: makeRunMemoMap(new Set(), runScope, runContext, undefined), shared: new Set() }
    const chain = (files: ReadonlyArray<string>): Effect.Effect<RunState, LoadError> =>
      Effect.suspend(() => {
        if (files.length === 0) return Effect.succeed(empty)
        const key = files.join("\n")
        const existing = states.get(key)
        if (existing) return Effect.succeed(existing)
        return Effect.flatMap(chain(files.slice(0, -1)), (parent) =>
          Effect.map(loadConfig(files[files.length - 1]), (layers): RunState => {
            const own = new Set<Layer.Layer<any, any, any>>(layers)
            const state = {
              runMemo: makeRunMemoMap(own, runScope, runContext, files.length > 1 ? parent.runMemo : undefined),
              shared: new Set([...parent.shared, ...own])
            }
            states.set(key, state)
            return state
          }))
      })
    return { forConfigs: (files) => lock.withPermits(1)(chain(files)) }
  }))
}

/** A config's shared layers. The coordinator sends the config chain with every `RunFile`. */
const loadConfig = (file: string) =>
  Effect.tryPromise({
    try: () => import(pathToFileURL(file).href),
    catch: (e) => new LoadError({ path: file, message: e instanceof Error ? e.stack ?? e.message : String(e) })
  }).pipe(
    Effect.flatMap((mod) =>
      isConfig(mod.default)
        ? Effect.succeed(mod.default.shared ?? [])
        : Effect.fail(new LoadError({ path: file, message: "the config's default export is not a Test.config(...)" }))
    )
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
  runContext: Context.Context<never>,
  /** the MemoMap of the config before this one in the chain (a project's parent is the workspace's) */
  parent: Layer.MemoMap | undefined
): Layer.MemoMap => {
  const inner = parent === undefined ? Layer.makeMemoMapUnsafe() : Layer.forkMemoMapUnsafe(parent)
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

type Event =
  | { readonly _tag: "TestStarted"; readonly project: string; readonly id: string; readonly attempt: number }
  | TestFinished

const TestEnv = Layer.mergeAll(TestConsole.layer, TestClock.layer())

/**
 * Plain (sync / Promise) tests run one at a time per executor: after an `await` they have
 * no fiber, so their assertions find the running test's record in a module variable
 * (AssertionRecord.ts). Effect tests are unaffected and stay concurrent.
 */
const plainLock = Semaphore.makeUnsafe(1)

class FixtureFailure {
  readonly fixture: Fixture
  readonly cause: Cause.Cause<unknown>
  constructor(fixture: Fixture, cause: Cause.Cause<unknown>) {
    this.fixture = fixture
    this.cause = cause
  }
}

export const runFile = (
  file: string,
  options: {
    /** the project root: ids are relative to it */
    readonly root?: string | undefined
    /** the project's key, echoed in every event */
    readonly project?: string | undefined
    /** the configs whose `shared` layers the tests use, the workspace root's first */
    readonly configs?: ReadonlyArray<string> | undefined
    readonly concurrency: number
  },
  tests: ReadonlyArray<RunFileTest>
) =>
  Stream.callback<Event, LoadError, ExecutorState>((queue) =>
    Effect.gen(function*() {
      const { runMemo, shared } = yield* (yield* ExecutorState).forConfigs(options.configs ?? [])
      const projectRoot = options.root ?? process.cwd()
      const project = options.project ?? "."
      const concurrency = options.concurrency
      const tree = yield* load(file, projectRoot)
      const rel = path.relative(projectRoot, file).split(path.sep).join("/")
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
            const sf: Frame = {
              memo: yield* Layer.forkMemoMap(parentMemo),
              scope: yield* Scope.make(),
              once: makeOnce()
            }
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
            yield* emit({ _tag: "TestStarted", project, id, attempt })
            const start = Date.now()
            const r = yield* runAttempt(node, fixtures, memo, plan)
            const done = r.status === "passed" || attempt > plan.retries
            if (done) {
              return yield* emit({
                _tag: "TestFinished",
                project,
                id,
                status: r.status,
                durationMs: Date.now() - start,
                seed: plan.seed,
                attempt,
                previousAttempts,
                failures: r.failures,
                console: r.console,
                assertions: r.assertions
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
          const fx = yield* Effect.result(buildFixtures(fixtures, memo, scope))
          if (fx._tag === "Failure") {
            const f = fx.failure
            return {
              status: "failed" as Status,
              console: [],
              assertions: 0,
              failures: [{
                kind: "fixture" as const,
                message: `fixture "${f.fixture.name}"${
                  shared.has(f.fixture.layer) ? " (shared, from the test config)" : ""
                } failed to build:\n${Cause.pretty(f.cause)}`
              }]
            }
          }
          const env = yield* Layer.buildWithScope(TestEnv, scope)
          const testConsole = Context.get(env, Console.Console) as unknown as TestConsole.TestConsole
          const record = new AssertionRecord()
          const body = bodyEffect(node).pipe(
            Effect.scoped, // the body's own Scope closes (finalizers run) before results are read
            // the body's own `Effect.provide`s fork from the test's MemoMap (added last: every built
            // context, TestEnv's included, carries the MemoMap it was built with)
            Effect.provideContext(
              Context.add(
                Context.add(Context.merge(fx.success.ctx, env), Layer.CurrentMemoMap, fx.success.testMemo),
                CurrentRecord,
                record
              )
            ),
            Random.withSeed(plan.seed),
            Effect.timeoutOption(plan.timeoutMs), // outside the TestClock: real time
            Effect.exit
          )
          const exit = yield* (node.body._tag === "Plain"
            ? plainLock.withPermits(1)(Effect.acquireUseRelease(
              Effect.sync(() => setPlainRecord(record)),
              () => body,
              () => Effect.sync(() => setPlainRecord(undefined))
            ))
            : body)
          const consoleLines = [
            ...(yield* testConsole.logLines).map(line),
            ...(yield* testConsole.errorLines).map((l) => `[error] ${line(l)}`)
          ]
          return { ...classify(exit, plan, node, file, record), console: consoleLines, assertions: record.count }
        }))

      yield* walk(tree, rel, [], runMemo)
      yield* Queue.end(queue)
    })
  )

const line = (args: unknown): string =>
  Array.isArray(args) ? args.map(line).join(" ") : typeof args === "string" ? args : show(args)

// --- body: an Effect, or a plain function (sync / Promise)

const isGenerator = (u: unknown): u is Generator =>
  typeof u === "object" && u !== null && typeof (u as any).next === "function" &&
  typeof (u as any)[Symbol.iterator] === "function"

const bodyEffect = (node: TestNode<any>): Effect.Effect<unknown, unknown> => {
  if (node.body._tag === "Effect") return node.body.effect as Effect.Effect<unknown, unknown>
  const run = node.body.run
  return Effect.flatMap(
    Effect.sync(run),
    (result) =>
      // an Effect or a generator in the result is reported by `classify`: it never ran
      result instanceof Promise ? Effect.promise(() => result) : Effect.succeed(result)
  )
}

// --- Cause-aware classification

const show = (u: unknown): string => typeof u === "string" ? JSON.stringify(u) : Formatter.format(u)

const userFrameOf = (u: unknown) => u instanceof Error ? locationFromStack(u.stack) : undefined

/** `node:assert` (and most assertion libraries) throw an `AssertionError` too. */
const isForeignAssertionError = (u: unknown): u is Error =>
  u instanceof Error && (u.name === "AssertionError" || (u as { code?: unknown }).code === "ERR_ASSERTION")

/**
 * A failed `Assert.*` as data. Its location is the deepest frame in the test file (so a
 * helper elsewhere still points at the test's line), and `origin` the frame that raised it
 * when that is somewhere else. A soft scope's failure stands for the failures it collected.
 */
const assertionFailures = (e: AssertionError, file: string, note?: string): Array<Failure> => {
  if (e.assertion === "soft") {
    return e.failures.flatMap((child) =>
      assertionFailures(child, file, note).map((f) =>
        e.label === undefined ? f : { ...f, label: f.label ? `${e.label} › ${f.label}` : e.label }
      )
    )
  }
  const location = locationFromStack(e.stack, file)
  const origin = locationFromStack(e.stack)
  return [{
    kind: "assertion",
    message: e.headline,
    ...(e.label !== undefined ? { label: e.label } : {}),
    ...(e.mismatches.length > 0
      ? {
        mismatches: e.mismatches.map((m) => ({
          path: formatPath(m.path),
          ...(m.expected !== undefined ? { expected: m.expected } : {}),
          ...(m.actual !== undefined ? { actual: m.actual } : {}),
          ...(m.reason !== undefined ? { reason: m.reason } : {})
        }))
      }
      : {}),
    ...(location ? { location } : {}),
    ...(origin && location && (origin.file !== location.file || origin.line !== location.line) ? { origin } : {}),
    ...(note !== undefined ? { note } : {})
  }]
}

const classify = (
  exit: Exit.Exit<Option.Option<unknown>, unknown>,
  plan: RunFileTest,
  node: TestNode<any>,
  file: string,
  record: AssertionRecord
): { status: Status; failures: Array<Failure> } => {
  const failures: Array<Failure> = []
  /** the assertion errors the body failed with: the record's others were caught, or lost in a fiber */
  const thrown = new Set<unknown>()
  if (Exit.isSuccess(exit) && Option.isNone(exit.value)) {
    return {
      status: "timedOut",
      failures: [{
        kind: "timeout",
        message: `test exceeded its timeout of ${plan.timeoutMs}ms; its fiber was interrupted and finalizers ran`,
        ...(node.location ? { location: node.location } : {})
      }]
    }
  }
  if (Exit.isFailure(exit)) {
    if (Cause.hasInterruptsOnly(exit.cause)) {
      return { status: "interrupted", failures: [{ kind: "interrupted", message: "test fiber was interrupted" }] }
    }
    for (const reason of exit.cause.reasons) {
      const value = Cause.isFailReason(reason) ? reason.error : Cause.isDieReason(reason) ? reason.defect : undefined
      if (isAssertionError(value)) {
        thrown.add(value)
        failures.push(...assertionFailures(value, file))
      } else if (Cause.isFailReason(reason)) {
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
        const d = reason.defect as any
        const loc = userFrameOf(d)
        failures.push(
          isForeignAssertionError(d)
            ? { kind: "assertion", message: d.message, ...(loc ? { location: loc } : {}) }
            : {
              kind: "defect",
              message: d instanceof Error ? `${d.name}: ${d.message}` : show(d),
              ...(loc ? { location: loc } : {})
            }
        )
      }
    }
  }
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
    }
  }
  for (const { assertion, site } of record.pending.values()) {
    const location = locationFromStack(site.stack, file)
    failures.push({
      kind: "discardedEffect",
      message: `${assertion} was built but never run: did you forget \`yield*\` (or \`await\`)?`,
      ...(location ? { location } : {})
    })
  }
  for (const e of record.failures) {
    if (thrown.has(e)) continue
    failures.push(...assertionFailures(
      e,
      file,
      "this assertion failed, but its error was caught (or thrown in a fiber the test didn't join); a failed " +
        "assertion fails the test. To retry assertions, use `Assert.eventually`"
    ))
  }
  if (failures.length === 0 && record.count === 0 && !plan.noAssertions) {
    failures.push({
      kind: "noAssertions",
      message: "the test made no assertions (only `Assert.*` calls count, not node:assert or other libraries): add " +
        "one, or mark the test `Test.noAssertions` if it checks nothing on purpose",
      ...(node.location ? { location: node.location } : {})
    })
  }
  return { status: failures.length > 0 ? "failed" : "passed", failures }
}

// --- serving

/**
 * The executor: serves `ExecutorRpcs` over whichever `RpcServer.Protocol` it is given. It
 * knows nothing about the transport; the CLI (`cli/executor/*.ts`) provides the worker one, and
 * a socket or stdio protocol would make it a child process or a remote machine.
 */
export const layer: Layer.Layer<never, never, RpcServer.Protocol> = RpcServer.layer(ExecutorRpcs).pipe(
  Layer.provide(ExecutorRpcs.toLayer({
    ListFile: ({ path, root }) => listFile(path, root),
    RunFile: ({ concurrency, configs, path, project, root, tests }) =>
      runFile(path, { root, project, configs, concurrency }, tests)
  })),
  Layer.provide(ExecutorState.layer)
)
