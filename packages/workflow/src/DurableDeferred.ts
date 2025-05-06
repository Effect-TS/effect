/**
 * @since 1.0.0
 */
import * as Brand from "effect/Brand"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Encoding from "effect/Encoding"
import type * as Exit from "effect/Exit"
import { dual } from "effect/Function"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import type { WorkflowEngine, WorkflowInstance } from "./WorkflowEngine.js"

/**
 * @since 1.0.0
 * @category Symbols
 */
export const TypeId: unique symbol = Symbol.for("@effect/workflow/DurableDeferred")

/**
 * @since 1.0.0
 * @category Symbols
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category Models
 */
export interface DurableDeferred<
  Success extends Schema.Schema.Any,
  Error extends Schema.Schema.All = typeof Schema.Never
> {
  readonly [TypeId]: TypeId
  readonly name: string
  readonly successSchema: Success
  readonly errorSchema: Error
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface Any {
  readonly [TypeId]: TypeId
  readonly name: string
  readonly successSchema: Schema.Schema.Any
  readonly errorSchema: Schema.Schema.All
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = <
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Error extends Schema.Schema.All = typeof Schema.Never
>(options: {
  readonly name: string
  readonly success?: Success
  readonly error?: Error
}): DurableDeferred<Success, Error> => ({
  [TypeId]: TypeId,
  name: options.name,
  successSchema: options.success ?? Schema.Void as any,
  errorSchema: options.error ?? Schema.Never as any
})

/**
 * @since 1.0.0
 * @category Suspend
 */
export const Suspend: unique symbol = Symbol.for("@effect/workflow/DurableDeferred/Suspend")

/**
 * @since 1.0.0
 * @category Suspend
 */
export type Suspend = typeof Suspend

const EngineTag = Context.GenericTag<WorkflowEngine, WorkflowEngine["Type"]>(
  "@effect/workflow/WorkflowEngine" satisfies typeof WorkflowEngine.key
)

const InstanceTag = Context.GenericTag<WorkflowInstance, WorkflowInstance["Type"]>(
  "@effect/workflow/WorkflowEngine/WorkflowInstance" satisfies typeof WorkflowInstance.key
)

const await_: <Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
  self: DurableDeferred<Success, Error>
) => Effect.Effect<
  Success["Type"],
  Error["Type"],
  WorkflowEngine | WorkflowInstance
> = Effect.fnUntraced(function*<
  Success extends Schema.Schema.Any,
  Error extends Schema.Schema.All
>(self: DurableDeferred<Success, Error>) {
  const engine = yield* EngineTag
  const instance = yield* InstanceTag
  const oexit = yield* engine.deferredResult({
    workflow: instance.workflow,
    executionId: instance.executionId,
    deferred: self
  })
  if (Option.isNone(oexit)) {
    return yield* Effect.die(Suspend)
  }
  return yield* oexit.value as Exit.Exit<Success["Type"], Error["Type"]>
})

export {
  /**
   * @since 1.0.0
   * @category Combinators
   */
  await_ as await
}

/**
 * @since 1.0.0
 * @category Token
 */
export const TokenTypeId: unique symbol = Symbol.for("@effect/workflow/DurableDeferred/Token")

/**
 * @since 1.0.0
 * @category Token
 */
export type TokenTypeId = typeof TokenTypeId

/**
 * @since 1.0.0
 * @category Token
 */
export type Token = Brand.Branded<string, TokenTypeId>

/**
 * @since 1.0.0
 * @category Token
 */
export const Token = Brand.nominal<Token>()

/**
 * @since 1.0.0
 * @category Combinators
 */
export const token: <Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
  self: DurableDeferred<Success, Error>
) => Effect.Effect<
  Token,
  never,
  WorkflowInstance
> = Effect.fnUntraced(function*<
  Success extends Schema.Schema.Any,
  Error extends Schema.Schema.All
>(self: DurableDeferred<Success, Error>) {
  const instance = yield* InstanceTag
  const id = `${instance.workflow.name}-${instance.executionId}-${self.name}`
  return Token(Encoding.encodeBase64(id))
})

/**
 * @since 1.0.0
 * @category Combinators
 */
export const done: {
  <Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
    options: {
      readonly token: Token
      readonly exit: Exit.Exit<Success["Type"], Error["Type"]>
    }
  ): (self: DurableDeferred<Success, Error>) => Effect.Effect<void, never, WorkflowEngine | WorkflowInstance>
  <Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly token: Token
      readonly exit: Exit.Exit<Success["Type"], Error["Type"]>
    }
  ): Effect.Effect<void, never, WorkflowEngine>
} = dual(
  2,
  Effect.fnUntraced(function*<Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly token: Token
      readonly exit: Exit.Exit<Success["Type"], Error["Type"]>
    }
  ) {
    const engine = yield* EngineTag
    const [workflowName, executionId] = Either.getOrThrow(Encoding.decodeBase64String(options.token)).split("-")
    yield* engine.deferredDone({
      workflowName,
      executionId,
      deferred: self,
      token: options.token,
      exit: options.exit
    })
    yield* engine.resume(workflowName, executionId)
  })
)
