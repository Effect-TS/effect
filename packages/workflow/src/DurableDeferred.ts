/**
 * @since 1.0.0
 */
import type * as Brand from "effect/Brand"
import type * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import * as Exit from "effect/Exit"
import { dual } from "effect/Function"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import type * as Workflow from "./Workflow.js"
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
  readonly exitSchema: Schema.Exit<Success, Error, typeof Schema.Defect>
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
  readonly exitSchema: Schema.Exit<any, any, any>
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = <
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Error extends Schema.Schema.All = typeof Schema.Never
>(name: string, options?: {
  readonly success?: Success
  readonly error?: Error
}): DurableDeferred<Success, Error> => ({
  [TypeId]: TypeId,
  name,
  successSchema: options?.success ?? Schema.Void as any,
  errorSchema: options?.error ?? Schema.Never as any,
  exitSchema: Schema.Exit({
    success: options?.success ?? Schema.Void as any,
    failure: options?.error ?? Schema.Never as any,
    defect: Schema.Defect
  })
})

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
  WorkflowEngine | WorkflowInstance | Success["Context"] | Error["Context"]
> = Effect.fnUntraced(function*<
  Success extends Schema.Schema.Any,
  Error extends Schema.Schema.All
>(self: DurableDeferred<Success, Error>) {
  const engine = yield* EngineTag
  const instance = yield* InstanceTag
  const oexit = yield* engine.deferredResult(self)
  if (Option.isNone(oexit)) {
    instance.suspended = true
    return yield* Effect.failSuspend
  }
  return yield* Effect.flatten(Effect.orDie(
    Schema.decodeUnknown(self.exitSchema)(oexit.value)
  ))
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
export const Token: Schema.brand<
  typeof Schema.String,
  typeof TokenTypeId
> = Schema.String.pipe(
  Schema.brand(TokenTypeId)
)

/**
 * @since 1.0.0
 * @category Token
 */
export class TokenParsed extends Schema.Class<TokenParsed>("@effect/workflow/DurableDeferred/TokenParsed")({
  workflowName: Schema.String,
  executionId: Schema.String,
  deferredName: Schema.String
}) {
  /**
   * @since 1.0.0
   */
  get asToken(): Token {
    return Encoding.encodeBase64Url(JSON.stringify([this.workflowName, this.executionId, this.deferredName])) as Token
  }

  /**
   * @since 1.0.0
   */
  static readonly FromString: Schema.Schema<
    TokenParsed,
    string
  > = Schema.StringFromBase64Url.pipe(
    Schema.compose(Schema.parseJson(Schema.Tuple(Schema.String, Schema.String, Schema.String))),
    Schema.transform(TokenParsed, {
      decode: ([workflowName, executionId, deferredName]) =>
        new TokenParsed({
          workflowName,
          executionId,
          deferredName
        }),
      encode: (parsed) => [parsed.workflowName, parsed.executionId, parsed.deferredName] as const
    })
  )

  /**
   * @since 1.0.0
   */
  static readonly fromString = Schema.decodeSync(TokenParsed.FromString)

  /**
   * @since 1.0.0
   */
  static readonly encode = Schema.encodeSync(TokenParsed.FromString)
}

/**
 * @since 1.0.0
 * @category Token
 */
export const token: <Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
  self: DurableDeferred<Success, Error>
) => Effect.Effect<Token, never, WorkflowInstance> = Effect.fnUntraced(function*<
  Success extends Schema.Schema.Any,
  Error extends Schema.Schema.All
>(self: DurableDeferred<Success, Error>) {
  const instance = yield* InstanceTag
  return tokenFromExecutionId(self, instance)
})

/**
 * @since 1.0.0
 * @category Token
 */
export const tokenFromExecutionId: {
  (options: {
    readonly workflow: Workflow.Any
    readonly executionId: string
  }): <Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
    self: DurableDeferred<Success, Error>
  ) => Token
  <Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
    self: DurableDeferred<Success, Error>,
    options: { readonly workflow: Workflow.Any; readonly executionId: string }
  ): Token
} = dual(
  2,
  <Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly workflow: Workflow.Any
      readonly executionId: string
    }
  ): Token =>
    new TokenParsed({
      workflowName: options.workflow.name,
      executionId: options.executionId,
      deferredName: self.name
    }).asToken
)

/**
 * @since 1.0.0
 * @category Token
 */
export const tokenFromPayload: {
  <W extends Workflow.Any>(options: {
    readonly workflow: W
    readonly payload: Schema.Simplify<Schema.Struct.Constructor<W["payloadSchema"]["fields"]>>
  }): <Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
    self: DurableDeferred<Success, Error>
  ) => Effect.Effect<Token>
  <Success extends Schema.Schema.Any, Error extends Schema.Schema.All, W extends Workflow.Any>(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly workflow: W
      readonly payload: Schema.Simplify<Schema.Struct.Constructor<W["payloadSchema"]["fields"]>>
    }
  ): Effect.Effect<Token>
} = dual(
  2,
  <Success extends Schema.Schema.Any, Error extends Schema.Schema.All, W extends Workflow.Any>(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly workflow: W
      readonly payload: Schema.Simplify<Schema.Struct.Constructor<W["payloadSchema"]["fields"]>>
    }
  ): Effect.Effect<Token> =>
    Effect.map(options.workflow.executionId(options.payload), (executionId) =>
      tokenFromExecutionId(self, {
        workflow: options.workflow,
        executionId
      }))
)

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
  ): (self: DurableDeferred<Success, Error>) => Effect.Effect<
    void,
    never,
    WorkflowEngine | Success["Context"] | Error["Context"]
  >
  <Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly token: Token
      readonly exit: Exit.Exit<Success["Type"], Error["Type"]>
    }
  ): Effect.Effect<void, never, WorkflowEngine | Success["Context"] | Error["Context"]>
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
    const token = TokenParsed.fromString(options.token)
    const exit = yield* Schema.encode(self.exitSchema)(options.exit)
    yield* engine.deferredDone({
      workflowName: token.workflowName,
      executionId: token.executionId,
      deferred: self,
      exit: exit as any
    })
  }, Effect.orDie)
)

/**
 * @since 1.0.0
 * @category Combinators
 */
export const succeed: {
  <Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
    options: {
      readonly token: Token
      readonly value: Success["Type"]
    }
  ): (self: DurableDeferred<Success, Error>) => Effect.Effect<void, never, WorkflowEngine | Success["Context"]>
  <Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly token: Token
      readonly value: Success["Type"]
    }
  ): Effect.Effect<void, never, WorkflowEngine | Success["Context"]>
} = dual(
  2,
  <Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly token: Token
      readonly value: Success["Type"]
    }
  ): Effect.Effect<void, never, WorkflowEngine | Success["Context"]> =>
    done(self, {
      token: options.token,
      exit: Exit.succeed(options.value)
    })
)

/**
 * @since 1.0.0
 * @category Combinators
 */
export const fail: {
  <Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
    options: {
      readonly token: Token
      readonly error: Error["Type"]
    }
  ): (self: DurableDeferred<Success, Error>) => Effect.Effect<void, never, WorkflowEngine | Error["Context"]>
  <Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly token: Token
      readonly error: Error["Type"]
    }
  ): Effect.Effect<void, never, WorkflowEngine | Error["Context"]>
} = dual(
  2,
  <Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly token: Token
      readonly error: Error["Type"]
    }
  ): Effect.Effect<void, never, WorkflowEngine | Error["Context"]> =>
    done(self, {
      token: options.token,
      exit: Exit.fail(options.error)
    })
)

/**
 * @since 1.0.0
 * @category Combinators
 */
export const failCause: {
  <Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
    options: {
      readonly token: Token
      readonly cause: Cause.Cause<Error["Type"]>
    }
  ): (self: DurableDeferred<Success, Error>) => Effect.Effect<void, never, WorkflowEngine | Error["Context"]>
  <Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly token: Token
      readonly cause: Cause.Cause<Error["Type"]>
    }
  ): Effect.Effect<void, never, WorkflowEngine | Error["Context"]>
} = dual(
  2,
  <Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly token: Token
      readonly cause: Cause.Cause<Error["Type"]>
    }
  ): Effect.Effect<void, never, WorkflowEngine | Error["Context"]> =>
    done(self, {
      token: options.token,
      exit: Exit.failCause(options.cause)
    })
)
