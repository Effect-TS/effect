/**
 * @since 3.16.0
 * @experimental
 */
import type { NonEmptyReadonlyArray } from "./Array.js"
import type * as Context from "./Context.js"
import * as Effect from "./Effect.js"
import { dual } from "./Function.js"
import * as internal from "./internal/executionPlan.js"
import * as Layer from "./Layer.js"
import type { Pipeable } from "./Pipeable.js"
import { pipeArguments } from "./Pipeable.js"
import type * as Schedule from "./Schedule.js"

/**
 * @since 3.16.0
 * @category Symbols
 * @experimental
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @since 3.16.0
 * @category Symbols
 * @experimental
 */
export type TypeId = typeof TypeId

/**
 * @since 3.16.0
 * @category Guards
 * @experimental
 */
export const isExecutionPlan: (u: unknown) => u is ExecutionPlan<any> = internal.isExecutionPlan

/**
 * A `ExecutionPlan` can be used with `Effect.withExecutionPlan` or `Stream.withExecutionPlan`, allowing you to provide different resources for each step of execution until the effect succeeds or the plan is exhausted.
 *
 * ```ts
 * import { type AiLanguageModel } from "@effect/ai"
 * import type { Layer } from "effect"
 * import { Effect, ExecutionPlan, Schedule } from "effect"
 *
 * declare const layerBad: Layer.Layer<AiLanguageModel.AiLanguageModel>
 * declare const layerGood: Layer.Layer<AiLanguageModel.AiLanguageModel>
 *
 * const ThePlan = ExecutionPlan.make({
 *   // First try with the bad layer 2 times with a 3 second delay between attempts
 *   provide: layerBad,
 *   attempts: 2,
 *   schedule: Schedule.spaced(3000)
 * }).pipe(
 *   // Then try with the bad layer 3 times with a 1 second delay between attempts
 *   ExecutionPlan.orElse({
 *     provide: layerBad,
 *     attempts: 3,
 *     schedule: Schedule.spaced(1000)
 *   }),
 *   // Finally try with the good layer.
 *   //
 *   // If `attempts` is omitted, the plan will only attempt once, unless a schedule is provided.
 *   ExecutionPlan.orElse({
 *     provide: layerGood
 *   })
 * )
 *
 * declare const effect: Effect.Effect<
 *   void,
 *   never,
 *   AiLanguageModel.AiLanguageModel
 * >
 * const withPlan: Effect.Effect<void> = Effect.withExecutionPlan(effect, ThePlan)
 * ```
 *
 * @since 3.16.0
 * @category Models
 * @experimental
 */
export interface ExecutionPlan<
  Config extends {
    provides: any
    input: any
    error: any
    requirements: any
  }
> extends Pipeable {
  readonly [TypeId]: TypeId
  readonly steps: NonEmptyReadonlyArray<{
    readonly provide:
      | Context.Context<Config["provides"]>
      | Layer.Layer<Config["provides"], Config["error"], Config["requirements"]>
    readonly attempts?: number | undefined
    readonly while?:
      | ((input: Config["input"]) => Effect.Effect<boolean, Config["error"], Config["requirements"]>)
      | undefined
    readonly schedule?: Schedule.Schedule<any, Config["input"], Config["requirements"]> | undefined
  }>

  /**
   * Returns an equivalent `ExecutionPlan` with the requirements satisfied,
   * using the current context.
   */
  readonly withRequirements: Effect.Effect<
    ExecutionPlan<{
      provides: Config["provides"]
      input: Config["input"]
      error: Config["error"]
      requirements: never
    }>,
    never,
    Config["requirements"]
  >
}

/**
 * Create an `ExecutionPlan`, which can be used with `Effect.withExecutionPlan` or `Stream.withExecutionPlan`, allowing you to provide different resources for each step of execution until the effect succeeds or the plan is exhausted.
 *
 * ```ts
 * import { type AiLanguageModel } from "@effect/ai"
 * import type { Layer } from "effect"
 * import { Effect, ExecutionPlan, Schedule } from "effect"
 *
 * declare const layerBad: Layer.Layer<AiLanguageModel.AiLanguageModel>
 * declare const layerGood: Layer.Layer<AiLanguageModel.AiLanguageModel>
 *
 * const ThePlan = ExecutionPlan.make({
 *   // First try with the bad layer 2 times with a 3 second delay between attempts
 *   provide: layerBad,
 *   attempts: 2,
 *   schedule: Schedule.spaced(3000)
 * }).pipe(
 *   // Then try with the bad layer 3 times with a 1 second delay between attempts
 *   ExecutionPlan.orElse({
 *     provide: layerBad,
 *     attempts: 3,
 *     schedule: Schedule.spaced(1000)
 *   }),
 *   // Finally try with the good layer.
 *   //
 *   // If `attempts` is omitted, the plan will only attempt once, unless a schedule is provided.
 *   ExecutionPlan.orElse({
 *     provide: layerGood
 *   })
 * )
 *
 * declare const effect: Effect.Effect<
 *   void,
 *   never,
 *   AiLanguageModel.AiLanguageModel
 * >
 * const withPlan: Effect.Effect<void> = Effect.withExecutionPlan(effect, ThePlan)
 * ```
 *
 * @since 3.16.0
 * @category Constructors
 * @experimental
 */
export const make = <
  Provides,
  SOut,
  LE = never,
  LR = never,
  WhileIn = unknown,
  WhileE = never,
  WhileR = never,
  SIn = unknown,
  SR = never
>(options: {
  readonly provide: Context.Context<Provides> | Layer.Layer<Provides, LE, LR>
  readonly attempts?: number
  readonly while?: (input: WhileIn) => boolean | Effect.Effect<boolean, WhileE, WhileR>
  readonly schedule?: Schedule.Schedule<SOut, SIn, SR>
}): ExecutionPlan<{
  provides: Provides
  input: WhileIn & SIn
  error: LE | WhileE
  requirements: LR | WhileR | SR
}> => {
  if (options.attempts && options.attempts < 1) {
    throw new Error("ExecutionPlan.make: attempts must be greater than 0")
  }
  return makeProto([{
    schedule: options.schedule,
    attempts: options.attempts,
    while: options.while
      ? (input: any) =>
        Effect.suspend(() => {
          const result = options.while!(input)
          return typeof result === "boolean" ? Effect.succeed(result) : result
        })
      : undefined,
    provide: options.provide
  }] as any)
}

const Proto: Omit<ExecutionPlan<any>, "steps"> = {
  [TypeId]: TypeId,
  get withRequirements() {
    const self = this as any as ExecutionPlan<any>
    return Effect.contextWith((context: Context.Context<any>) =>
      makeProto(self.steps.map((step) => ({
        ...step,
        provide: Layer.isLayer(step.provide) ? Layer.provide(step.provide, Layer.succeedContext(context)) : step.provide
      })) as any)
    )
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeProto = <Provides, In, PlanE, PlanR>(
  steps: ExecutionPlan<{
    provides: Provides
    input: In
    error: PlanE
    requirements: PlanR
  }>["steps"]
) => {
  const self = Object.create(Proto)
  self.steps = steps
  return self
}

/**
 * @since 3.16.0
 * @category Fallback
 * @experimental
 */
export const orElse: {
  <
    Provides2,
    Out,
    Err2 = never,
    Req2 = never,
    In2 = unknown,
    SIn = unknown,
    SR = never,
    WhileE = never,
    WhileR = never
  >(
    options:
      | ExecutionPlan<{
        provides: Provides2
        input: In2
        error: Err2
        requirements: Req2
      }>
      | {
        readonly provide: Context.Context<Provides2> | Layer.Layer<Provides2, Err2, Req2>
        readonly attempts?: number | undefined
        readonly while?:
          | ((input: In2) => boolean | Effect.Effect<boolean, WhileE, WhileR>)
          | undefined
        readonly schedule?: Schedule.Schedule<Out, SIn, SR> | undefined
      }
  ): <
    Provides,
    In,
    PlanE,
    PlanR
  >(
    self: ExecutionPlan<{
      provides: Provides
      input: In
      error: PlanE
      requirements: PlanR
    }>
  ) => ExecutionPlan<{
    provides: Provides & Provides2
    input: In & In2 & SIn
    error: PlanE | Err2 | WhileE
    requirements: PlanR | Req2 | SR | WhileR
  }>
  <
    Provides,
    In,
    PlanE,
    PlanR,
    Provides2,
    Out,
    Err2 = never,
    Req2 = never,
    In2 = unknown,
    SIn = unknown,
    SR = never,
    WhileE = never,
    WhileR = never
  >(
    self: ExecutionPlan<{
      provides: Provides
      input: In
      error: PlanE
      requirements: PlanR
    }>,
    options:
      | ExecutionPlan<{
        provides: Provides2
        input: In2
        error: Err2
        requirements: Req2
      }>
      | {
        readonly provide: Context.Context<Provides2> | Layer.Layer<Provides2, Err2, Req2>
        readonly attempts?: number | undefined
        readonly while?:
          | ((input: In2) => boolean | Effect.Effect<boolean, WhileE, WhileR>)
          | undefined
        readonly schedule?: Schedule.Schedule<Out, SIn, SR> | undefined
      }
  ): ExecutionPlan<{
    provides: Provides & Provides2
    input: In & In2 & SIn
    error: PlanE | Err2 | WhileE
    requirements: PlanR | Req2 | SR | WhileR
  }>
} = dual(2, <
  Provides,
  In,
  PlanE,
  PlanR,
  Provides2,
  Out,
  Err2 = never,
  Req2 = never,
  In2 = unknown,
  SIn = unknown,
  SR = never,
  WhileE = never,
  WhileR = never
>(
  self: ExecutionPlan<{
    provides: Provides
    input: In
    error: PlanE
    requirements: PlanR
  }>,
  options:
    | ExecutionPlan<{
      provides: Provides2
      input: In2
      error: Err2
      requirements: Req2
    }>
    | {
      readonly provide: Context.Context<Provides2> | Layer.Layer<Provides2, Err2, Req2>
      readonly attempts?: number | undefined
      readonly while?:
        | ((input: In2) => boolean | Effect.Effect<boolean, WhileE, WhileR>)
        | undefined
      readonly schedule?: Schedule.Schedule<Out, SIn, SR> | undefined
    }
): ExecutionPlan<{
  provides: Provides & Provides2
  input: In & In2 & SIn
  error: PlanE | Err2 | WhileE
  requirements: PlanR | Req2 | SR | WhileR
}> => {
  const other: ExecutionPlan<any> = isExecutionPlan(options) ? options : make(options as any)
  return makeProto(self.steps.concat(other.steps as any) as any)
})
