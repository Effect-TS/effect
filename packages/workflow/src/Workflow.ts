/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PrimaryKey from "effect/PrimaryKey"
import * as Schema from "effect/Schema"
import type { WorkflowEngine } from "./WorkflowEngine.js"

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
  Payload extends Schema.Struct.Fields,
  Success extends Schema.Schema.Any,
  Error extends Schema.Schema.All,
  R
> {
  readonly [TypeId]: TypeId
  readonly name: string
  readonly payloadSchema: Schema.Struct<Payload>
  readonly successSchema: Success
  readonly errorSchema: Error
  readonly execute: (
    executionId: string,
    payload: Schema.Struct.Constructor<Payload>
  ) => Effect.Effect<
    Success["Type"],
    Error["Type"],
    WorkflowEngine | Schema.Struct.Context<Payload> | Success["Context"] | Error["Context"]
  >
  readonly layer: Layer.Layer<
    never,
    never,
    WorkflowEngine | R | Schema.Struct.Context<Payload> | Success["Context"] | Error["Context"]
  >
}

const EngineTag = Context.GenericTag<WorkflowEngine, WorkflowEngine["Type"]>("@effect/workflow/WorkflowEngine")

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = <
  R,
  Payload extends Schema.Struct.Fields = {},
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Error extends Schema.Schema.All = typeof Schema.Never
>(options: {
  readonly name: string
  readonly success?: Success
  readonly payload?: Payload
  readonly error?: Error
  readonly execute: (payload: Schema.Struct<Payload>["Type"]) => Effect.Effect<Success["Type"], Error["Type"], R>
}): Workflow<Payload, Success, Error, R> => {
  class Request extends Schema.Class<Request>(`@effect/workflow/${options.name}/Request`)(options.payload ?? {}) {
    [PrimaryKey.symbol]() {
      return ""
    }
  }

  const self: Workflow<Payload, Success, Error, R> = {
    [TypeId]: TypeId,
    name: options.name,
    payloadSchema: Request as any,
    successSchema: options.success ?? Schema.Void as any,
    errorSchema: options.error ?? Schema.Never as any,
    execute(executionId: string, payload: Schema.Struct.Constructor<Payload>) {
      return Effect.flatMap(EngineTag, (engine) => engine.execute(self as any, executionId, payload as any))
    },
    layer: Layer.effectDiscard(Effect.gen(function*() {
      const context = yield* Effect.context<never>()
      const engine = Context.unsafeGet(context, EngineTag)
      yield* engine.register(self as any, (payload) =>
        options.execute(payload as any).pipe(
          Effect.provide(context)
        ) as any)
    })) as any
  }

  return self
}
