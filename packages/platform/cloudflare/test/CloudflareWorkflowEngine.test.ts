import type { DurableObjectStorage, SqlStorage } from "@cloudflare/workers-types"
import {
  type ClusterWorkflowProgram,
  type DurableObjectProgramState,
  makeClusterWorkflowProgram
} from "@effect/platform-cloudflare/CloudflareDurableObjectPrograms"
import * as CloudflareWorkflowEngine from "@effect/platform-cloudflare/CloudflareWorkflowEngine"
import { encodeName } from "@effect/platform-cloudflare/internal/clusterName"
import type { EntityAlarm } from "@effect/platform-cloudflare/internal/entityStorage"
import { makeWorkflowRegistry } from "@effect/platform-cloudflare/internal/workflowRegistry"
import { makeWorkflowRuntime, type WorkflowRuntime } from "@effect/platform-cloudflare/internal/workflowRuntime"
import { loadExecution } from "@effect/platform-cloudflare/internal/workflowStorage"
import { decodeResult, encodeExit, encodePayload } from "@effect/platform-cloudflare/internal/workflowWire"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Effect, Exit, Layer, Option, Schema, Scope } from "effect"
import { RpcTest } from "effect/unstable/rpc"
import {
  Activity,
  DurableClock,
  DurableDeferred,
  Workflow,
  WorkflowEngine,
  WorkflowProxy,
  WorkflowProxyServer
} from "effect/unstable/workflow"

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
      if (this.execution !== undefined) this.execution.result = bindings[0]
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
  readonly registry = makeWorkflowRegistry()
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
        getStub: (stubName) => this.getByName(stubName),
        getRegistration: this.registry.get
      })
      this.runtimes.set(name, runtime)
    }
    return runtime
  }

  /** Drops every in-memory runtime, as a crashed or hibernated isolate would. */
  crash() {
    this.runtimes.clear()
  }

  fireDueAlarms(): Promise<void> {
    const fired: Array<Promise<void>> = []
    for (const [name, store] of this.stores) {
      if (store.alarm.current !== null && store.alarm.current <= this.now) {
        store.alarm.current = null
        fired.push(this.getByName(name).runAlarm())
      }
    }
    return Promise.all(fired).then(() => undefined)
  }

  get layer() {
    return Layer.effect(WorkflowEngine.WorkflowEngine)(
      CloudflareWorkflowEngine.makeWithRegistry({ getByName: (name) => this.getByName(name) }, this.registry)
    )
  }

  get effectLayer() {
    const workflowNamespace = {
      getByName: (name: string) => {
        const stub = this.getByName(name)
        return {
          run: (payload, options) => Effect.promise(() => stub.run(payload, options)),
          poll: () => Effect.promise(() => stub.poll()),
          resume: () => Effect.promise(() => stub.resume()),
          interrupt: () => Effect.promise(() => stub.interrupt()),
          interruptUnsafe: () => Effect.promise(() => stub.interruptUnsafe()),
          deferredDone: (deferredName, exit) => Effect.promise(() => stub.deferredDone(deferredName, exit)),
          scheduleClock: (clockName, deferredName, wakeUp) =>
            Effect.promise(() => stub.scheduleClock(clockName, deferredName, wakeUp))
        } satisfies CloudflareWorkflowEngine.WorkflowClient
      }
    }
    return Layer.effect(WorkflowEngine.WorkflowEngine)(
      CloudflareWorkflowEngine.makeWithRegistry(workflowNamespace, this.registry)
    )
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

const pollProgramUntil = Effect.fnUntraced(function*(
  program: ClusterWorkflowProgram,
  workflow: Workflow.Any,
  tag: "Complete" | "Suspended"
) {
  while (true) {
    const text = yield* program.poll()
    if (text !== undefined) {
      const result = yield* decodeResult(workflow, text, Context.empty())
      if (result._tag === tag) return result
    }
    yield* Effect.yieldNow
  }
})

describe("CloudflareWorkflowEngine", () => {
  it.effect("re-arms persisted clocks before exposing the workflow handlers", () =>
    Effect.gen(function*() {
      const sql = new FakeSql()
      const alarm = new FakeAlarm()
      sql.execution = {
        workflow_name: "Restarted",
        execution_id: "execution",
        payload: "{}",
        parent_name: null,
        parent_execution_id: null,
        result: null,
        resume_pending: 0
      }
      sql.clocks.set("sleep", { deferredName: "DurableClock/sleep", wakeUp: 1_000, fired: false })
      const storage = {
        sql: sql.sql,
        getAlarm: () => alarm.getAlarm(),
        setAlarm: (scheduledTime: number) => alarm.setAlarm(scheduledTime)
      } as unknown as DurableObjectStorage
      const state: DurableObjectProgramState = {
        id: {},
        storage,
        exports: {
          CustomWorkflow: {
            getByName: () => {
              throw new Error("Unexpected workflow stub lookup")
            }
          }
        },
        waitUntil: () => undefined
      }
      const Restarted = Workflow.make("Restarted", {
        payload: {},
        idempotencyKey: () => "execution"
      })

      const program = yield* makeClusterWorkflowProgram(state, {
        workflows: Restarted.toLayer(() => Effect.void),
        workflowClassName: "CustomWorkflow"
      })

      assert.strictEqual(alarm.current, 1_000)
      assert.isUndefined(yield* program.poll())
    }))

  it.effect("rebuilds workflow registrations after an isolate loss", () =>
    Effect.gen(function*() {
      const sql = new FakeSql()
      const alarm = new FakeAlarm()
      const state: DurableObjectProgramState = {
        id: { name: encodeName("ProgramResumable", "execution") },
        storage: {
          sql: sql.sql,
          getAlarm: () => alarm.getAlarm(),
          setAlarm: (scheduledTime: number) => alarm.setAlarm(scheduledTime)
        } as DurableObjectStorage,
        exports: {
          CustomWorkflow: {
            getByName: () => {
              throw new Error("Unexpected workflow stub lookup")
            }
          }
        },
        waitUntil: (promise) => {
          void promise
        }
      }
      const Gate = DurableDeferred.make("ProgramResumable/Gate", { success: Schema.String })
      let runs = 0
      const ProgramResumable = Workflow.make("ProgramResumable", {
        payload: { id: Schema.String },
        success: Schema.String,
        idempotencyKey: ({ id }) => id
      })
      const workflows = ProgramResumable.toLayer(Effect.fnUntraced(function*({ id }) {
        runs++
        const value = yield* DurableDeferred.await(Gate)
        return `${value}-${id}`
      }))
      const payload = yield* encodePayload(ProgramResumable, { id: "one" }, Context.empty())

      const firstScope = Scope.makeUnsafe()
      const first = yield* makeClusterWorkflowProgram(state, {
        workflows,
        workflowClassName: "CustomWorkflow"
      }).pipe(Effect.provideService(Scope.Scope, firstScope))
      yield* first.run(payload, { discard: true })
      yield* pollProgramUntil(first, ProgramResumable, "Suspended")
      assert.strictEqual(runs, 1)
      yield* Scope.close(firstScope, Exit.void)

      const secondScope = Scope.makeUnsafe()
      const second = yield* makeClusterWorkflowProgram(state, {
        workflows,
        workflowClassName: "CustomWorkflow"
      }).pipe(Effect.provideService(Scope.Scope, secondScope))
      const exit = yield* encodeExit(Exit.succeed("world"), Context.empty())
      yield* second.deferredDone(Gate.name, exit)
      const result = yield* pollProgramUntil(second, ProgramResumable, "Complete")

      assert(result._tag === "Complete" && Exit.isSuccess(result.exit))
      assert.strictEqual(result.exit.value, "world-one")
      assert.strictEqual(runs, 2)
      yield* Scope.close(secondScope, Exit.void)
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

  it.effect("rejects duplicate workflow registrations", () => {
    const namespace = new FakeWorkflowNamespace()
    const Duplicate = Workflow.make("Duplicate", {
      payload: {},
      idempotencyKey: () => "duplicate"
    })
    const workflows = Layer.merge(
      Duplicate.toLayer(() => Effect.void),
      Duplicate.toLayer(() => Effect.void)
    ).pipe(Layer.provideMerge(namespace.layer))

    return Effect.gen(function*() {
      const exit = yield* Effect.exit(Layer.build(workflows))
      assert(Exit.isFailure(exit))
      assert.include(Cause.pretty(exit.cause), "Workflow 'Duplicate' is already registered")
    })
  })

  it.effect("persists a suspended execution and resumes it after an isolate loss", () => {
    const namespace = new FakeWorkflowNamespace()
    const Gate = DurableDeferred.make("Resumable/Gate", { success: Schema.String })
    let runs = 0
    let activityRuns = 0
    const Resumable = Workflow.make("Resumable", {
      payload: { id: Schema.String },
      success: Schema.String,
      idempotencyKey: ({ id }) => id
    })
    const layer = Resumable.toLayer(Effect.fnUntraced(function*({ id }) {
      runs++
      const prefix = yield* Activity.make({
        name: "prefix",
        success: Schema.String,
        execute: Effect.sync(() => {
          activityRuns++
          return "hello"
        })
      })
      const value = yield* DurableDeferred.await(Gate)
      return `${prefix}-${value}-${id}`
    })).pipe(Layer.provideMerge(namespace.layer))

    return Effect.gen(function*() {
      const executionId = yield* Resumable.executionId({ id: "one" })
      yield* Resumable.execute({ id: "one" }, { discard: true })
      yield* pollUntil(Resumable, executionId, "Suspended")
      assert.strictEqual(runs, 1)
      assert.strictEqual(activityRuns, 1)

      namespace.crash()
      const token = DurableDeferred.tokenFromExecutionId(Gate, { workflow: Resumable, executionId })
      yield* DurableDeferred.succeed(Gate, { token, value: "world" })
      const result = yield* pollUntil(Resumable, executionId, "Complete")
      assert(result._tag === "Complete" && Exit.isSuccess(result.exit))
      assert.strictEqual(result.exit.value, "hello-world-one")
      // The replay re-ran the workflow body but replayed the stored activity.
      assert.strictEqual(runs, 2)
      assert.strictEqual(activityRuns, 1)

      assert.strictEqual(yield* Resumable.execute({ id: "one" }), "hello-world-one")
      assert.strictEqual(runs, 2)
    }).pipe(Effect.provide(layer))
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
    ).pipe(Layer.provideMerge(namespace.effectLayer))

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

  it.effect("schedules every DurableClock durably, including sub-minute sleeps", () => {
    const namespace = new FakeWorkflowNamespace()
    const Sleeper = Workflow.make("Sleeper", {
      payload: { id: Schema.String },
      success: Schema.String,
      idempotencyKey: ({ id }) => id
    })
    const layer = Sleeper.toLayer(() =>
      Effect.as(DurableClock.sleep({ name: "short", duration: "30 seconds" }), "woke")
    ).pipe(Layer.provideMerge(namespace.layer))

    return Effect.gen(function*() {
      const executionId = yield* Sleeper.executionId({ id: "one" })
      yield* Sleeper.execute({ id: "one" }, { discard: true })
      yield* pollUntil(Sleeper, executionId, "Suspended")

      const store = namespace.stores.get(encodeName("Sleeper", executionId))!
      assert.deepStrictEqual(Array.from(store.sql.clocks), [
        ["short", { deferredName: "DurableClock/short", wakeUp: 30_000, fired: false }]
      ])
      assert.strictEqual(store.alarm.current, 30_000)
      // An alarm wake has no `id.name`; the stored execution recovers it.
      const stored = loadExecution(store.sql.sql)
      assert.strictEqual(stored?.workflowName, "Sleeper")
      assert.strictEqual(stored?.executionId, executionId)

      namespace.now = 30_000
      yield* Effect.promise(() => namespace.fireDueAlarms())
      const result = yield* pollUntil(Sleeper, executionId, "Complete")
      assert(result._tag === "Complete" && Exit.isSuccess(result.exit))
      assert.strictEqual(result.exit.value, "woke")
      assert.strictEqual(store.sql.clocks.get("short")?.fired, true)
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

  it.effect("interrupts a suspended execution", () => {
    const namespace = new FakeWorkflowNamespace()
    const Gate = DurableDeferred.make("Interruptible/Gate")
    const Interruptible = Workflow.make("Interruptible", {
      payload: { id: Schema.String },
      idempotencyKey: ({ id }) => id
    })
    const layer = Interruptible.toLayer(() => DurableDeferred.await(Gate)).pipe(
      Layer.provideMerge(namespace.layer)
    )

    return Effect.gen(function*() {
      const executionId = yield* Interruptible.executionId({ id: "one" })
      yield* Interruptible.execute({ id: "one" }, { discard: true })
      yield* pollUntil(Interruptible, executionId, "Suspended")

      yield* Interruptible.interrupt(executionId)
      const result = yield* pollUntil(Interruptible, executionId, "Complete")
      assert(result._tag === "Complete" && Exit.isFailure(result.exit))
      assert.isTrue(Exit.hasInterrupts(result.exit))
    }).pipe(Effect.provide(layer))
  })
})
