/**
 * @since 1.0.0
 */
import type { NonEmptyReadonlyArray } from "effect/Array"
import type * as Brand from "effect/Brand"
import type * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import * as Exit from "effect/Exit"
import { dual } from "effect/Function"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import type * as Activity from "./Activity.js"
import * as Workflow from "./Workflow.js"
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
  readonly exitSchema: Schema.ExitFromSelf<Success, Error, typeof Schema.Defect>
  readonly withActivityAttempt: Effect.Effect<DurableDeferred<Success, Error>>
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
  readonly exitSchema: Schema.ExitFromSelf<any, any, any>
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = <
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Error extends Schema.Schema.All = typeof Schema.Never
>(name: string, options?: {
  readonly success?: Success | undefined
  readonly error?: Error | undefined
}): DurableDeferred<Success, Error> => ({
  [TypeId]: TypeId,
  name,
  successSchema: options?.success ?? Schema.Void as any,
  errorSchema: options?.error ?? Schema.Never as any,
  exitSchema: Schema.ExitFromSelf({
    success: options?.success ?? Schema.Void as any,
    failure: options?.error ?? Schema.Never as any,
    defect: Schema.Defect
  }),
  withActivityAttempt: Effect.gen(function*() {
    const attempt = yield* CurrentAttempt
    return make(`${name}/${attempt}`, {
      success: options?.success,
      error: options?.error
    })
  })
})

const EngineTag = Context.GenericTag<WorkflowEngine, WorkflowEngine["Type"]>(
  "@effect/workflow/WorkflowEngine" satisfies typeof WorkflowEngine.key
)

const InstanceTag = Context.GenericTag<WorkflowInstance, WorkflowInstance["Type"]>(
  "@effect/workflow/WorkflowEngine/WorkflowInstance" satisfies typeof WorkflowInstance.key
)

const CurrentAttempt = Context.Reference<Activity.CurrentAttempt>()(
  "@effect/workflow/Activity/CurrentAttempt" satisfies typeof Activity.CurrentAttempt.key,
  {
    defaultValue: () => 1
  }
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
  const exit = yield* Workflow.wrapActivityResult(
    engine.deferredResult(self),
    Predicate.isUndefined
  )
  if (exit === undefined) {
    return yield* Workflow.suspend(instance)
  }
  return yield* exit
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
 * @category Combinators
 */
export const into: {
  <Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
    self: DurableDeferred<Success, Error>
  ): <R>(effect: Effect.Effect<Success["Type"], Error["Type"], R>) => Effect.Effect<
    Success["Type"],
    Error["Type"],
    R | WorkflowEngine | WorkflowInstance | Success["Context"] | Error["Context"]
  >
  <Success extends Schema.Schema.Any, Error extends Schema.Schema.All, R>(
    effect: Effect.Effect<Success["Type"], Error["Type"], R>,
    self: DurableDeferred<Success, Error>
  ): Effect.Effect<
    Success["Type"],
    Error["Type"],
    R | WorkflowEngine | WorkflowInstance | Success["Context"] | Error["Context"]
  >
} = dual(2, <Success extends Schema.Schema.Any, Error extends Schema.Schema.All, R>(
  effect: Effect.Effect<Success["Type"], Error["Type"], R>,
  self: DurableDeferred<Success, Error>
): Effect.Effect<
  Success["Type"],
  Error["Type"],
  R | WorkflowEngine | WorkflowInstance | Success["Context"] | Error["Context"]
> =>
  Effect.contextWithEffect((context: Context.Context<WorkflowEngine | WorkflowInstance>) => {
    const engine = Context.get(context, EngineTag)
    const instance = Context.get(context, InstanceTag)
    return Effect.onExit(effect, (exit) => {
      if (instance.suspended) return Effect.void
      return engine.deferredDone(self, {
        workflowName: instance.workflow.name,
        executionId: instance.executionId,
        deferredName: self.name,
        exit
      })
    })
  }))

/**
 * @since 1.0.0
 * @category Racing
 */
export const raceAll = <
  const Effects extends NonEmptyReadonlyArray<Effect.Effect<any, any, any>>,
  SI,
  SR,
  EI,
  ER
>(options: {
  name: string
  success: Schema.Schema<
    Effects[number] extends Effect.Effect<infer S, infer _E, infer _R> ? S : never,
    SI,
    SR
  >
  error: Schema.Schema<
    Effects[number] extends Effect.Effect<infer _S, infer E, infer _R> ? E : never,
    EI,
    ER
  >
  effects: Effects
}): Effect.Effect<
  (Effects[number] extends Effect.Effect<infer _A, infer _E, infer _R> ? _A : never),
  (Effects[number] extends Effect.Effect<infer _A, infer _E, infer _R> ? _E : never),
  | (Effects[number] extends Effect.Effect<infer _A, infer _R, infer R> ? R : never)
  | SR
  | ER
  | WorkflowEngine
  | WorkflowInstance
> => {
  const deferred = make<any, any>(`raceAll/${options.name}`, {
    success: options.success,
    error: options.error
  })
  return Effect.gen(function*() {
    const engine = yield* EngineTag
    const exit = yield* Workflow.wrapActivityResult(engine.deferredResult(deferred), Predicate.isUndefined)
    if (exit) {
      return yield* (Effect.flatten(exit) as Effect.Effect<any, any, any>)
    }
    return yield* into(Effect.raceAll(options.effects), deferred)
  })
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
    yield* engine.deferredDone(self, {
      workflowName: token.workflowName,
      executionId: token.executionId,
      deferredName: token.deferredName,
      exit: options.exit
    })
  })
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
