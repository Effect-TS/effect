/**
 * @since 1.0.0
 */
import type * as Envelope from "@effect/cluster/Envelope"
import * as Schema from "@effect/schema/Schema"
import type * as Serializable from "@effect/schema/Serializable"
import * as Array from "effect/Array"
import * as Clock from "effect/Clock"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Activity from "./Activity.js"
import * as WorkflowContext from "./WorkflowContext.js"

/**
 * @since 1.0.0
 */
export interface Workflow<T extends Envelope.Envelope.AnyMessage, R> {
  schema: Schema.Schema<T, Serializable.Serializable.Encoded<T>, Serializable.Serializable.Context<T>>
  execute: (
    input: T
  ) => Effect.Effect<
    Serializable.WithResult.Success<T>,
    Serializable.WithResult.Error<T>,
    R | WorkflowContext.WorkflowContext
  >
  executionId: (input: T) => string
  version: (input: T) => string
}

/**
 * @since 1.0.0
 */
export namespace Workflow {
  /**
   * @since 1.0.0
   */
  export type Any = Workflow<any, any>

  /**
   * @since 1.0.0
   */
  export type Context<A> = A extends Workflow<infer _T, infer R> ? R : never

  /**
   * @since 1.0.0
   */
  export type Request<A> = A extends Workflow<infer T, infer _R> ? T : never
}

/**
 * @since 1.0.0
 */
export function make<T extends Envelope.Envelope.AnyMessage, R>(
  schema: Schema.Schema<T, Serializable.Serializable.Encoded<T>, Serializable.Serializable.Context<T>>,
  messageId: (input: T) => string,
  execute: (
    input: T
  ) => Effect.Effect<Serializable.WithResult.Success<T>, Serializable.WithResult.Error<T>, R>,
  version?: (input: T) => string
): Workflow<T, Exclude<R, WorkflowContext.WorkflowContext>> {
  return ({
    schema: schema as any,
    executionId: messageId,
    execute: execute as any,
    version: version || (() => "")
  })
}

/**
 * @since 1.0.0
 */
export function union<WFs extends ReadonlyArray<Workflow.Any>>(
  ...wfs: WFs
) {
  return make<Workflow.Request<WFs[number]>, Workflow.Context<WFs[number]>>(
    Schema.Union(...wfs.map((_) => _.schema)) as any,
    (request) =>
      pipe(
        wfs,
        Array.findFirst((_) => Schema.is(_.schema)(request)),
        Option.map((_) => _.executionId(request)),
        Option.getOrElse(() => "")
      ),
    (request) =>
      pipe(
        wfs,
        Array.findFirst((_) => Schema.is(_.schema)(request)),
        Option.map((_) => _.execute(request) as any),
        Option.getOrElse(() => Effect.die("unknown workflow input"))
      ),
    (request) =>
      pipe(
        wfs,
        Array.findFirst((_) => Schema.is(_.schema)(request)),
        Option.map((_) => _.version(request)),
        Option.getOrElse(() => "")
      )
  )
}

function remainingDuration(persistenceId: string, duration: Duration.Duration) {
  const startedAtActivity = Activity.make(persistenceId, Schema.Number, Schema.Never)(pipe(
    Clock.currentTimeMillis
  ))

  return pipe(
    startedAtActivity,
    Effect.flatMap(
      (startedAtMillis) =>
        pipe(
          Clock.currentTimeMillis,
          Effect.map((currentMillis) => Math.max(0, startedAtMillis + Duration.toMillis(duration) - currentMillis)),
          Effect.map(Duration.millis)
        )
    )
  )
}

/**
 * @since 1.0.0
 */
export const sleep = (persistenceId: string, duration: Duration.Duration) =>
  Effect.gen(function*(_) {
    const remaining = yield* _(remainingDuration(persistenceId, duration))
    yield* _(Effect.sleep(remaining))
  })

/**
 * @since 1.0.0
 */
export const timeout = (persistenceId: string, duration: Duration.Duration) => <R, E, A>(fa: Effect.Effect<R, E, A>) =>
  Effect.gen(function*(_) {
    const remaining = yield* _(remainingDuration(persistenceId, duration))
    yield* _(Effect.timeout(fa, remaining))
  })

/**
 * @since 1.0.0
 */
export const yieldExecution = Effect.flatMap(WorkflowContext.WorkflowContext, (ctx) => ctx.yieldExecution)
