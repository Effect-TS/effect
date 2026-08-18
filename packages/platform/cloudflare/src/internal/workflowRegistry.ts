/**
 * Module-level workflow state shared between the Worker layer and the workflow
 * Durable Object instances of the same isolate. Registrations are recorded at
 * Worker init; a running execution provides its own handle through
 * `CurrentExecutionHandle` so engine operations inside the run hit local
 * SQLite instead of a self-RPC.
 *
 * @internal
 */
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Workflow from "effect/unstable/workflow/Workflow"
import * as WorkflowEngine from "effect/unstable/workflow/WorkflowEngine"

/** @internal */
export interface WorkflowRegistration {
  readonly workflow: Workflow.Any
  readonly execute: (
    payload: object,
    executionId: string
  ) => Effect.Effect<unknown, unknown, WorkflowEngine.WorkflowInstance | WorkflowEngine.WorkflowEngine>
  readonly context: Context.Context<never>
}

const registrations = new Map<string, WorkflowRegistration>()

/** @internal */
export const getWorkflowRegistration = (name: string): WorkflowRegistration | undefined => registrations.get(name)

/** @internal */
export const registerWorkflow = (name: string, registration: WorkflowRegistration): boolean => {
  if (registrations.has(name)) return false
  registrations.set(name, registration)
  return true
}

/** @internal */
export const unregisterWorkflow = (name: string, registration: WorkflowRegistration): void => {
  if (registrations.get(name) === registration) registrations.delete(name)
}

/** @internal */
export interface WorkflowRunOptions {
  readonly discard: boolean
  readonly parent?: { readonly workflowName: string; readonly executionId: string } | undefined
}

/**
 * The transport shared by workflow Durable Object stubs and same-isolate
 * execution handles. All payloads are JSON text.
 *
 * @internal
 */
export interface WorkflowStub {
  readonly run: (payload: string, options: WorkflowRunOptions) => Promise<string>
  readonly poll: () => Promise<string | undefined>
  readonly resume: () => Promise<void>
  readonly interrupt: () => Promise<void>
  readonly interruptUnsafe: () => Promise<void>
  readonly deferredDone: (name: string, exit: string) => Promise<void>
  readonly scheduleClock: (name: string, deferredName: string, wakeUp: number) => Promise<void>
}

/** @internal */
export interface WorkflowExecutionHandle extends WorkflowStub {
  readonly executionId: string
  readonly loadActivity: (key: string) => string | undefined
  readonly saveActivity: (key: string, exit: string) => void
  readonly loadDeferred: (name: string) => string | undefined
}

/**
 * The handle of the workflow execution currently running in this fiber,
 * provided by the workflow Durable Object runtime around each run attempt.
 *
 * @internal
 */
export class CurrentExecutionHandle extends Context.Service<CurrentExecutionHandle, WorkflowExecutionHandle>()(
  "@effect/platform-cloudflare/CloudflareWorkflowEngine/CurrentExecutionHandle"
) {}

/** @internal */
export const deferredState = WorkflowEngine.makeDeferredState()
