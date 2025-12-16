/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { constFalse, constTrue, dual, identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as PrimaryKey from "effect/PrimaryKey"
import type * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import type * as AST from "effect/SchemaAST"
import * as Scope from "effect/Scope"
import { makeHashDigest } from "./internal/crypto.js"
import type { WorkflowEngine, WorkflowInstance } from "./WorkflowEngine.js"

/**
 * @since 1.0.0
 * @category Symbols
 */
export const TypeId: unique symbol = Symbol.for("@effect/workflow/Workflow")

/**
 * @since 1.0.0
 */
export declare namespace Workflow {
  /**
   * Extracts the type of the Payload of a `Workflow`.
   *
   * @since 1.0.0
   * @category Type-level Utils
   */
  export type Payload<W extends Workflow<any, any, any, any>> = W extends Workflow<any, infer Payload, any, any>
    ? Payload["Type"]
    : never

  /**
   * Extracts the type of the Success of a `Workflow`.
   *
   * @since 1.0.0
   * @category Type-level Utils
   */
  export type Success<W extends Workflow<any, any, any, any>> = W extends Workflow<any, any, infer Success, any>
    ? Success["Type"]
    : never

  /**
   * Extracts the type of the Error of a `Workflow`.
   *
   * @since 1.0.0
   * @category Type-level Utils
   */
  export type Error<W extends Workflow<any, any, any, any>> = W extends Workflow<any, any, any, infer Error>
    ? Error["Type"]
    : never
}

/**
 * @since 1.0.0
 * @category Symbols
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category Models
 */
export interface Workflow<
  Name extends string,
  Payload extends AnyStructSchema,
  Success extends Schema.Schema.Any,
  Error extends Schema.Schema.All
> {
  readonly [TypeId]: TypeId
  readonly name: Name
  readonly payloadSchema: Payload
  readonly successSchema: Success
  readonly errorSchema: Error
  readonly annotations: Context.Context<never>

  /**
   * Add an annotation to the workflow.
   */
  annotate<I, S>(tag: Context.Tag<I, S>, value: S): Workflow<
    Name,
    Payload,
    Success,
    Error
  >

  /**
   * Add the annotations from a Context object to the workflow.
   */
  annotateContext<I>(context: Context.Context<I>): Workflow<
    Name,
    Payload,
    Success,
    Error
  >

  /**
   * Execute the workflow with the given payload.
   */
  readonly execute: <const Discard extends boolean = false>(
    payload: [keyof Payload["fields"]] extends [never] ? void
      : Schema.Simplify<Schema.Struct.Constructor<Payload["fields"]>>,
    options?: {
      readonly discard?: Discard
    }
  ) => Effect.Effect<
    Discard extends true ? string : Success["Type"],
    Discard extends true ? never : Error["Type"],
    WorkflowEngine | Payload["Context"] | Success["Context"] | Error["Context"]
  >

  /**
   * Poll a workflow execution for its current status.
   *
   * If the workflow has not run yet, it will return `undefined`, otherwise it
   * will return the current `Workflow.Result`.
   */
  readonly poll: (executionId: string) => Effect.Effect<
    Result<Success["Type"], Error["Type"]> | undefined,
    never,
    WorkflowEngine | Success["Context"] | Error["Context"]
  >

  /**
   * Interrupt a workflow execution for the given execution ID.
   */
  readonly interrupt: (executionId: string) => Effect.Effect<void, never, WorkflowEngine>

  /**
   * Manually resume a workflow execution for the given execution ID.
   */
  readonly resume: (executionId: string) => Effect.Effect<void, never, WorkflowEngine>

  /**
   * Create a layer that registers the workflow and provides an effect to
   * execute it.
   */
  readonly toLayer: <R>(
    execute: (
      payload: Payload["Type"],
      executionId: string
    ) => Effect.Effect<Success["Type"], Error["Type"], R>
  ) => Layer.Layer<
    never,
    never,
    | WorkflowEngine
    | Exclude<R, WorkflowEngine | WorkflowInstance | Execution<Name> | Scope.Scope>
    | Payload["Context"]
    | Success["Context"]
    | Error["Context"]
  >

  /**
   * For the given payload, compute the deterministic execution ID.
   */
  readonly executionId: (
    payload: Schema.Simplify<Schema.Struct.Constructor<Payload["fields"]>>
  ) => Effect.Effect<string>

  /**
   * Add compensation logic to an effect inside a Workflow. The compensation finalizer will be
   * called if the entire workflow fails, allowing you to perform cleanup or
   * other actions based on the success value and the cause of the workflow failure.
   *
   * NOTE: Compensation will not work for nested activities. Compensation
   * finalizers are only registered for top-level effects in the workflow.
   */
  readonly withCompensation: {
    <A, R2>(
      compensation: (value: A, cause: Cause.Cause<Error["Type"]>) => Effect.Effect<void, never, R2>
    ): <E, R>(
      effect: Effect.Effect<A, E, R>
    ) => Effect.Effect<A, E, R | R2 | WorkflowInstance | Execution<Name> | Scope.Scope>
    <A, E, R, R2>(
      effect: Effect.Effect<A, E, R>,
      compensation: (value: A, cause: Cause.Cause<Error["Type"]>) => Effect.Effect<void, never, R2>
    ): Effect.Effect<A, E, R | R2 | WorkflowInstance | Execution<Name> | Scope.Scope>
  }
}

/**
 * @since 1.0.0
 */
export interface AnyStructSchema extends Pipeable {
  readonly [Schema.TypeId]: any
  readonly make: any
  readonly Type: any
  readonly Encoded: any
  readonly Context: any
  readonly ast: AST.AST
  readonly fields: Schema.Struct.Fields
  readonly annotations: any
}

/**
 * @since 1.0.0
 * @category constructors
 */
export interface AnyTaggedRequestSchema extends AnyStructSchema {
  readonly _tag: string
  readonly Type: PrimaryKey.PrimaryKey
  readonly success: Schema.Schema.Any
  readonly failure: Schema.Schema.All
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface Execution<Name extends string> {
  readonly _: unique symbol
  readonly name: Name
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface Any {
  readonly [TypeId]: TypeId
  readonly name: string
  readonly payloadSchema: AnyStructSchema
  readonly successSchema: Schema.Schema.Any
  readonly errorSchema: Schema.Schema.All
  readonly annotations: Context.Context<never>
  readonly executionId: (payload: any) => Effect.Effect<string>
}

/**
 * @since 1.0.0
 * @category Models
 */
export type Requirements<Workflows extends Any> = Workflows extends Workflow<
  infer _Name,
  infer _Payload,
  infer _Success,
  infer _Error
> ? _Payload["Context"] | _Success["Context"] | _Error["Context"] :
  never

const EngineTag = Context.GenericTag<WorkflowEngine, WorkflowEngine["Type"]>(
  "@effect/workflow/WorkflowEngine" satisfies typeof WorkflowEngine.key
)

const InstanceTag = Context.GenericTag<WorkflowInstance, WorkflowInstance["Type"]>(
  "@effect/workflow/WorkflowEngine/WorkflowInstance" satisfies typeof WorkflowInstance.key
)

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = <
  const Name extends string,
  Payload extends Schema.Struct.Fields | AnyStructSchema,
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Error extends Schema.Schema.All = typeof Schema.Never
>(
  options: {
    readonly name: Name
    readonly payload: Payload
    readonly idempotencyKey: (
      payload: Payload extends Schema.Struct.Fields ? Schema.Struct.Type<Payload> : Payload["Type"]
    ) => string
    readonly success?: Success
    readonly error?: Error
    readonly suspendedRetrySchedule?: Schedule.Schedule<any, unknown> | undefined
    readonly annotations?: Context.Context<never>
  }
): Workflow<Name, Payload extends Schema.Struct.Fields ? Schema.Struct<Payload> : Payload, Success, Error> => {
  const makeExecutionId = (payload: any) => makeHashDigest(`${options.name}-${options.idempotencyKey(payload)}`)
  const self: Workflow<Name, any, Success, Error> = {
    [TypeId]: TypeId,
    name: options.name,
    payloadSchema: Schema.isSchema(options.payload) ? options.payload : Schema.Struct(options.payload as any),
    successSchema: options.success ?? Schema.Void as any,
    errorSchema: options.error ?? Schema.Never as any,
    annotations: options.annotations ?? Context.empty(),
    annotate(tag, value) {
      return make({
        ...options,
        annotations: Context.add(self.annotations, tag, value)
      })
    },
    annotateContext(context) {
      return make({
        ...options,
        annotations: Context.merge(self.annotations, context)
      })
    },
    execute: Effect.fnUntraced(
      function*(fields: any, opts) {
        const payload = self.payloadSchema.make(fields)
        const engine = yield* EngineTag
        const executionId = yield* makeExecutionId(payload)
        yield* Effect.annotateCurrentSpan({ executionId })
        return yield* engine.execute(self, {
          executionId,
          payload,
          discard: opts?.discard,
          suspendedRetrySchedule: options.suspendedRetrySchedule
        })
      },
      Effect.withSpan(`${options.name}.execute`, { captureStackTrace: false })
    ),
    poll: Effect.fnUntraced(
      function*(executionId: string) {
        const engine = yield* EngineTag
        return yield* engine.poll(self, executionId)
      },
      (effect, executionId) =>
        Effect.withSpan(effect, `${options.name}.poll`, {
          captureStackTrace: false,
          attributes: { executionId }
        })
    ),
    interrupt: Effect.fnUntraced(
      function*(executionId: string) {
        const engine = yield* EngineTag
        yield* engine.interrupt(self, executionId)
      },
      (effect, executionId) =>
        Effect.withSpan(effect, `${options.name}.interrupt`, {
          captureStackTrace: false,
          attributes: { executionId }
        })
    ),
    resume: Effect.fnUntraced(
      function*(executionId: string) {
        const engine = yield* EngineTag
        yield* engine.resume(self, executionId)
      },
      (effect, executionId) =>
        Effect.withSpan(effect, `${options.name}.resume`, {
          captureStackTrace: false,
          attributes: { executionId }
        })
    ),
    toLayer: (execute) =>
      Layer.scopedDiscard(Effect.gen(function*() {
        const engine = yield* EngineTag
        return yield* engine.register(self, execute)
      })) as any,
    executionId: (payload) => makeExecutionId(self.payloadSchema.make(payload)),
    withCompensation
  }

  return self
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const fromTaggedRequest = <S extends AnyTaggedRequestSchema>(schema: S, options?: {
  readonly suspendedRetrySchedule?: Schedule.Schedule<any, unknown> | undefined
}): Workflow<S["_tag"], S, S["success"], S["failure"]> =>
  make({
    name: schema._tag,
    payload: schema as any,
    success: schema.success,
    error: schema.failure,
    idempotencyKey: PrimaryKey.value,
    suspendedRetrySchedule: options?.suspendedRetrySchedule
  })

/**
 * @since 1.0.0
 * @category Result
 */
export const ResultTypeId: unique symbol = Symbol.for("@effect/workflow/Workflow/Result")

/**
 * @since 1.0.0
 * @category Result
 */
export type ResultTypeId = typeof ResultTypeId

/**
 * @since 1.0.0
 * @category Result
 */
export const isResult = <A = unknown, E = unknown>(u: unknown): u is Result<A, E> =>
  Predicate.hasProperty(u, ResultTypeId)

/**
 * @since 1.0.0
 * @category Result
 */
export type Result<A, E> = Complete<A, E> | Suspended

/**
 * @since 1.0.0
 * @category Result
 */
export type ResultEncoded<A, E> = CompleteEncoded<A, E> | typeof Suspended.Encoded

/**
 * @since 1.0.0
 * @category Result
 */
export class Complete<A, E> extends Data.TaggedClass("Complete")<{
  readonly exit: Exit.Exit<A, E>
}> {
  /**
   * @since 1.0.0
   */
  readonly [ResultTypeId]: ResultTypeId = ResultTypeId

  /**
   * @since 1.0.0
   */
  static SchemaFromSelf<Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(_options: {
    readonly success: Success
    readonly error: Error
  }): Schema.Schema<Complete<Success["Type"], Error["Type"]>> {
    return Schema.declare((u): u is Complete<Success["Type"], Error["Type"]> => isResult(u) && u._tag === "Complete", {
      typeConstructor: { _tag: "effect/workflow/Workflow.Complete" }
    })
  }

  /**
   * @since 1.0.0
   */
  static SchemaEncoded<Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(options: {
    readonly success: Success
    readonly error: Error
  }) {
    return Schema.Struct({
      _tag: Schema.tag("Complete"),
      exit: Schema.Exit({ success: options.success, failure: options.error, defect: Schema.Defect })
    })
  }

  /**
   * @since 1.0.0
   */
  static Schema<Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(options: {
    readonly success: Success
    readonly error: Error
  }): Schema.Schema<
    Complete<Success["Type"], Error["Type"]>,
    CompleteEncoded<Success["Encoded"], Error["Encoded"]>
  > {
    return Schema.transform(
      this.SchemaEncoded(options),
      this.SchemaFromSelf(options),
      {
        decode(fromA) {
          return new Complete({ exit: fromA.exit })
        },
        encode(toI) {
          return toI
        }
      }
    ) as any
  }
}

/**
 * @since 1.0.0
 * @category Result
 */
export interface CompleteEncoded<A, E> {
  readonly _tag: "Complete"
  readonly exit: Schema.ExitEncoded<A, E, unknown>
}

/**
 * @since 1.0.0
 * @category Result
 */
export class Suspended extends Schema.TaggedClass<Suspended>("@effect/workflow/Workflow/Suspended")("Suspended", {
  cause: Schema.optional(Schema.Cause({ error: Schema.Never, defect: Schema.Defect }))
}) {
  /**
   * @since 1.0.0
   */
  readonly [ResultTypeId]: ResultTypeId = ResultTypeId
}

/**
 * @since 1.0.0
 * @category Result
 */
export const Result = <Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
  options: {
    readonly success: Success
    readonly error: Error
  }
): Schema.Schema<
  Result<Success["Type"], Error["Type"]>,
  ResultEncoded<Success["Encoded"], Error["Encoded"]>,
  Success["Context"] | Error["Context"]
> => Schema.Union(Complete.Schema(options), Suspended)

/**
 * @since 1.0.0
 * @category Result
 */
export const intoResult = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<Result<A, E>, never, Exclude<R, Scope.Scope> | WorkflowInstance> =>
  Effect.contextWithEffect((context: Context.Context<WorkflowInstance>) => {
    const instance = Context.get(context, InstanceTag)
    const captureDefects = Context.get(instance.workflow.annotations, CaptureDefects)
    const suspendOnFailure = Context.get(instance.workflow.annotations, SuspendOnFailure)
    return effect.pipe(
      // So we can use external interruption to suspend a workflow
      Effect.fork,
      Effect.flatMap((fiber) => Effect.onInterrupt(Fiber.join(fiber), () => Fiber.interrupt(fiber))),
      Effect.interruptible,
      suspendOnFailure ?
        Effect.catchAllCause((cause) => {
          instance.suspended = true
          if (!Cause.isInterruptedOnly(cause)) {
            instance.cause = Cause.die(Cause.squash(cause))
          }
          return Effect.interrupt
        }) :
        identity,
      Effect.scoped,
      Effect.matchCauseEffect({
        onSuccess: (value) => Effect.succeed(new Complete({ exit: Exit.succeed(value) })),
        onFailure: (cause): Effect.Effect<Result<A, E>> =>
          instance.suspended
            ? Effect.succeed(new Suspended({ cause: instance.cause }))
            : (!instance.interrupted && Cause.isInterruptedOnly(cause)) || (!captureDefects && Cause.isDie(cause))
            ? Effect.failCause(cause as Cause.Cause<never>)
            : Effect.succeed(new Complete({ exit: Exit.failCause(cause) }))
      }),
      Effect.onExit((exit) => {
        if (Exit.isFailure(exit)) {
          return Scope.close(instance.scope, exit)
        } else if (exit.value._tag === "Complete") {
          return Scope.close(instance.scope, exit.value.exit)
        }
        return Effect.void
      }),
      Effect.uninterruptible
    )
  })

/**
 * @since 1.0.0
 * @category Result
 */
export const wrapActivityResult = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  isSuspend: (value: A) => boolean
): Effect.Effect<A, E, R | WorkflowInstance> =>
  Effect.contextWithEffect((context: Context.Context<WorkflowInstance>) => {
    const instance = Context.get(context, InstanceTag)
    const state = instance.activityState
    if (instance.suspended) {
      return waitForZero(instance).pipe(
        Effect.andThen(suspend(instance))
      )
    }
    if (state.count === 0) state.latch.unsafeClose()
    state.count++
    return Effect.onExit(effect, (exit) => {
      state.count--
      const isSuspended = Exit.isSuccess(exit) && isSuspend(exit.value)
      if (Exit.isSuccess(exit) && isResult(exit.value) && exit.value._tag === "Suspended" && exit.value.cause) {
        instance.cause = instance.cause ? Cause.sequential(instance.cause, exit.value.cause) : exit.value.cause
      }
      return state.count === 0 ? state.latch.open : isSuspended ? waitForZero(instance) : Effect.void
    })
  })

const waitForZero = Effect.fnUntraced(function*(instance: WorkflowInstance["Type"]) {
  const state = instance.activityState
  while (true) {
    if (state.count > 0) {
      yield* state.latch.await
      yield* Effect.yieldNow()
      continue
    }
    yield* Effect.yieldNow()
    if (state.count === 0) return
  }
})

/**
 * Accesses the workflow scope.
 *
 * The workflow scope is only closed when the workflow execution fully
 * completes.
 *
 * @since 1.0.0
 * @category Scope
 */
export const scope: Effect.Effect<
  Scope.Scope,
  never,
  WorkflowInstance
> = Effect.map(InstanceTag, (instance) => instance.scope as Scope.Scope)

/**
 * Provides the workflow scope to the given effect.
 *
 * The workflow scope is only closed when the workflow execution fully
 * completes.
 *
 * @since 1.0.0
 * @category Scope
 */
export const provideScope = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, Exclude<R, Scope.Scope> | WorkflowInstance> =>
  Effect.flatMap(scope, (scope) => Scope.extend(effect, scope))

/**
 * @since 1.0.0
 * @category Scope
 */
export const addFinalizer: <R>(
  f: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<void, never, R>
) => Effect.Effect<
  void,
  never,
  WorkflowInstance | R
> = Effect.fnUntraced(function*<R>(
  f: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<void, never, R>
) {
  const scope = (yield* InstanceTag).scope
  const runtime = yield* Effect.runtime<R>()
  yield* Scope.addFinalizerExit(scope, (exit) => Effect.provide(f(exit), runtime))
})

/**
 * Add compensation logic to an effect inside a Workflow. The compensation finalizer will be
 * called if the entire workflow fails, allowing you to perform cleanup or
 * other actions based on the success value and the cause of the workflow failure.
 *
 * NOTE: Compensation will not work for nested activities. Compensation
 * finalizers are only registered for top-level effects in the workflow.
 *
 * @since 1.0.0
 * @category Compensation
 */
export const withCompensation: {
  <A, R2>(
    compensation: (value: A, cause: Cause.Cause<unknown>) => Effect.Effect<void, never, R2>
  ): <E, R>(
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E, R | R2 | WorkflowInstance | Scope.Scope>
  <A, E, R, R2>(
    effect: Effect.Effect<A, E, R>,
    compensation: (value: A, cause: Cause.Cause<unknown>) => Effect.Effect<void, never, R2>
  ): Effect.Effect<A, E, R | R2 | WorkflowInstance | Scope.Scope>
} = dual(2, <A, E, R, R2>(
  effect: Effect.Effect<A, E, R>,
  compensation: (value: A, cause: Cause.Cause<unknown>) => Effect.Effect<void, never, R2>
): Effect.Effect<A, E, R | R2 | WorkflowInstance | Scope.Scope> =>
  Effect.uninterruptibleMask((restore) =>
    Effect.tap(
      restore(effect),
      (value) => addFinalizer((exit) => Exit.isSuccess(exit) ? Effect.void : compensation(value, exit.cause))
    )
  ))

/**
 * @since 1.0.0
 */
export const suspend = (instance: WorkflowInstance["Type"]): Effect.Effect<never> =>
  Effect.interruptible(Effect.async<never>(() => {
    instance.suspended = true
    const fiber = Option.getOrThrow(Fiber.getCurrentFiber())
    fiber.unsafeInterruptAsFork(fiber.id())
  }))

/**
 * If you set this annotation to `true` for a workflow, it will capture defects
 * and include them in the result of the workflow or it's activities.
 *
 * By default, this is set to `true`, meaning that defects will be captured.
 *
 * @since 1.0.0
 * @category Annotations
 */
export class CaptureDefects extends Context.Reference<CaptureDefects>()("@effect/workflow/Workflow/CaptureDefects", {
  defaultValue: constTrue
}) {}

/**
 * If you set this annotation to `true` for a workflow, it will suspend if it
 * encounters any kind of error.
 *
 * You can then manually resume the workflow later with
 * `Workflow.resume(executionId)`.
 *
 * @since 1.0.0
 * @category Annotations
 */
export class SuspendOnFailure
  extends Context.Reference<SuspendOnFailure>()("@effect/workflow/Workflow/SuspendOnFailure", {
    defaultValue: constFalse
  })
{}
