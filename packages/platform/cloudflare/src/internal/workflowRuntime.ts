/**
 * The workflow Durable Object runtime. One object holds one workflow
 * execution: its payload, run result, activity results keyed
 * `${name}/${attempt}`, durable deferred exits, and the clock due table behind
 * the single alarm. Handlers are looked up in the module-level workflow
 * registry and built once per wake; a crash or hibernation wipes RAM and the
 * next contact replays the execution from SQLite.
 *
 * @internal
 */
import type { SqlStorage } from "@cloudflare/workers-types"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as DurableClock from "effect/unstable/workflow/DurableClock"
import * as Workflow from "effect/unstable/workflow/Workflow"
import * as WorkflowEngine from "effect/unstable/workflow/WorkflowEngine"
import { decodeName, encodeName } from "./clusterName.ts"
import { armAlarm, type EntityAlarm } from "./entityStorage.ts"
import {
  CurrentExecutionHandle,
  deferredState,
  getWorkflowRegistration,
  type WorkflowRunOptions,
  type WorkflowStub
} from "./workflowRegistry.ts"
import * as WorkflowStorage from "./workflowStorage.ts"
import { decodeExit, decodePayload, encodeExit, encodeResult } from "./workflowWire.ts"

/** @internal */
export const InterruptSignalName = "Workflow/InterruptSignal"

let voidExitCache: Promise<string> | undefined
const voidExitText = (): Promise<
  string
> => (voidExitCache ??= Effect.runPromise(encodeExit(Exit.void, Context.empty())))

/** @internal */
export interface WorkflowRuntimeOptions {
  readonly name: string
  readonly sql: SqlStorage
  readonly alarm: EntityAlarm
  readonly now: () => number
  readonly waitUntil: (promise: Promise<unknown>) => void
  readonly getStub: (name: string) => WorkflowStub
}

/** @internal */
export interface WorkflowRuntime extends WorkflowStub {
  readonly executionId: string
  readonly loadActivity: (key: string) => string | undefined
  readonly saveActivity: (key: string, exit: string) => void
  readonly loadDeferred: (name: string) => string | undefined
  readonly runAlarm: () => Promise<void>
}

interface Inflight {
  readonly instance: WorkflowEngine.WorkflowInstance["Service"]
  readonly fiber: Fiber.Fiber<{
    readonly result: Workflow.Result<unknown, unknown>
    readonly text: string
  }, unknown>
  readonly promise: Promise<string>
}

/** @internal */
export const makeWorkflowRuntime = (options: WorkflowRuntimeOptions): WorkflowRuntime => {
  const name = decodeName(options.name)
  if (name === undefined) {
    throw new Error("ClusterWorkflow requires a canonical workflow Durable Object name")
  }
  const workflowName = name.type
  const executionId = name.id
  const sql = options.sql

  WorkflowStorage.ensureWorkflowStorage(sql)

  let inflight: Inflight | undefined
  let resumeRequested = false

  const isComplete = (result: string | undefined): boolean =>
    result !== undefined && (JSON.parse(result) as { readonly _tag?: unknown })._tag === "Complete"

  const parentStub = (parent: { readonly workflowName: string; readonly executionId: string }): WorkflowStub =>
    options.getStub(encodeName(parent.workflowName, parent.executionId))

  const startAttempt = (row: WorkflowStorage.ExecutionRow): Promise<string> => {
    const registration = getWorkflowRegistration(workflowName)
    if (registration === undefined) {
      return Promise.reject(new Error(`No workflow registered for name: ${workflowName}`))
    }
    const workflow = registration.workflow
    const instance = WorkflowEngine.WorkflowInstance.initial(workflow, executionId)
    const execute = decodePayload(workflow, row.payload, registration.context).pipe(
      Effect.flatMap((payload) => registration.execute(payload, executionId) as Effect.Effect<unknown, unknown>),
      Effect.onExit((exit) => {
        const suspendOnFailure = Context.get(workflow.annotations, Workflow.SuspendOnFailure)
        if (!instance.suspended && !(suspendOnFailure && exit._tag === "Failure")) {
          return Effect.void
        }
        if (WorkflowStorage.loadDeferred(sql, InterruptSignalName) === undefined) {
          return Effect.void
        }
        instance.suspended = false
        instance.interrupted = true
        return Effect.withFiber<void>((fiber) => Effect.interruptible(Fiber.interrupt(fiber)))
      }),
      Workflow.intoResult,
      (effect) => deferredState.trackRun(instance, effect),
      Effect.flatMap((result) =>
        Effect.map(encodeResult(workflow, result, registration.context), (text) => ({ result, text }))
      ),
      Effect.provideService(DurableClock.InMemoryThreshold, Duration.zero),
      Effect.provideService(CurrentExecutionHandle, runtime)
    )
    const fiber = Effect.runFork(execute)
    const promise = Effect.runPromise(Fiber.await(fiber)).then((exit) => {
      inflight = undefined
      if (Exit.isFailure(exit)) {
        // No auto-replay after a defect: it would hot-loop a defecting
        // workflow. The next external contact replays from storage.
        resumeRequested = false
        return Effect.runPromise(Effect.logError("Workflow execution failed", exit.cause)).then(() =>
          Promise.reject(Cause.squash(exit.cause))
        )
      }
      const { result, text } = exit.value
      WorkflowStorage.saveResult(sql, text)
      if (result._tag === "Complete") {
        WorkflowStorage.setResumePending(sql, false)
        resumeRequested = false
        const parent = WorkflowStorage.loadExecution(sql)?.parent
        if (parent !== undefined) {
          options.waitUntil(parentStub(parent).resume().then(() => undefined, () => undefined))
        }
      } else if (resumeRequested) {
        resumeRequested = false
        options.waitUntil(startAttempt(row).then(() => undefined, () => undefined))
      } else {
        // This attempt observed every persisted deferred and still suspended,
        // so the pending resume (if any) has been serviced.
        WorkflowStorage.setResumePending(sql, false)
      }
      return text
    })
    inflight = { instance, fiber, promise }
    return promise
  }

  const run = (payload: string, opts: WorkflowRunOptions): Promise<string> => {
    let row = WorkflowStorage.loadExecution(sql)
    if (row === undefined) {
      WorkflowStorage.createExecution(sql, workflowName, executionId, payload, opts.parent)
      row = { workflowName, payload, parent: opts.parent, result: undefined, resumePending: false }
    } else if (opts.parent !== undefined && row.parent === undefined) {
      // An execution started standalone can gain a parent later; keep the
      // first parent so its completion still wakes that parent.
      WorkflowStorage.setParent(sql, opts.parent)
      row = { ...row, parent: opts.parent }
    }
    if (inflight !== undefined) {
      if (!opts.discard) return inflight.promise
    } else if (row.result === undefined) {
      const attempt = startAttempt(row)
      if (!opts.discard) return attempt
      options.waitUntil(attempt.then(() => undefined, () => undefined))
    } else if (!opts.discard) {
      return Promise.resolve(row.result)
    }
    return Promise.resolve("")
  }

  const resume = (): Promise<void> => {
    const row = WorkflowStorage.loadExecution(sql)
    if (row === undefined || isComplete(row.result)) return Promise.resolve()
    if (inflight !== undefined) {
      resumeRequested = true
      return Promise.resolve()
    }
    options.waitUntil(startAttempt(row).then(() => undefined, () => undefined))
    return Promise.resolve()
  }

  const deferredDone = (deferredName: string, exitText: string): Promise<void> => {
    if (!WorkflowStorage.saveDeferred(sql, deferredName, exitText)) return Promise.resolve()
    // Persisted with the exit in the same write batch: if this wake is lost
    // before the replay finishes, the next wake replays the execution.
    WorkflowStorage.setResumePending(sql, true)
    return Effect.runPromise(
      Effect.flatMap(
        decodeExit(exitText, Context.empty()),
        (exit) => deferredState.deferredDone(executionId, deferredName, exit)
      )
    ).then(() => resume())
  }

  const interrupt = (): Promise<void> => {
    const row = WorkflowStorage.loadExecution(sql)
    if (row === undefined || isComplete(row.result)) return Promise.resolve()
    return voidExitText().then((exitText) => deferredDone(InterruptSignalName, exitText))
  }

  const interruptUnsafe = (): Promise<void> => {
    const current = inflight
    const signalled = interrupt()
    if (current === undefined) return signalled
    current.instance.interrupted = true
    return signalled
      .then(() => Effect.runPromise(Fiber.interrupt(current.fiber)))
      .then(() => undefined)
  }

  const scheduleClock = (clockName: string, deferredName: string, wakeUp: number): Promise<void> => {
    WorkflowStorage.saveClock(sql, clockName, deferredName, wakeUp)
    const earliest = WorkflowStorage.earliestClockWakeUp(sql)
    return earliest === undefined ? Promise.resolve() : Effect.runPromise(armAlarm(options.alarm, earliest))
  }

  const runAlarm = (): Promise<void> =>
    voidExitText().then((voidExit) => {
      const completed = WorkflowStorage.dueClocks(sql, options.now()).filter((clock) => {
        WorkflowStorage.markClockFired(sql, clock.name)
        return WorkflowStorage.saveDeferred(sql, clock.deferredName, voidExit)
      })
      return Effect.runPromise(Effect.forEach(
        completed,
        (clock) => deferredState.deferredDone(executionId, clock.deferredName, Exit.void),
        { discard: true }
      )).then(() => completed.length === 0 ? undefined : resume()).then(() => {
        const earliest = WorkflowStorage.earliestClockWakeUp(sql)
        return earliest === undefined ? undefined : Effect.runPromise(armAlarm(options.alarm, earliest))
      })
    }).then(() => undefined)

  const runtime: WorkflowRuntime = {
    executionId,
    run,
    poll: () => Promise.resolve(WorkflowStorage.loadExecution(sql)?.result),
    resume,
    interrupt,
    interruptUnsafe,
    deferredDone,
    scheduleClock,
    runAlarm,
    loadActivity: (key) => WorkflowStorage.loadActivity(sql, key),
    saveActivity: (key, exit) => WorkflowStorage.saveActivity(sql, key, exit),
    loadDeferred: (deferredName) => WorkflowStorage.loadDeferred(sql, deferredName)
  }

  // Self-heal on wake: a resume recorded by deferredDone but lost with the
  // previous isolate replays now instead of waiting for external contact.
  const stored = WorkflowStorage.loadExecution(sql)
  if (stored !== undefined && stored.resumePending && !isComplete(stored.result)) {
    options.waitUntil(startAttempt(stored).then(() => undefined, () => undefined))
  }

  return runtime
}
