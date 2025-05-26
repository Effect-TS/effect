/**
 * @since 3.16.0
 * @experimental
 */
import type { NonEmptyReadonlyArray } from "./Array.js"
import type * as Context from "./Context.js"
import * as Effect from "./Effect.js"
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
 * const ThePlan = ExecutionPlan.make(
 *   {
 *     // First try with the bad layer 2 times with a 3 second delay between attempts
 *     provide: layerBad,
 *     attempts: 2,
 *     schedule: Schedule.spaced(3000)
 *   },
 *   // Then try with the bad layer 3 times with a 1 second delay between attempts
 *   {
 *     provide: layerBad,
 *     attempts: 3,
 *     schedule: Schedule.spaced(1000)
 *   },
 *   // Finally try with the good layer.
 *   //
 *   // If `attempts` is omitted, the plan will only attempt once, unless a schedule is provided.
 *   {
 *     provide: layerGood
 *   }
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
  Types extends {
    provides: any
    input: any
    error: any
    requirements: any
  }
> extends Pipeable {
  readonly [TypeId]: TypeId
  readonly steps: NonEmptyReadonlyArray<{
    readonly provide:
      | Context.Context<Types["provides"]>
      | Layer.Layer<Types["provides"], Types["error"], Types["requirements"]>
    readonly attempts?: number | undefined
    readonly while?:
      | ((input: Types["input"]) => Effect.Effect<boolean, Types["error"], Types["requirements"]>)
      | undefined
    readonly schedule?: Schedule.Schedule<any, Types["input"], Types["requirements"]> | undefined
  }>

  /**
   * Returns an equivalent `ExecutionPlan` with the requirements satisfied,
   * using the current context.
   */
  readonly withRequirements: Effect.Effect<
    ExecutionPlan<{
      provides: Types["provides"]
      input: Types["input"]
      error: Types["error"]
      requirements: never
    }>,
    never,
    Types["requirements"]
  >
}

/**
 * @since 3.16.0
 * @experimental
 */
export type TypesBase = {
  provides: any
  input: any
  error: any
  requirements: any
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
 * const ThePlan = ExecutionPlan.make(
 *   {
 *     // First try with the bad layer 2 times with a 3 second delay between attempts
 *     provide: layerBad,
 *     attempts: 2,
 *     schedule: Schedule.spaced(3000)
 *   },
 *   // Then try with the bad layer 3 times with a 1 second delay between attempts
 *   {
 *     provide: layerBad,
 *     attempts: 3,
 *     schedule: Schedule.spaced(1000)
 *   },
 *   // Finally try with the good layer.
 *   //
 *   // If `attempts` is omitted, the plan will only attempt once, unless a schedule is provided.
 *   {
 *     provide: layerGood
 *   }
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
export const make: {
  <StepA extends make.Step>(step: StepA): ExecutionPlan<{
    provides: make.StepProvides<StepA>
    input: make.StepInput<StepA>
    error: make.StepError<StepA>
    requirements: make.StepRequirements<StepA>
  }>
  <StepA extends make.Step, StepB extends make.Step>(
    stepA: StepA,
    stepB: StepB
  ): ExecutionPlan<{
    provides: make.StepProvides<StepA | StepB>
    input: make.StepInput<StepA> & make.StepInput<StepB>
    error: make.StepError<StepA | StepB>
    requirements: make.StepRequirements<StepA | StepB>
  }>
  <StepA extends make.Step, StepB extends make.Step, StepC extends make.Step>(
    stepA: StepA,
    stepB: StepB,
    stepC: StepC
  ): ExecutionPlan<{
    provides: make.StepProvides<StepA | StepB | StepC>
    input: make.StepInput<StepA> & make.StepInput<StepB> & make.StepInput<StepC>
    error: make.StepError<StepA | StepB | StepC>
    requirements: make.StepRequirements<StepA | StepB | StepC>
  }>
  <StepA extends make.Step, StepB extends make.Step, StepC extends make.Step, StepD extends make.Step>(
    stepA: StepA,
    stepB: StepB,
    stepC: StepC,
    stepD: StepD
  ): ExecutionPlan<{
    provides: make.StepProvides<StepA | StepB | StepC | StepD>
    input: make.StepInput<StepA> & make.StepInput<StepB> & make.StepInput<StepC> & make.StepInput<StepD>
    error: make.StepError<StepA | StepB | StepC | StepD>
    requirements: make.StepRequirements<StepA | StepB | StepC | StepD>
  }>
  <
    StepA extends make.Step,
    StepB extends make.Step,
    StepC extends make.Step,
    StepD extends make.Step,
    StepE extends make.Step
  >(
    stepA: StepA,
    stepB: StepB,
    stepC: StepC,
    stepD: StepD,
    stepE: StepE
  ): ExecutionPlan<{
    provides: make.StepProvides<StepA | StepB | StepC | StepD | StepE>
    input:
      & make.StepInput<StepA>
      & make.StepInput<StepB>
      & make.StepInput<StepC>
      & make.StepInput<StepD>
      & make.StepInput<StepE>
    error: make.StepError<StepA | StepB | StepC | StepD | StepE>
    requirements: make.StepRequirements<StepA | StepB | StepC | StepD | StepE>
  }>
  <
    StepA extends make.Step,
    StepB extends make.Step,
    StepC extends make.Step,
    StepD extends make.Step,
    StepE extends make.Step,
    StepF extends make.Step
  >(
    stepA: StepA,
    stepB: StepB,
    stepC: StepC,
    stepD: StepD,
    stepE: StepE,
    stepF: StepF
  ): ExecutionPlan<{
    provides: make.StepProvides<StepA | StepB | StepC | StepD | StepE | StepF>
    input:
      & make.StepInput<StepA>
      & make.StepInput<StepB>
      & make.StepInput<StepC>
      & make.StepInput<StepD>
      & make.StepInput<StepE>
      & make.StepInput<StepF>
    error: make.StepError<StepA | StepB | StepC | StepD | StepE | StepF>
    requirements: make.StepRequirements<StepA | StepB | StepC | StepD | StepE | StepF>
  }>
  <
    StepA extends make.Step,
    StepB extends make.Step,
    StepC extends make.Step,
    StepD extends make.Step,
    StepE extends make.Step,
    StepF extends make.Step,
    StepG extends make.Step
  >(
    stepA: StepA,
    stepB: StepB,
    stepC: StepC,
    stepD: StepD,
    stepE: StepE,
    stepF: StepF,
    stepG: StepG
  ): ExecutionPlan<{
    provides: make.StepProvides<StepA | StepB | StepC | StepD | StepE | StepF | StepG>
    input:
      & make.StepInput<StepA>
      & make.StepInput<StepB>
      & make.StepInput<StepC>
      & make.StepInput<StepD>
      & make.StepInput<StepE>
      & make.StepInput<StepF>
      & make.StepInput<StepG>
    error: make.StepError<StepA | StepB | StepC | StepD | StepE | StepF | StepG>
    requirements: make.StepRequirements<StepA | StepB | StepC | StepD | StepE | StepF | StepG>
  }>
  <
    StepA extends make.Step,
    StepB extends make.Step,
    StepC extends make.Step,
    StepD extends make.Step,
    StepE extends make.Step,
    StepF extends make.Step,
    StepG extends make.Step,
    StepH extends make.Step
  >(
    stepA: StepA,
    stepB: StepB,
    stepC: StepC,
    stepD: StepD,
    stepE: StepE,
    stepF: StepF,
    stepG: StepG,
    stepH: StepH
  ): ExecutionPlan<{
    provides: make.StepProvides<StepA | StepB | StepC | StepD | StepE | StepF | StepG | StepH>
    input:
      & make.StepInput<StepA>
      & make.StepInput<StepB>
      & make.StepInput<StepC>
      & make.StepInput<StepD>
      & make.StepInput<StepE>
      & make.StepInput<StepF>
      & make.StepInput<StepG>
      & make.StepInput<StepH>
    error: make.StepError<StepA | StepB | StepC | StepD | StepE | StepF | StepG | StepH>
    requirements: make.StepRequirements<StepA | StepB | StepC | StepD | StepE | StepF | StepG | StepH>
  }>
} = function make(...steps: Array<make.Step>): ExecutionPlan<any> {
  return makeProto(steps.map((options, i) => {
    if (options.attempts && options.attempts < 1) {
      throw new Error(`ExecutionPlan.make: step[${i}].attempts must be greater than 0`)
    }
    return {
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
    }
  }) as any)
}

/**
 * @since 3.16.0
 * @experimental
 */
export declare namespace make {
  /**
   * @since 3.16.0
   * @experimental
   */
  export type Step = {
    readonly provide: Context.Context<any> | Context.Context<never> | Layer.Layer.Any
    readonly attempts?: number
    readonly while?: (input: any) => boolean | Effect.Effect<boolean, any, any>
    readonly schedule?: Schedule.Schedule<any, any, any>
  }

  /**
   * @since 3.16.0
   * @experimental
   */
  export type StepProvides<S extends Step> = S["provide"] extends
    Context.Context<infer P> | Layer.Layer<infer P, infer _E, infer _R> ? P : never

  /**
   * @since 3.16.0
   * @experimental
   */
  export type StepInput<S extends Step> =
    & (S["while"] extends (input: infer I) => infer _ ? I : unknown)
    & (S["schedule"] extends Schedule.Schedule<infer _O, infer I, infer _R> ? I : unknown)

  /**
   * @since 3.16.0
   * @experimental
   */
  export type StepError<S extends Step> =
    | (S["provide"] extends Context.Context<infer _P> | Layer.Layer<infer _P, infer E, infer _R> ? E : never)
    | (S["while"] extends (input: infer _I) => Effect.Effect<infer _A, infer _E, infer _R> ? _E : never)

  /**
   * @since 3.16.0
   * @experimental
   */
  export type StepRequirements<S extends Step> =
    | (S["provide"] extends Layer.Layer<infer _A, infer _E, infer R> ? R : never)
    | (S["while"] extends (input: infer _I) => Effect.Effect<infer _A, infer _E, infer R> ? R : never)
    | (S["schedule"] extends Schedule.Schedule<infer _O, infer _I, infer R> ? R : never)
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
 * @category Combining
 * @experimental
 */
export const merge: {
  <A extends TypesBase, B extends TypesBase>(
    planA: ExecutionPlan<A>,
    planB: ExecutionPlan<B>
  ): ExecutionPlan<{
    provides: A["provides"] | B["provides"]
    input: A["input"] & B["input"]
    error: A["error"] | B["error"]
    requirements: A["requirements"] | B["requirements"]
  }>
  <A extends TypesBase, B extends TypesBase, C extends TypesBase>(
    planA: ExecutionPlan<A>,
    planB: ExecutionPlan<B>,
    planC: ExecutionPlan<C>
  ): ExecutionPlan<{
    provides: A["provides"] | B["provides"] | C["provides"]
    input: A["input"] & B["input"] & C["input"]
    error: A["error"] | B["error"] | C["error"]
    requirements: A["requirements"] | B["requirements"] | C["requirements"]
  }>
  <A extends TypesBase, B extends TypesBase, C extends TypesBase, D extends TypesBase>(
    planA: ExecutionPlan<A>,
    planB: ExecutionPlan<B>,
    planC: ExecutionPlan<C>,
    planD: ExecutionPlan<D>
  ): ExecutionPlan<{
    provides: A["provides"] | B["provides"] | C["provides"] | D["provides"]
    input: A["input"] & B["input"] & C["input"] & D["input"]
    error: A["error"] | B["error"] | C["error"] | D["error"]
    requirements: A["requirements"] | B["requirements"] | C["requirements"] | D["requirements"]
  }>
  <A extends TypesBase, B extends TypesBase, C extends TypesBase, D extends TypesBase, E extends TypesBase>(
    planA: ExecutionPlan<A>,
    planB: ExecutionPlan<B>,
    planC: ExecutionPlan<C>,
    planD: ExecutionPlan<D>,
    planE: ExecutionPlan<E>
  ): ExecutionPlan<{
    provides: A["provides"] | B["provides"] | C["provides"] | D["provides"] | E["provides"]
    input: A["input"] & B["input"] & C["input"] & D["input"] & E["input"]
    error: A["error"] | B["error"] | C["error"] | D["error"] | E["error"]
    requirements: A["requirements"] | B["requirements"] | C["requirements"] | D["requirements"] | E["requirements"]
  }>
  <
    A extends TypesBase,
    B extends TypesBase,
    C extends TypesBase,
    D extends TypesBase,
    E extends TypesBase,
    F extends TypesBase
  >(
    planA: ExecutionPlan<A>,
    planB: ExecutionPlan<B>,
    planC: ExecutionPlan<C>,
    planD: ExecutionPlan<D>,
    planE: ExecutionPlan<E>,
    planF: ExecutionPlan<F>
  ): ExecutionPlan<{
    provides: A["provides"] | B["provides"] | C["provides"] | D["provides"] | E["provides"] | F["provides"]
    input: A["input"] & B["input"] & C["input"] & D["input"] & E["input"] & F["input"]
    error: A["error"] | B["error"] | C["error"] | D["error"] | E["error"] | F["error"]
    requirements:
      | A["requirements"]
      | B["requirements"]
      | C["requirements"]
      | D["requirements"]
      | E["requirements"]
      | F["requirements"]
  }>
  <
    A extends TypesBase,
    B extends TypesBase,
    C extends TypesBase,
    D extends TypesBase,
    E extends TypesBase,
    F extends TypesBase,
    G extends TypesBase
  >(
    planA: ExecutionPlan<A>,
    planB: ExecutionPlan<B>,
    planC: ExecutionPlan<C>,
    planD: ExecutionPlan<D>,
    planE: ExecutionPlan<E>,
    planF: ExecutionPlan<F>,
    planG: ExecutionPlan<G>
  ): ExecutionPlan<{
    provides:
      | A["provides"]
      | B["provides"]
      | C["provides"]
      | D["provides"]
      | E["provides"]
      | F["provides"]
      | G["provides"]
    input: A["input"] & B["input"] & C["input"] & D["input"] & E["input"] & F["input"] & G["input"]
    error: A["error"] | B["error"] | C["error"] | D["error"] | E["error"] | F["error"] | G["error"]
    requirements:
      | A["requirements"]
      | B["requirements"]
      | C["requirements"]
      | D["requirements"]
      | E["requirements"]
      | F["requirements"]
      | G["requirements"]
  }>
} = function merge(...plans: Array<ExecutionPlan<any>>): ExecutionPlan<any> {
  return makeProto(plans.flatMap((plan) => plan.steps) as any)
}
