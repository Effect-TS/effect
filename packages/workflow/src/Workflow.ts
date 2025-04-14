/**
 * @since 1.0.0
 */
import * as Rpc from "@effect/rpc/Rpc"
import * as RpcGroup from "@effect/rpc/RpcGroup"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PrimaryKey from "effect/PrimaryKey"
import * as Schema from "effect/Schema"
import * as Activity from "./Activity.js"
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
  const self: Workflow<Payload, Success, Error, R> = {
    [TypeId]: TypeId,
    name: options.name,
    payloadSchema: class Run extends Schema.Class<Run>(`@effect/workflow/${options.name}/Run`)(options.payload ?? {}) {
      [PrimaryKey.symbol]() {
        return ""
      }
    } as any,
    successSchema: options.success ?? Schema.Void as any,
    errorSchema: options.error ?? Schema.Never as any,
    execute: options.execute,
    layer: Layer.effectDiscard(Effect.gen(function*() {
      const context = yield* Effect.context<never>()
      const engine = yield* EngineTag
      yield* engine.register(self as any, (payload) =>
        options.execute(payload as any).pipe(
          Effect.provide(context)
        ) as any)
    })) as any
  }
  return self
}

/**
 * @since 1.0.0
 * @category Conversions
 */
export const toRpcGroup = <
  R,
  Payload extends Schema.Struct.Fields,
  Success extends Schema.Schema.Any,
  Error extends Schema.Schema.All
>(
  self: Workflow<Payload, Success, Error, R>
): RpcGroup.RpcGroup<
  | Rpc.Rpc<"run", Schema.Struct<Payload>, Success, Error>
  | Rpc.Rpc<"activity", typeof Activity.ActivityRequest, typeof Schema.Unknown, typeof Schema.Unknown>
> =>
  RpcGroup.make(
    Rpc.make("run", {
      success: self.successSchema,
      error: self.errorSchema,
      payload: self.payloadSchema
    }),
    Rpc.make("activity", {
      payload: Activity.ActivityRequest,
      success: Schema.Unknown,
      error: Schema.Unknown
    })
  )
