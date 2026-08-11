/**
 * Defines named wait points for durable workflow executions.
 *
 * A `DurableDeferred` has a stable name and schemas for the value that will be
 * recorded later. Workflows can await it, suspend when no result exists yet, and
 * resume after its result is recorded. Tokens identify the workflow name,
 * execution id, and deferred name so external code can complete the correct
 * wait point later.
 *
 * @since 4.0.0
 */
import * as Arr from "../../Array.ts"
import type { NonEmptyReadonlyArray } from "../../Array.ts"
import type * as Brand from "../../Brand.ts"
import * as Cause from "../../Cause.ts"
import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import * as Encoding from "../../Encoding.ts"
import * as Exit from "../../Exit.ts"
import * as Fiber from "../../Fiber.ts"
import * as Filter from "../../Filter.ts"
import { dual } from "../../Function.ts"
import * as Latch from "../../Latch.ts"
import * as Option from "../../Option.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaGetter from "../../SchemaGetter.ts"
import type * as Activity from "./Activity.ts"
import * as Workflow from "./Workflow.ts"
import type { WorkflowEngine, WorkflowInstance } from "./WorkflowEngine.ts"

const TypeId = "~effect/workflow/DurableDeferred"

/**
 * Named durable deferred value whose completion is persisted by the workflow
 * engine and encoded with success and error schemas.
 *
 * @category models
 * @since 4.0.0
 */
export interface DurableDeferred<
  Success extends Schema.Constraint,
  Error extends Schema.Constraint = Schema.Never
> {
  readonly [TypeId]: typeof TypeId
  readonly name: string
  readonly successSchema: Success
  readonly errorSchema: Error
  readonly exitSchema: Schema.Exit<Schema.Top, Schema.Top, Schema.Top>
  readonly withActivityAttempt: Effect.Effect<DurableDeferred<Success, Error>>
}

/**
 * Type-erased durable deferred shape for APIs that only need the deferred
 * identity and name.
 *
 * @category models
 * @since 4.0.0
 */
export interface Any {
  readonly [TypeId]: typeof TypeId
  readonly name: string
}

/**
 * Type-erased durable deferred shape that also exposes success, error, and
 * exit schemas.
 *
 * @category models
 * @since 4.0.0
 */
export interface AnyWithProps {
  readonly [TypeId]: typeof TypeId
  readonly name: string
  readonly successSchema: Schema.Top
  readonly errorSchema: Schema.Top
  readonly exitSchema: Schema.Exit<any, any, any>
}

/**
 * Creates a named durable deferred with optional success and error schemas for
 * persisted completion.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = <
  Success extends Schema.Constraint = Schema.Void,
  Error extends Schema.Constraint = Schema.Never
>(
  name: string,
  options?: {
    readonly success?: Success | undefined
    readonly error?: Error | undefined
  }
): DurableDeferred<Success, Error> => {
  const successSchema = options?.success ?? (Schema.Void as any as Success)
  const errorSchema = options?.error ?? (Schema.Never as any as Error)
  return {
    [TypeId]: TypeId as typeof TypeId,
    name,
    successSchema,
    errorSchema,
    exitSchema: Schema.Exit(
      Schema.toCodecJson(successSchema),
      Schema.toCodecJson(errorSchema),
      Schema.toCodecJson(Schema.Defect())
    ) as any,
    withActivityAttempt: Effect.gen(function*() {
      const attempt = yield* CurrentAttempt
      return make(`${name}/${attempt}`, {
        success: successSchema,
        error: errorSchema
      })
    })
  }
}

const EngineTag = Context.Service<WorkflowEngine, WorkflowEngine["Service"]>(
  "effect/workflow/WorkflowEngine" satisfies typeof WorkflowEngine.key
)

const InstanceTag = Context.Service<
  WorkflowInstance,
  WorkflowInstance["Service"]
>(
  "effect/workflow/WorkflowEngine/WorkflowInstance" satisfies typeof WorkflowInstance.key
)

const CurrentAttempt = Context.Reference<number>(
  "effect/workflow/Activity/CurrentAttempt" satisfies typeof Activity.CurrentAttempt.key,
  { defaultValue: () => 1 }
)

/**
 * Internal channel between `raceAll` and the `await` calls inside its
 * branches.
 *
 * Each branch gets its own registration context: an `await` on a pending
 * deferred registers it before suspending, so the race's wake arm knows which
 * branch to re-run when that deferred completes. The context flows anywhere
 * the branch computes, including activity bodies (engines capture the calling
 * context for activity execution) and nested races, whose registrations
 * bubble to the enclosing branch.
 *
 * `direct` distinguishes an `await` that parked on the deferred itself (safe
 * to re-run immediately, the parked branch can never produce a value) from a
 * registration bubbled out of a nested race (the nested race handles its own
 * wake while its branch is alive).
 */
interface RaceState {
  readonly register: (deferred: Any, direct: boolean) => void
}

const RaceContext = Context.Reference<RaceState | undefined>(
  "effect/workflow/DurableDeferred/RaceContext",
  { defaultValue: () => undefined }
)

const await_: <Success extends Schema.Constraint, Error extends Schema.Constraint>(
  self: DurableDeferred<Success, Error>
) => Effect.Effect<
  Success["Type"],
  Error["Type"],
  | WorkflowEngine
  | WorkflowInstance
  | Success["DecodingServices"]
  | Error["DecodingServices"]
> = Effect.fnUntraced(function*<
  Success extends Schema.Constraint,
  Error extends Schema.Constraint
>(self: DurableDeferred<Success, Error>) {
  const engine = yield* EngineTag
  const instance = yield* InstanceTag
  let exit = yield* engine.deferredResult(self)
  if (Option.isSome(exit)) {
    return yield* exit.value as Exit.Exit<any, any>
  }
  const race = yield* RaceContext
  race?.register(self, true)
  exit = yield* Workflow.wrapActivityResult(
    engine.deferredResult(self),
    Option.isNone
  )
  if (Option.isNone(exit)) {
    return yield* Workflow.suspend(instance)
  }
  return yield* exit.value as Exit.Exit<any, any>
})

export {
  /**
   * Waits for the durable deferred, suspending the current workflow when no
   * persisted completion is available.
   *
   * @category combinators
   * @since 4.0.0
   */
  await_ as await
}

/**
 * Runs an effect and records its exit into the durable deferred, resuming
 * workflows that are waiting on that deferred.
 *
 * @category combinators
 * @since 4.0.0
 */
export const into: {
  <Success extends Schema.Constraint, Error extends Schema.Constraint>(
    self: DurableDeferred<Success, Error>
  ): <R>(
    effect: Effect.Effect<Success["Type"], Error["Type"], R>
  ) => Effect.Effect<
    Success["Type"],
    Error["Type"],
    | R
    | WorkflowEngine
    | WorkflowInstance
    | Success["DecodingServices"]
    | Error["DecodingServices"]
  >
  <Success extends Schema.Constraint, Error extends Schema.Constraint, R>(
    effect: Effect.Effect<Success["Type"], Error["Type"], R>,
    self: DurableDeferred<Success, Error>
  ): Effect.Effect<
    Success["Type"],
    Error["Type"],
    | R
    | WorkflowEngine
    | WorkflowInstance
    | Success["DecodingServices"]
    | Error["DecodingServices"]
  >
} = dual(
  2,
  <Success extends Schema.Constraint, Error extends Schema.Constraint, R>(
    effect: Effect.Effect<Success["Type"], Error["Type"], R>,
    self: DurableDeferred<Success, Error>
  ): Effect.Effect<
    Success["Type"],
    Error["Type"],
    | R
    | WorkflowEngine
    | WorkflowInstance
    | Success["DecodingServices"]
    | Error["DecodingServices"]
  > =>
    Effect.contextWith(
      (context: Context.Context<WorkflowEngine | WorkflowInstance>) => {
        const engine = Context.get(context, EngineTag)
        const parentInstance = Context.get(context, InstanceTag)
        const instance = { ...parentInstance }
        return Effect.onExit(
          Effect.provideService(effect, InstanceTag, instance),
          Effect.fnUntraced(function*(exit) {
            if (Exit.isFailure(exit)) {
              const [reasons, interrupts] = Arr.partition(
                exit.cause.reasons,
                Filter.fromPredicate(Cause.isInterruptReason)
              )
              const hasInterruptsOnly = interrupts.length === exit.cause.reasons.length
              if (hasInterruptsOnly && instance.suspended) {
                parentInstance.suspended = true
                return
              } else if (interrupts.length > 0) {
                exit = Exit.failCause(Cause.fromReasons(reasons))
              }
            }
            yield* engine.deferredDone(self, {
              workflowName: instance.workflow._tag,
              executionId: instance.executionId,
              deferredName: self.name,
              exit
            })
          })
        )
      }
    )
)

/**
 * Runs effects as a durable race, returning a previously persisted result when
 * present or completing a named deferred with the first result.
 *
 * @category racing
 * @since 4.0.0
 */
export const raceAll = <
  const Effects extends NonEmptyReadonlyArray<Effect.Effect<any, any, any>>,
  Success extends Schema.Schema<Effect.Success<Effects[number]>>,
  Error extends Schema.Schema<Effect.Error<Effects[number]>>
>(options: {
  name: string
  success: Success
  error: Error
  effects: Effects
}): Effect.Effect<
  Effect.Success<Effects[number]>,
  Effect.Error<Effects[number]>,
  | Effect.Services<Effects[number]>
  | Success["DecodingServices"]
  | Success["EncodingServices"]
  | Error["DecodingServices"]
  | Error["EncodingServices"]
  | WorkflowEngine
  | WorkflowInstance
> => {
  const deferred = make<any, any>(`raceAll/${options.name}`, {
    success: options.success,
    error: options.error
  })
  return Effect.gen(function*() {
    const engine = yield* EngineTag
    const persisted = yield* engine.deferredResult(deferred)
    if (Option.isSome(persisted)) {
      return yield* persisted.value
    }
    const parentInstance = yield* InstanceTag
    const outerRace = yield* RaceContext
    return yield* into(
      Effect.gen(function*() {
        const raceInstance = yield* InstanceTag
        const total = options.effects.length
        const registered = new Map<
          string,
          { readonly deferred: Any; readonly branch: number; readonly direct: boolean }
        >()
        const wakeLatch = Latch.makeUnsafe()
        let settled = 0
        let suspendedBranches = 0
        const dead = options.effects.map(() => false)
        const contexts = options.effects.map((_, index): RaceState => ({
          register(d, direct) {
            const existing = registered.get(d.name)
            registered.set(d.name, {
              deferred: d,
              branch: index,
              direct: direct || existing?.direct === true
            })
            outerRace?.register(d, false)
          }
        }))
        const runBranch = (index: number, instance: typeof raceInstance) =>
          options.effects[index].pipe(
            Effect.provideService(InstanceTag, instance),
            Effect.provideService(RaceContext, contexts[index])
          )
        // Branches keep their normal semantics: awaiting a pending deferred
        // or a suspended activity interrupts the branch. Each branch gets its
        // own instance clone so the wake arm can tell suspension apart from
        // failure or losing the race.
        const branches = options.effects.map((_, index) =>
          Effect.suspend(() => {
            const branchInstance = { ...raceInstance }
            return runBranch(index, branchInstance).pipe(
              Effect.onExit((exit) =>
                Effect.sync(() => {
                  settled++
                  if (
                    Exit.isFailure(exit) &&
                    Cause.hasInterruptsOnly(exit.cause) &&
                    branchInstance.suspended
                  ) {
                    suspendedBranches++
                    dead[index] = true
                  }
                  wakeLatch.openUnsafe()
                })
              )
            )
          })
        )
        // The wake arm races alongside the branches. When a registered
        // deferred completes it re-runs the suspended branch that was waiting
        // on it, so the branch's own pipeline produces the result (branch
        // bodies are replay-safe by construction). It is also the single
        // place that converts "every branch suspended" into a durable
        // suspension of the workflow.
        const wakeArm = Effect.gen(function*() {
          parentInstance.raceWake.add(wakeLatch)
          while (true) {
            wakeLatch.closeUnsafe()
            for (const [name, entry] of registered) {
              const exit = yield* engine.deferredResult(entry.deferred as any)
              if (Option.isNone(exit)) continue
              // A direct registration means an await in this branch parked on
              // the deferred, so the branch can never produce a value and a
              // re-run is safe even while it unwinds. A bubbled registration
              // belongs to a nested race that handles its own wake while its
              // branch is alive; only take over once that branch is dead.
              if (!entry.direct && !dead[entry.branch]) continue
              registered.delete(name)
              const rerunInstance = { ...raceInstance }
              const fiber = yield* Effect.forkChild(runBranch(entry.branch, rerunInstance))
              const rerun = yield* Fiber.await(fiber)
              if (Exit.isSuccess(rerun)) {
                return rerun.value
              }
              const parkedAgain = Cause.hasInterruptsOnly(rerun.cause) && rerunInstance.suspended
              if (!parkedAgain) {
                // a real failure participates in the race like any branch
                return yield* rerun
              }
            }
            // Only commit to an outcome when nothing raced with the polling
            // above; a completion or branch exit reopens the latch.
            if (!wakeLatch.isOpen() && settled === total) {
              if (suspendedBranches === total) {
                // Load-bearing: a completer that observes this flag takes the
                // wait-for-settle-then-resume path instead of the latch wake,
                // so setting it here makes the commit visible synchronously.
                parentInstance.suspended = true
                return yield* Workflow.suspend(raceInstance)
              }
              // at least one branch failed for real: exit so the race
              // settles with the aggregated failures
              return yield* Effect.interrupt
            }
            yield* wakeLatch.await
          }
        }).pipe(
          Effect.ensuring(Effect.sync(() => {
            parentInstance.raceWake.delete(wakeLatch)
          }))
        )
        return yield* Effect.raceAll([...branches, wakeArm])
      }),
      deferred
    )
  })
}

/**
 * Runtime brand identifier for durable deferred tokens.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TokenTypeId = "~effect/workflow/DurableDeferred/Token"

/**
 * Type-level brand identifier for `Token` values.
 *
 * @category type IDs
 * @since 4.0.0
 */
export type TokenTypeId = typeof TokenTypeId

/**
 * Branded string token identifying a durable deferred for a workflow
 * execution.
 *
 * @category models
 * @since 4.0.0
 */
export type Token = Brand.Branded<string, TokenTypeId>

/**
 * Schema for branded durable deferred tokens.
 *
 * @category schemas
 * @since 4.0.0
 */
export const Token: Schema.brand<Schema.String, TokenTypeId> = Schema.String.pipe(Schema.brand(TokenTypeId))

/**
 * Schema for a decoded durable deferred token containing the workflow
 * name, execution ID, and deferred name.
 *
 * @category schemas
 * @since 4.0.0
 */
export class TokenParsed extends Schema.Class<TokenParsed>(
  "effect/workflow/DurableDeferred/TokenParsed"
)({
  workflowName: Schema.String,
  executionId: Schema.String,
  deferredName: Schema.String
}) {
  /**
   * Encodes the parsed workflow, execution, and deferred names back into a token.
   *
   * @since 4.0.0
   */
  get asToken(): Token {
    return Encoding.encodeBase64Url(
      JSON.stringify([this.workflowName, this.executionId, this.deferredName])
    ) as Token
  }

  /**
   * Schema for decoding and encoding durable deferred tokens as strings.
   *
   * @since 4.0.0
   */
  static readonly FromString = Schema.String.pipe(
    Schema.decodeTo(
      Schema.fromJsonString(
        Schema.Tuple([Schema.String, Schema.String, Schema.String])
      ),
      {
        decode: SchemaGetter.decodeBase64UrlString(),
        encode: SchemaGetter.encodeBase64Url()
      }
    ),
    Schema.decodeTo(TokenParsed, {
      decode: SchemaGetter.transform(
        ([workflowName, executionId, deferredName]) =>
          new TokenParsed({
            workflowName,
            executionId,
            deferredName
          })
      ),
      encode: SchemaGetter.transform(
        (parsed) =>
          [
            parsed.workflowName,
            parsed.executionId,
            parsed.deferredName
          ] as const
      )
    })
  )

  /**
   * Decodes a durable deferred token string into its parsed components.
   *
   * @since 4.0.0
   */
  static readonly fromString = Schema.decodeSync(TokenParsed.FromString)

  /**
   * Encodes parsed durable deferred token components into a token string.
   *
   * @since 4.0.0
   */
  static readonly encode = Schema.encodeSync(TokenParsed.FromString)
}

/**
 * Creates a token for a durable deferred using the current workflow instance's
 * workflow name and execution ID.
 *
 * @category constructors
 * @since 4.0.0
 */
export const token: <Success extends Schema.Constraint, Error extends Schema.Constraint>(
  self: DurableDeferred<Success, Error>
) => Effect.Effect<Token, never, WorkflowInstance> = Effect.fnUntraced(
  function*<Success extends Schema.Constraint, Error extends Schema.Constraint>(
    self: DurableDeferred<Success, Error>
  ) {
    const instance = yield* InstanceTag
    return tokenFromExecutionId(self, instance)
  }
)

/**
 * Creates a durable deferred token from an explicit workflow, execution ID,
 * and deferred name.
 *
 * @category constructors
 * @since 4.0.0
 */
export const tokenFromExecutionId: {
  (options: {
    readonly workflow: Workflow.Any
    readonly executionId: string
  }): <Success extends Schema.Constraint, Error extends Schema.Constraint>(
    self: DurableDeferred<Success, Error>
  ) => Token
  <Success extends Schema.Constraint, Error extends Schema.Constraint>(
    self: DurableDeferred<Success, Error>,
    options: { readonly workflow: Workflow.Any; readonly executionId: string }
  ): Token
} = dual(
  2,
  <Success extends Schema.Constraint, Error extends Schema.Constraint>(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly workflow: Workflow.Any
      readonly executionId: string
    }
  ): Token =>
    new TokenParsed({
      workflowName: options.workflow._tag,
      executionId: options.executionId,
      deferredName: self.name
    }).asToken
)

/**
 * Creates a durable deferred token by deriving the workflow execution ID from
 * the supplied workflow payload.
 *
 * @category constructors
 * @since 4.0.0
 */
export const tokenFromPayload: {
  <W extends Workflow.Any>(options: {
    readonly workflow: W
    readonly payload: Workflow.PayloadSchema<W>["~type.make.in"]
  }): <Success extends Schema.Constraint, Error extends Schema.Constraint>(
    self: DurableDeferred<Success, Error>
  ) => Effect.Effect<Token>
  <
    Success extends Schema.Constraint,
    Error extends Schema.Constraint,
    W extends Workflow.Any
  >(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly workflow: W
      readonly payload: Workflow.PayloadSchema<W>["~type.make.in"]
    }
  ): Effect.Effect<Token>
} = dual(
  2,
  <
    Success extends Schema.Constraint,
    Error extends Schema.Constraint,
    W extends Workflow.Any
  >(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly workflow: W
      readonly payload: Workflow.PayloadSchema<W>["~type.make.in"]
    }
  ): Effect.Effect<Token> =>
    Effect.map(options.workflow.executionId(options.payload), (executionId) =>
      tokenFromExecutionId(self, {
        workflow: options.workflow,
        executionId
      }))
)

/**
 * Completes the durable deferred identified by a token with the supplied exit,
 * encoding the result through the deferred schemas.
 *
 * @category combinators
 * @since 4.0.0
 */
export const done: {
  <Success extends Schema.Constraint, Error extends Schema.Constraint>(options: {
    readonly token: Token
    readonly exit: Exit.Exit<Success["Type"], Error["Type"]>
  }): (
    self: DurableDeferred<Success, Error>
  ) => Effect.Effect<
    void,
    never,
    WorkflowEngine | Success["EncodingServices"] | Error["EncodingServices"]
  >
  <Success extends Schema.Constraint, Error extends Schema.Constraint>(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly token: Token
      readonly exit: Exit.Exit<Success["Type"], Error["Type"]>
    }
  ): Effect.Effect<
    void,
    never,
    WorkflowEngine | Success["EncodingServices"] | Error["EncodingServices"]
  >
} = dual(
  2,
  Effect.fnUntraced(function*<
    Success extends Schema.Constraint,
    Error extends Schema.Constraint
  >(
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
 * Completes the durable deferred identified by a token with a successful
 * value.
 *
 * @category combinators
 * @since 4.0.0
 */
export const succeed: {
  <Success extends Schema.Constraint, Error extends Schema.Constraint>(options: {
    readonly token: Token
    readonly value: Success["Type"]
  }): (
    self: DurableDeferred<Success, Error>
  ) => Effect.Effect<void, never, WorkflowEngine | Success["EncodingServices"]>
  <Success extends Schema.Constraint, Error extends Schema.Constraint>(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly token: Token
      readonly value: Success["Type"]
    }
  ): Effect.Effect<void, never, WorkflowEngine | Success["EncodingServices"]>
} = dual(
  2,
  <Success extends Schema.Constraint, Error extends Schema.Constraint>(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly token: Token
      readonly value: Success["Type"]
    }
  ): Effect.Effect<void, never, WorkflowEngine | Success["EncodingServices"]> =>
    done(self, {
      token: options.token,
      exit: Exit.succeed(options.value)
    })
)

/**
 * Completes the durable deferred identified by a token with a typed failure.
 *
 * @category combinators
 * @since 4.0.0
 */
export const fail: {
  <Success extends Schema.Constraint, Error extends Schema.Constraint>(options: {
    readonly token: Token
    readonly error: Error["Type"]
  }): (
    self: DurableDeferred<Success, Error>
  ) => Effect.Effect<void, never, WorkflowEngine | Error["EncodingServices"]>
  <Success extends Schema.Constraint, Error extends Schema.Constraint>(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly token: Token
      readonly error: Error["Type"]
    }
  ): Effect.Effect<void, never, WorkflowEngine | Error["EncodingServices"]>
} = dual(
  2,
  <Success extends Schema.Constraint, Error extends Schema.Constraint>(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly token: Token
      readonly error: Error["Type"]
    }
  ): Effect.Effect<void, never, WorkflowEngine | Error["EncodingServices"]> =>
    done(self, {
      token: options.token,
      exit: Exit.fail(options.error)
    })
)

/**
 * Completes the durable deferred identified by a token with a failure cause.
 *
 * @category combinators
 * @since 4.0.0
 */
export const failCause: {
  <Success extends Schema.Constraint, Error extends Schema.Constraint>(options: {
    readonly token: Token
    readonly cause: Cause.Cause<Error["Type"]>
  }): (
    self: DurableDeferred<Success, Error>
  ) => Effect.Effect<void, never, WorkflowEngine | Error["EncodingServices"]>
  <Success extends Schema.Constraint, Error extends Schema.Constraint>(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly token: Token
      readonly cause: Cause.Cause<Error["Type"]>
    }
  ): Effect.Effect<void, never, WorkflowEngine | Error["EncodingServices"]>
} = dual(
  2,
  <Success extends Schema.Constraint, Error extends Schema.Constraint>(
    self: DurableDeferred<Success, Error>,
    options: {
      readonly token: Token
      readonly cause: Cause.Cause<Error["Type"]>
    }
  ): Effect.Effect<void, never, WorkflowEngine | Error["EncodingServices"]> =>
    done(self, {
      token: options.token,
      exit: Exit.failCause(options.cause)
    })
)
