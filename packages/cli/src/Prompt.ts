/**
 * @since 1.0.0
 */
import type { Effect, Pipeable } from "effect"
import * as internal from "./internal/prompt"
import * as numberPrompt from "./internal/prompt/number"
import * as selectPrompt from "./internal/prompt/select"
import * as textPrompt from "./internal/prompt/text"
import type { PromptAction } from "./Prompt/Action"
import type { Terminal } from "./Terminal"

/**
 * @since 1.0.0
 * @category symbols
 */
export const PromptTypeId: unique symbol = internal.PromptTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type PromptTypeId = typeof PromptTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Prompt<Output>
  extends Prompt.Variance<Output>, Pipeable.Pipeable, Effect.Effect<Terminal, never, Output>
{}

/**
 * @since 1.0.0
 */
export declare namespace Prompt {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<Output> {
    readonly [PromptTypeId]: Prompt.VarianceStruct<Output>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface VarianceStruct<Output> {
    readonly _Output: (_: never) => Output
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Action<State, Output> = PromptAction<State, Output>

  /**
   * @since 1.0.0
   * @category models
   */
  export interface IntegerOptions {
    readonly message: string
    readonly min?: number
    readonly max?: number
    readonly incrementBy?: number
    readonly decrementBy?: number
    readonly validate?: (value: number) => Effect.Effect<never, string, number>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface FloatOptions extends IntegerOptions {
    readonly precision?: number
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface SelectOptions {
    readonly message: string
    readonly choices: ReadonlyArray<{
      readonly title: string
      readonly description?: string
      readonly value: string
    }>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface TextOptions {
    readonly message: string
    readonly type?: "hidden" | "password" | "text"
    readonly default?: string
    readonly validate?: (value: string) => Effect.Effect<never, string, string>
  }
}

/**
 * @since 1.0.0
 */
export declare namespace All {
  /**
   * @since 1.0.0
   */
  export type PromptAny = Prompt<any>

  /**
   * @since 1.0.0
   */
  export type ReturnIterable<T extends Iterable<PromptAny>> = [T] extends [Iterable<Prompt.Variance<infer A>>] ?
    Prompt<Array<A>>
    : never

  /**
   * @since 1.0.0
   */
  export type ReturnTuple<T extends ReadonlyArray<unknown>> = Prompt<
    T[number] extends never ? []
      : { -readonly [K in keyof T]: [T[K]] extends [Prompt.Variance<infer _A>] ? _A : never }
  > extends infer X ? X : never

  /**
   * @since 1.0.0
   */
  export type Return<Arg extends Iterable<PromptAny>> = [Arg] extends [ReadonlyArray<PromptAny>] ? ReturnTuple<Arg>
    : [Arg] extends [Iterable<PromptAny>] ? ReturnIterable<Arg>
    : never
}

/**
 * Runs all the provided prompts in sequence respecting the structure provided
 * in input.
 *
 * Supports multiple arguments, a single argument tuple / array or record /
 * struct.
 *
 * @since 1.0.0
 * @category collecting & elements
 */
export const all: <
  const Arg extends Iterable<Prompt<any>>
>(arg: Arg) => All.Return<Arg> = internal.all

/**
 * Creates a custom `Prompt` from the provided `render` and `process` functions
 * with the specified initial state.
 *
 * The `render` function will be used to render the terminal prompt to a user
 * and is invoked at the beginning of each terminal render frame. The `process`
 * function is invoked immediately after a user presses a key.
 *
 * @since 1.0.0
 * @category constructors
 */
export const custom: <State, Output>(
  initialState: State,
  render: (
    state: State,
    action: Prompt.Action<State, Output>
  ) => Effect.Effect<never, never, string>,
  process: (
    input: Terminal.UserInput,
    state: State
  ) => Effect.Effect<never, never, Prompt.Action<State, Output>>
) => Prompt<Output> = internal.custom

/**
 * @since 1.0.0
 * @category combinators
 */
export const flatMap: {
  <Output, Output2>(f: (output: Output) => Prompt<Output2>): (self: Prompt<Output>) => Prompt<Output2>
  <Output, Output2>(self: Prompt<Output>, f: (output: Output) => Prompt<Output2>): Prompt<Output2>
} = internal.flatMap

/**
 * @since 1.0.0
 * @category constructors
 */
export const float: (options: Prompt.FloatOptions) => Prompt<number> = numberPrompt.float

/**
 * @since 1.0.0
 * @category constructors
 */
export const integer: (options: Prompt.IntegerOptions) => Prompt<number> = numberPrompt.integer

/**
 * @since 1.0.0
 * @category combinators
 */
export const map: {
  <Output, Output2>(f: (output: Output) => Output2): (self: Prompt<Output>) => Prompt<Output2>
  <Output, Output2>(self: Prompt<Output>, f: (output: Output) => Output2): Prompt<Output2>
} = internal.map

/**
 * Executes the specified `Prompt`.
 *
 * @since 1.0.0
 * @category execution
 */
export const run: <Output>(self: Prompt<Output>) => Effect.Effect<Terminal, never, Output> = internal.run

/**
 * @since 1.0.0
 * @category constructors
 */
export const select: (options: Prompt.SelectOptions) => Prompt<string> = selectPrompt.select

/**
 * Creates a `Prompt` which immediately succeeds with the specified value.
 *
 * **NOTE**: This method will not attempt to obtain user input or render
 * anything to the screen.
 *
 * @since 1.0.0
 * @category constructors
 */
export const succeed: <A>(value: A) => Prompt<A> = internal.succeed

/**
 * @since 1.0.0
 * @category constructors
 */
export const text: (options: Prompt.TextOptions) => Prompt<string> = textPrompt.text
