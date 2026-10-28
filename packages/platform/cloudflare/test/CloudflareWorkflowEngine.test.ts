import type { SqlStorage } from "@cloudflare/workers-types"
import * as CloudflareWorkflowEngine from "@effect/platform-cloudflare/CloudflareWorkflowEngine"
import { encodeName } from "@effect/platform-cloudflare/internal/clusterName"
import type { EntityAlarm } from "@effect/platform-cloudflare/internal/entityStorage"
import { makeWorkflowRuntime, type WorkflowRuntime } from "@effect/platform-cloudflare/internal/workflowRuntime"
import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Layer, Option, Schema } from "effect"
import { RpcTest } from "effect/rpc"
import { TestClock } from "effect/testing"
import {
  Activity,
  DurableDeferred,
  Workflow,
  WorkflowEngine,
  WorkflowProxy,
  WorkflowProxyServer
} from "effect/workflow"

class FakeSql {
  execution: Record<string, unknown> | undefined
  readonly activities = new Map<string, string>()
  readonly deferreds = new Map<string, string>()
  readonly clocks = new Map<string, { deferredName: string; wakeUp: number; fired: boolean }>()

  exec(query: string, ...bindings: Array<unknown>) {
    const rows = this.run(query, bindings)
    return { toArray: () => rows }
  }

  private run(query: string, bindings: Array<unknown>): Array<Record<string, unknown>> {
    if (query.startsWith("CREATE TABLE")) return []
    if (query.includes("INSERT OR IGNORE INTO workflow_execution")) {
      this.execution ??= {
        workflow_name: bindings[0],
        execution_id: bindings[1],
        payload: bindings[2],
        parent_name: bindings[3],
        parent_execution_id: bindings[4],
        result: null,
        resume_pending: 0
      }
      return []
    }
    if (query.includes("SET parent_name")) {
      if (this.execution !== undefined && this.execution.parent_name === null) {
        this.execution.parent_name = bindings[0]
        this.execution.parent_execution_id = bindings[1]
      }
      return []
    }
    if (query.includes("SET resume_pending")) {
      if (this.execution !== undefined) this.execution.resume_pending = bindings[0]
      return []
    }
    if (query.includes("UPDATE workflow_execution")) {
      if (this.execution !== undefined) {
        this.execution.result = bindings[0]
        if (query.includes("resume_pending")) this.execution.resume_pending = bindings[1]
      }
      return []
    }
    if (query.includes("FROM workflow_execution")) {
      return this.execution === undefined ? [] : [this.execution]
    }
    if (query.includes("INSERT OR IGNORE INTO workflow_activities")) {
      if (!this.activities.has(String(bindings[0]))) {
        this.activities.set(String(bindings[0]), String(bindings[1]))
      }
      return []
    }
    if (query.includes("FROM workflow_activities")) {
      const exit = this.activities.get(String(bindings[0]))
      return exit === undefined ? [] : [{ exit }]
    }
    if (query.includes("INSERT INTO workflow_deferreds")) {
      if (!this.deferreds.has(String(bindings[0]))) {
        this.deferreds.set(String(bindings[0]), String(bindings[1]))
      }
      return []
    }
    if (query.includes("FROM workflow_deferreds")) {
      const exit = this.deferreds.get(String(bindings[0]))
      return exit === undefined ? [] : [{ exit }]
    }
    if (query.includes("INSERT OR IGNORE INTO workflow_clocks")) {
      if (!this.clocks.has(String(bindings[0]))) {
        this.clocks.set(String(bindings[0]), {
          deferredName: String(bindings[1]),
          wakeUp: Number(bindings[2]),
          fired: false
        })
      }
      return []
    }
    if (query.includes("min(wake_up)")) {
      const pending = Array.from(this.clocks.values()).filter((clock) => !clock.fired).map((clock) => clock.wakeUp)
      return [{ wake_up: pending.length === 0 ? null : Math.min(...pending) }]
    }
    if (query.includes("wake_up <= ?")) {
      return Array.from(this.clocks)
        .filter(([, clock]) => !clock.fired && clock.wakeUp <= Number(bindings[0]))
        .map(([name, clock]) => ({ name, deferred_name: clock.deferredName }))
    }
    if (query.includes("SET fired = 1")) {
      const clock = this.clocks.get(String(bindings[0]))
      if (clock !== undefined) clock.fired = true
      return []
    }
    throw new Error(`Unexpected SQL: ${query}`)
  }

  get sql(): SqlStorage {
    return this as unknown as SqlStorage
  }
}

class FakeAlarm {
  current: number | null = null

  getAlarm() {
    return Promise.resolve(this.current)
  }
  setAlarm(scheduledTime: number) {
    this.current = scheduledTime
    return Promise.resolve()
  }

  get alarm(): EntityAlarm {
    return this as unknown as EntityAlarm
  }
}

class FakeWorkflowNamespace {
  readonly stores = new Map<string, { readonly sql: FakeSql; readonly alarm: FakeAlarm }>()
  readonly runtimes = new Map<string, WorkflowRuntime>()
  readonly rejectedResumes = new Map<string, number>()
  now = 0

  store(name: string) {
    let store = this.stores.get(name)
    if (store === undefined) {
      store = { sql: new FakeSql(), alarm: new FakeAlarm() }
      this.stores.set(name, store)
    }
    return store
  }

  getByName(name: string): WorkflowRuntime {
    let runtime = this.runtimes.get(name)
    if (runtime === undefined) {
      const store = this.store(name)
      runtime = makeWorkflowRuntime({
        name,
        sql: store.sql.sql,
        alarm: store.alarm.alarm,
        now: () => this.now,
        waitUntil: (promise) => {
          void promise
        },
        getStub: (stubName) => {
          const stub = this.getByName(stubName)
          if (!this.rejectedResumes.has(stubName)) return stub
          return {
            ...stub,
            resume: () => {
              this.rejectedResumes.set(stubName, (this.rejectedResumes.get(stubName) ?? 0) + 1)
              return Promise.reject(new Error("Parent resume transport unavailable"))
            }
          }
        }
      })
      this.runtimes.set(name, runtime)
    }
    return runtime
  }

  /** Drops every in-memory runtime, as a crashed or hibernated isolate would. */
  crash() {
    this.runtimes.clear()
  }

  get layer() {
    return CloudflareWorkflowEngine.layer({ workflowNamespace: this as never })
  }
}

const pollUntil = Effect.fnUntraced(function*<
  W extends Workflow.Workflow<any, any, any, any>
>(workflow: W, executionId: string, tag: "Complete" | "Suspended") {
  while (true) {
    const result = yield* workflow.poll(executionId)
    if (Option.isSome(result) && result.value._tag === tag) return result.value
    yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 1)))
  }
})

describe("CloudflareWorkflowEngine", () => {
  it.effect("retains a parent completion wake after exhausted retries and a child restart", () => {
    const namespace = new FakeWorkflowNamespace()
    const Gate = DurableDeferred.make("RetryChild/Gate")
    const Child = Workflow.make("RetryChild", { payload: { id: Schema.String }, idempotencyKey: ({ id }) => id })
    const Parent = Workflow.make("RetryParent", { payload: { id: Schema.String }, idempotencyKey: ({ id }) => id })
    const parentCompleted = Deferred.makeUnsafe<void>()
    let childRuns = 0
    const layer = Layer.merge(
      Child.toLayer(() =>
        Effect.sync(() => {
          childRuns++
        }).pipe(Effect.andThen(DurableDeferred.await(Gate)))
      ),
      Parent.toLayer(({ id }) =>
        Child.execute({ id }).pipe(Effect.tap(() => Deferred.succeed(parentCompleted, undefined)))
      )
    ).pipe(Layer.provideMerge(namespace.layer))

    return Effect.gen(function*() {
      const parentId = yield* Parent.executionId({ id: "one" })
      const childId = yield* Child.executionId({ id: "one" })
      const parentName = encodeName(Parent._tag, parentId)
      const childName = encodeName(Child._tag, childId)
      yield* Parent.execute({ id: "one" }, { discard: true })
      yield* pollUntil(Parent, parentId, "Suspended")
      namespace.rejectedResumes.set(parentName, 0)
      yield* DurableDeferred.succeed(Gate, {
        token: DurableDeferred.tokenFromExecutionId(Gate, { workflow: Child, executionId: childId }),
        value: undefined
      })
      while ((namespace.rejectedResumes.get(parentName) ?? 0) < 6) yield* Effect.sleep(10).pipe(TestClock.withLive)
      assert.isFalse(yield* Deferred.isDone(parentCompleted))
      assert.strictEqual(namespace.store(childName).sql.execution?.resume_pending, 1)
      const runsBeforeRestart = childRuns

      namespace.rejectedResumes.delete(parentName)
      namespace.crash()
      namespace.now = 60_000
      namespace.store(childName).alarm.current = null
      yield* Effect.promise(() => namespace.getByName(childName).runAlarm())
      yield* Deferred.await(parentCompleted)
      const result = yield* pollUntil(Parent, parentId, "Complete")
      assert(result._tag === "Complete" && Exit.isSuccess(result.exit))
      assert.strictEqual(namespace.store(childName).sql.execution?.resume_pending, 0)
      assert.strictEqual(childRuns, runsBeforeRestart)
    }).pipe(Effect.provide(layer))
  }, 15_000)

  it.effect("durably admits an in-flight resume before acknowledging it", () =>
    Effect.gen(function*() {
      const namespace = new FakeWorkflowNamespace()
      const started = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      const Waiting = Workflow.make("AdmittedResume", {
        payload: { id: Schema.String },
        idempotencyKey: ({ id }) => id
      })
      const layer = Waiting.toLayer(() =>
        Deferred.succeed(started, undefined).pipe(
          Effect.andThen(Deferred.await(release))
        )
      ).pipe(Layer.provideMerge(namespace.layer))
      yield* Effect.gen(function*() {
        const id = yield* Waiting.executionId({ id: "one" })
        yield* Waiting.execute({ id: "one" }, { discard: true })
        yield* Deferred.await(started)
        const name = encodeName(Waiting._tag, id)
        yield* Effect.promise(() => namespace.getByName(name).resume())
        assert.strictEqual(namespace.store(name).sql.execution?.resume_pending, 1)
        assert.strictEqual(namespace.store(name).alarm.current, 60_000)
        yield* Deferred.succeed(release, undefined)
        yield* pollUntil(Waiting, id, "Complete")
      }).pipe(Effect.ensuring(Deferred.succeed(release, undefined)), Effect.provide(layer))
    }))

  it.effect("does not automatically replay an uncaptured defect after native resume", () =>
    Effect.gen(function*() {
      const namespace = new FakeWorkflowNamespace()
      const started = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      let attempts = 0
      const Defecting = Workflow.make("UncapturedResume", {
        payload: { id: Schema.String },
        idempotencyKey: ({ id }) => id
      }).annotate(Workflow.CaptureDefects, false)
      const layer = Defecting.toLayer(Effect.fnUntraced(function*() {
        attempts++
        yield* Deferred.succeed(started, undefined)
        yield* Deferred.await(release)
        return yield* Effect.die(new Error("Uncaptured workflow defect"))
      })).pipe(Layer.provideMerge(namespace.layer))

      yield* Effect.gen(function*() {
        const id = yield* Defecting.executionId({ id: "one" })
        yield* Defecting.execute({ id: "one" }, { discard: true })
        yield* Deferred.await(started)
        const name = encodeName(Defecting._tag, id)
        const runtime = namespace.getByName(name)
        yield* Effect.promise(() => runtime.resume())
        const result = yield* Effect.forkChild(
          Effect.promise(() => runtime.run(JSON.stringify({ id: "one" }), { discard: false })).pipe(Effect.exit)
        )
        yield* Effect.yieldNow
        yield* Deferred.succeed(release, undefined)
        assert.isTrue(Exit.isFailure(yield* Fiber.join(result)))

        namespace.now = 60_000
        namespace.store(name).alarm.current = null
        yield* Effect.promise(() => runtime.runAlarm())
        assert.strictEqual(attempts, 1)
        assert.strictEqual(namespace.store(name).sql.execution?.resume_pending, 0)
      }).pipe(Effect.ensuring(Deferred.succeed(release, undefined)), Effect.provide(layer))
    }))

  it.effect("routes generated workflow proxy handlers through the encoded Durable Object name", () => {
    const namespace = new FakeWorkflowNamespace()
    const Proxied = Workflow.make("Proxied", {
      payload: { id: Schema.String },
      success: Schema.String,
      idempotencyKey: ({ id }) => id
    })
    const workflows = [Proxied] as const
    const proxy = WorkflowProxy.toRpcGroup(workflows)
    const workflowLayer = Proxied.toLayer(({ id }) => Effect.succeed(`done-${id}`)).pipe(
      Layer.provideMerge(namespace.layer)
    )

    return Effect.gen(function*() {
      const client = yield* RpcTest.makeClient(proxy)
      const result = yield* client.Proxied({ id: "proxy:id" })
      const executionId = yield* Proxied.executionId({ id: "proxy:id" })

      assert.strictEqual(result, "done-proxy:id")
      assert.deepStrictEqual(Array.from(namespace.stores.keys()), [encodeName("Proxied", executionId)])
    }).pipe(
      Effect.provide(WorkflowProxyServer.layerRpcHandlers(workflows)),
      Effect.provide(workflowLayer)
    )
  })

  it.effect("re-runs an activity when the object is lost mid-activity", () => {
    const namespace = new FakeWorkflowNamespace()
    let invocations = 0
    let release!: () => void
    const started = new Promise<void>((resolve) => {
      release = resolve
    })
    const Crashing = Workflow.make("Crashing", {
      payload: { id: Schema.String },
      success: Schema.Number,
      idempotencyKey: ({ id }) => id
    })
    const layer = Crashing.toLayer(() =>
      Activity.make({
        name: "compute",
        success: Schema.Number,
        execute: Effect.suspend(() => {
          invocations++
          if (invocations === 1) {
            release()
            return Effect.promise(() => new Promise<number>(() => {}))
          }
          return Effect.succeed(42)
        })
      })
    ).pipe(Layer.provideMerge(namespace.layer))

    return Effect.gen(function*() {
      const executionId = yield* Crashing.executionId({ id: "one" })
      yield* Crashing.execute({ id: "one" }, { discard: true })
      yield* Effect.promise(() => started)

      namespace.crash()
      yield* Crashing.resume(executionId)
      const result = yield* pollUntil(Crashing, executionId, "Complete")
      assert(result._tag === "Complete" && Exit.isSuccess(result.exit))
      assert.strictEqual(result.exit.value, 42)
      assert.strictEqual(invocations, 2)

      // The result is keyed `${name}/${attempt}` in the execution object.
      const store = namespace.stores.get(encodeName("Crashing", executionId))!
      assert.deepStrictEqual(Array.from(store.sql.activities.keys()), ["compute/1"])
    }).pipe(Effect.provide(layer))
  })

  it.effect("resumes a suspended parent when a child workflow completes", () => {
    const namespace = new FakeWorkflowNamespace()
    const Gate = DurableDeferred.make("NestedChild/Gate", { success: Schema.String })
    const Child = Workflow.make("NestedChild", {
      payload: { id: Schema.String },
      success: Schema.String,
      idempotencyKey: ({ id }) => id
    })
    const Parent = Workflow.make("NestedParent", {
      payload: { id: Schema.String },
      success: Schema.String,
      idempotencyKey: ({ id }) => id
    })
    const layer = Layer.merge(
      Child.toLayer(() => DurableDeferred.await(Gate)),
      Parent.toLayer(Effect.fnUntraced(function*({ id }) {
        const value = yield* Child.execute({ id })
        return `parent-${value}`
      }))
    ).pipe(Layer.provideMerge(namespace.layer))

    return Effect.gen(function*() {
      const parentExecutionId = yield* Parent.executionId({ id: "one" })
      const childExecutionId = yield* Child.executionId({ id: "one" })
      yield* Parent.execute({ id: "one" }, { discard: true })
      yield* pollUntil(Parent, parentExecutionId, "Suspended")
      yield* pollUntil(Child, childExecutionId, "Suspended")

      const token = DurableDeferred.tokenFromExecutionId(Gate, { workflow: Child, executionId: childExecutionId })
      yield* DurableDeferred.succeed(Gate, { token, value: "child" })
      const result = yield* pollUntil(Parent, parentExecutionId, "Complete")
      assert(result._tag === "Complete" && Exit.isSuccess(result.exit))
      assert.strictEqual(result.exit.value, "parent-child")
    }).pipe(Effect.provide(layer))
  })

  it.effect("persists an interrupted completion when hard-interrupted mid-activity", () => {
    const namespace = new FakeWorkflowNamespace()
    let release!: () => void
    const started = new Promise<void>((resolve) => {
      release = resolve
    })
    const Hard = Workflow.make("HardInterrupt", {
      payload: { id: Schema.String },
      idempotencyKey: ({ id }) => id
    })
    const layer = Hard.toLayer(() =>
      Activity.make({
        name: "hang",
        execute: Effect.andThen(
          Effect.sync(() => release()),
          Effect.promise(() => new Promise<void>(() => {}))
        )
      })
    ).pipe(Layer.provideMerge(namespace.layer))

    return Effect.gen(function*() {
      const engine = yield* WorkflowEngine.WorkflowEngine
      const executionId = yield* Hard.executionId({ id: "one" })
      yield* Hard.execute({ id: "one" }, { discard: true })
      yield* Effect.promise(() => started)

      yield* engine.interruptUnsafe(Hard, executionId)
      const result = yield* pollUntil(Hard, executionId, "Complete")
      assert(result._tag === "Complete" && Exit.isFailure(result.exit))
      assert.isTrue(Exit.hasInterrupts(result.exit))
    }).pipe(Effect.provide(layer))
  })
})
