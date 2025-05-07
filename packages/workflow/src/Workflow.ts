/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as PrimaryKey from "effect/PrimaryKey"
import * as Schema from "effect/Schema"
import type { Scope } from "effect/Scope"
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
  Payload extends Schema.Struct.Fields,
  Success extends Schema.Schema.Any,
  Error extends Schema.Schema.All,
  R
> {
  readonly [TypeId]: TypeId
  readonly name: Name
  readonly payloadSchema: Schema.Struct<Payload>
  readonly successSchema: Success
  readonly errorSchema: Error
  readonly execute: (
    executionId: string,
    payload: [keyof Payload] extends [never] ? void : Schema.Struct.Constructor<Payload>
  ) => Effect.Effect<
    Success["Type"],
    Error["Type"],
    WorkflowEngine | Registration<Name> | Schema.Struct.Context<Payload> | Success["Context"] | Error["Context"]
  >
  readonly layer: Layer.Layer<
    Registration<Name> | WorkflowEngine,
    never,
    WorkflowEngine | R | Schema.Struct.Context<Payload> | Success["Context"] | Error["Context"]
  >
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
  readonly execute: (
    executionId: string,
    payload: any
  ) => Effect.Effect<any, any, any>
}

const EngineTag = Context.GenericTag<WorkflowEngine, WorkflowEngine["Type"]>(
  "@effect/workflow/WorkflowEngine" satisfies typeof WorkflowEngine.key
)

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = <
  const Name extends string,
  R,
  Payload extends Schema.Struct.Fields = {},
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Error extends Schema.Schema.All = typeof Schema.Never
>(options: {
  readonly name: Name
  readonly success?: Success
  readonly payload?: Payload
  readonly error?: Error
  readonly execute: (payload: Schema.Struct<Payload>["Type"]) => Effect.Effect<Success["Type"], Error["Type"], R>
}): Workflow<Name, Payload, Success, Error, Exclude<R, Scope | WorkflowEngine | WorkflowInstance>> => {
  class Request extends Schema.Class<Request>(`@effect/workflow/${options.name}/Request`)(options.payload ?? {}) {
    [PrimaryKey.symbol]() {
      return ""
    }
  }

  const self: Workflow<Name, Payload, Success, Error, R> = {
    [TypeId]: TypeId,
    name: options.name,
    payloadSchema: Request as any,
    successSchema: options.success ?? Schema.Void as any,
    errorSchema: options.error ?? Schema.Never as any,
    execute: Effect.fnUntraced(function*(executionId: string, payload: any) {
      const engine = yield* EngineTag
      const hashedExecutionId = yield* hashExecutionId(executionId)
      const loop: Effect.Effect<any, any> = Effect.flatMap(
        engine.execute(self as any, hashedExecutionId, payload as any),
        (result) => {
          if (result._tag === "Complete") {
            return result.exit
          }
          return Effect.zipRight(Effect.sleep(500), loop)
        }
      )
      return yield* loop
    }),
    layer: Layer.effectContext(Effect.gen(function*() {
      const context = yield* Effect.context<never>()
      const engine = Context.unsafeGet(context, EngineTag)
      yield* engine.register(self as any, (payload) =>
        options.execute(payload as any).pipe(
          Effect.provide(context)
        ) as any)
      return EngineTag.context(engine)
    })) as any
  }

  return self
}

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
export type Result<A, E> = Complete<A, E> | Suspended

/**
 * @since 1.0.0
 * @category Result
 */
export interface Complete<A, E> {
  readonly [ResultTypeId]: ResultTypeId
  readonly _tag: "Complete"
  readonly exit: Exit.Exit<A, E>
}

/**
 * @since 1.0.0
 * @category Result
 */
export interface Suspended {
  readonly [ResultTypeId]: ResultTypeId
  readonly _tag: "Suspended"
}

/**
 * @since 1.0.0
 * @category Result
 */
export const Complete = <A, E>(exit: Exit.Exit<A, E>): Result<A, E> => ({
  [ResultTypeId]: ResultTypeId,
  _tag: "Complete",
  exit
})

/**
 * @since 1.0.0
 * @category Result
 */
export const Suspended: Result<never, never> = {
  [ResultTypeId]: ResultTypeId,
  _tag: "Suspended"
}

const hashExecutionId = (original: string) =>
  Effect.map(
    Effect.promise(() => crypto.subtle.digest("SHA-256", new TextEncoder().encode(original))),
    (buffer) => {
      const data = new Uint8Array(buffer)
      let hexString = ""
      for (let i = 0; i < 16; i++) {
        hexString += data[i].toString(16).padStart(2, "0")
      }
      return hexString
    }
  )
