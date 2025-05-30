/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import type { Pipeable } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as PrimaryKey from "effect/PrimaryKey"
import * as Schema from "effect/Schema"
import type * as AST from "effect/SchemaAST"
import { makeHashDigest } from "./internal/crypto.js"
import type { WorkflowEngine, WorkflowInstance } from "./WorkflowEngine.js"

/**
 * @since 1.0.0
 * @category Symbols
 */
export const TypeId: unique symbol = Symbol.for("@effect/workflow/Workflow")

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
  readonly execute: (
    payload: [keyof Payload["fields"]] extends [never] ? void
      : Schema.Simplify<Schema.Struct.Constructor<Payload["fields"]>>
  ) => Effect.Effect<
    Success["Type"],
    Error["Type"],
    WorkflowEngine | Registration<Name> | Payload["Context"] | Success["Context"] | Error["Context"]
  >
  readonly interrupt: (executionId: string) => Effect.Effect<void, never, WorkflowEngine | Registration<Name>>
  readonly toLayer: <R>(
    execute: (
      payload: Payload["Type"],
      executionId: string
    ) => Effect.Effect<Success["Type"], Error["Type"], R>
  ) => Layer.Layer<
    Registration<Name> | WorkflowEngine,
    never,
    | WorkflowEngine
    | Exclude<R, WorkflowEngine | WorkflowInstance>
    | Payload["Context"]
    | Success["Context"]
    | Error["Context"]
  >
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
export interface Registration<Name extends string> {
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
  readonly payloadSchema: Schema.Schema.Any
  readonly successSchema: Schema.Schema.Any
  readonly errorSchema: Schema.Schema.All
}

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
      payload: (Payload extends Schema.Struct.Fields ? Schema.Struct<Payload> : Payload)["Type"]
    ) => string
    readonly success?: Success
    readonly error?: Error
    readonly suspendedRetryInterval?: Duration.DurationInput | undefined
  }
): Workflow<Name, Payload extends Schema.Struct.Fields ? Schema.Struct<Payload> : Payload, Success, Error> => {
  const suspendedRetryInterval = options.suspendedRetryInterval ?? Duration.millis(500)
  const self: Workflow<Name, any, Success, Error> = {
    [TypeId]: TypeId,
    name: options.name,
    payloadSchema: Schema.isSchema(options.payload) ? options.payload : Schema.Struct(options.payload as any),
    successSchema: options.success ?? Schema.Void as any,
    errorSchema: options.error ?? Schema.Never as any,
    execute: Effect.fnUntraced(function*(fields: any) {
      const payload = self.payloadSchema.make(fields)
      const engine = yield* EngineTag
      const executionId = yield* makeHashDigest(options.idempotencyKey(payload))
      const loop: Effect.Effect<any, any> = Effect.flatMap(
        engine.execute(self as any, executionId, payload as any),
        (result) => {
          if (result._tag === "Complete") {
            return result.exit
          }
          return Effect.zipRight(Effect.sleep(suspendedRetryInterval), loop)
        }
      )
      return yield* loop
    }),
    interrupt: Effect.fnUntraced(function*(executionId: string) {
      const engine = yield* EngineTag
      yield* engine.interrupt(self as any, executionId)
    }),
    toLayer: (execute) =>
      Layer.effectContext(Effect.gen(function*() {
        const context = yield* Effect.context<never>()
        const engine = Context.unsafeGet(context, EngineTag)
        yield* engine.register(self as any, (payload, executionId) =>
          execute(payload as any, executionId).pipe(
            Effect.provide(context)
          ) as any)
        return EngineTag.context(engine)
      })) as any
  }

  return self
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const fromTaggedRequest = <S extends AnyTaggedRequestSchema>(schema: S, options?: {
  readonly suspendedRetryInterval?: Duration.DurationInput | undefined
}): Workflow<S["_tag"], S, S["success"], S["failure"]> =>
  make({
    name: schema._tag,
    payload: schema as any,
    success: schema.success,
    error: schema.failure,
    idempotencyKey: PrimaryKey.value,
    suspendedRetryInterval: options?.suspendedRetryInterval
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
    return Schema.declare((u): u is Complete<Success["Type"], Error["Type"]> => isResult(u) && u._tag === "Complete")
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
  }): Schema.transform<
    Schema.Struct<{ _tag: Schema.tag<"Complete">; exit: Schema.Exit<Success, Error, typeof Schema.Defect> }>,
    Schema.Schema<Complete<Success["Type"], Error["Type"]>, Complete<Success["Type"], Error["Type"]>>
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
    )
  }
}

/**
 * @since 1.0.0
 * @category Result
 */
export class Suspended extends Schema.TaggedClass<Suspended>("@effect/workflow/Workflow/Suspended")("Suspended", {}) {
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
): Schema.Union<
  [
    Schema.transform<
      Schema.Struct<{ _tag: Schema.tag<"Complete">; exit: Schema.Exit<Success, Error, typeof Schema.Defect> }>,
      Schema.Schema<Complete<Success["Type"], Error["Type"]>, Complete<Success["Type"], Error["Type"]>>
    >,
    typeof Suspended
  ]
> => Schema.Union(Complete.Schema(options), Suspended)

/**
 * @since 1.0.0
 * @category Result
 */
export const intoResult = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<Result<A, E>, never, R | WorkflowInstance> =>
  Effect.uninterruptibleMask((restore) =>
    Effect.withFiberRuntime((fiber) =>
      Effect.matchCause(restore(effect), {
        onSuccess: (value) => new Complete({ exit: Exit.succeed(value) }),
        onFailure(cause) {
          const instance = Context.unsafeGet(fiber.currentContext, InstanceTag)
          return instance.suspended ? new Suspended() : new Complete({ exit: Exit.failCause(cause) })
        }
      })
    )
  )
