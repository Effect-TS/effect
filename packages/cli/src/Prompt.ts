/**
 * @since 1.0.0
 */
import type { QuitException, Terminal, UserInput } from "@effect/platform/Terminal"
import type { Effect } from "effect/Effect"
import type { Option } from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import type { Secret } from "effect/Secret"
import * as InternalPrompt from "./internal/prompt.js"
import * as InternalConfirmPrompt from "./internal/prompt/confirm.js"
import * as InternalDatePrompt from "./internal/prompt/date.js"
import * as InternalListPrompt from "./internal/prompt/list.js"
import * as InternalNumberPrompt from "./internal/prompt/number.js"
import * as InternalSelectPrompt from "./internal/prompt/select.js"
import * as InternalTextPrompt from "./internal/prompt/text.js"
import * as InternalTogglePrompt from "./internal/prompt/toggle.js"
import type { PromptAction } from "./Prompt/Action.js"

/**
 * @since 1.0.0
 * @category symbols
 */
export const PromptTypeId: unique symbol = InternalPrompt.PromptTypeId

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
  extends Prompt.Variance<Output>, Pipeable, Effect<Terminal, QuitException, Output>
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
  export interface ConfirmOptions {
    /**
     * The message to display in the prompt.
     */
    readonly message: string
    /**
     * The intitial value of the confirm prompt (defaults to `false`).
     */
    readonly initial?: boolean
    /**
     * The label to display after a user has responded to the prompt.
     */
    readonly label?: {
      /**
       * The label used if the prompt is confirmed (defaults to `"yes"`).
       */
      readonly confirm: string
      /**
       * The label used if the prompt is not confirmed (defaults to `"no"`).
       */
      readonly deny: string
    }
    /**
     * The placeholder to display when a user is responding to the prompt.
     */
    readonly placeholder?: {
      /**
       * The placeholder to use if the `initial` value of the prompt is `true`
       * (defaults to `"(Y/n)"`).
       */
      readonly defaultConfirm?: string
      /**
       * The placeholder to use if the `initial` value of the prompt is `false`
       * (defaults to `"(y/N)"`).
       */
      readonly defaultDeny?: string
    }
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface DateOptions {
    /**
     * The message to display in the prompt.
     */
    readonly message: string
    /**
     * The initial date value to display in the prompt (defaults to the current
     * date).
     */
    readonly initial?: globalThis.Date
    /**
     * The format mask of the date (defaults to `YYYY-MM-DD HH:mm:ss`).
     */
    readonly dateMask?: string
    /**
     * An effectful function that can be used to validate the value entered into
     * the prompt before final submission.
     */
    readonly validate?: (value: globalThis.Date) => Effect<never, string, globalThis.Date>
    /**
     * Custom locales that can be used in place of the defaults.
     */
    readonly locales?: {
      /**
       * The full names of each month of the year.
       */
      readonly months: [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string
      ]
      /**
       * The short names of each month of the year.
       */
      readonly monthsShort: [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string
      ]
      /**
       * The full names of each day of the week.
       */
      readonly weekdays: [string, string, string, string, string, string, string]
      /**
       * The short names of each day of the week.
       */
      readonly weekdaysShort: [string, string, string, string, string, string, string]
    }
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface IntegerOptions {
    /**
     * The message to display in the prompt.
     */
    readonly message: string
    /**
     * The minimum value that can be entered by the user (defaults to `-Infinity`).
     */
    readonly min?: number
    /**
     * The maximum value that can be entered by the user (defaults to `Infinity`).
     */
    readonly max?: number
    /**
     * The value that will be used to increment the prompt value when using the
     * up arrow key (defaults to `1`).
     */
    readonly incrementBy?: number
    /**
     * The value that will be used to decrement the prompt value when using the
     * down arrow key (defaults to `1`).
     */
    readonly decrementBy?: number
    /**
     * An effectful function that can be used to validate the value entered into
     * the prompt before final submission.
     */
    readonly validate?: (value: number) => Effect<never, string, number>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface FloatOptions extends IntegerOptions {
    /**
     * The precision to use for the floating point value (defaults to `2`).
     */
    readonly precision?: number
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface ListOptions extends TextOptions {
    /**
     * The delimiter that separates list entries.
     */
    readonly delimiter?: string
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface SelectOptions<A> {
    /**
     * The message to display in the prompt.
     */
    readonly message: string
    /**
     * The choices to display to the user.
     */
    readonly choices: ReadonlyArray<SelectChoice<A>>
    /**
     * The number of choices to display at one time (defaults to `10`).
     */
    readonly maxPerPage?: number
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface SelectChoice<A> {
    /**
     * The name of the select option that is displayed to the user.
     */
    readonly title: string
    /**
     * The underlying value of the select option.
     */
    readonly value: A
    /**
     * An optional description for the select option which will be displayed
     * to the user.
     */
    readonly description?: string
    /**
     * Whether or not this select option is disabled.
     */
    readonly disabled?: boolean
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface TextOptions {
    /**
     * The message to display in the prompt.
     */
    readonly message: string
    /**
     * The default value of the text option.
     */
    readonly default?: string
    /**
     * An effectful function that can be used to validate the value entered into
     * the prompt before final submission.
     */
    readonly validate?: (value: string) => Effect<never, string, string>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface ToggleOptions {
    /**
     * The message to display in the prompt.
     */
    readonly message: string
    /**
     * The intitial value of the toggle prompt (defaults to `false`).
     */
    readonly initial?: boolean
    /**
     * The text to display when the toggle is in the active state (defaults to
     * `on`).
     */
    readonly active?: string
    /**
     * The text to display when the toggle is in the inactive state (defaults to
     * `off`).
     */
    readonly inactive?: string
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
  export type ReturnIterable<T extends Iterable<PromptAny>> = [T] extends
    [Iterable<Prompt.Variance<infer A>>] ? Prompt<Array<A>>
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
  export type Return<Arg extends Iterable<PromptAny>> = [Arg] extends [ReadonlyArray<PromptAny>] ?
    ReturnTuple<Arg>
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
>(arg: Arg) => All.Return<Arg> = InternalPrompt.all

/**
 * @since 1.0.0
 * @category constructors
 */
export const confirm: (options: Prompt.ConfirmOptions) => Prompt<boolean> =
  InternalConfirmPrompt.confirm

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
    prevState: Option<State>,
    nextState: State,
    action: Prompt.Action<State, Output>
  ) => Effect<Terminal, never, string>,
  process: (
    input: UserInput,
    state: State
  ) => Effect<Terminal, never, Prompt.Action<State, Output>>
) => Prompt<Output> = InternalPrompt.custom

/**
 * @since 1.0.0
 * @category constructors
 */
export const date: (options: Prompt.DateOptions) => Prompt<Date> = InternalDatePrompt.date

/**
 * @since 1.0.0
 * @category combinators
 */
export const flatMap: {
  <Output, Output2>(
    f: (output: Output) => Prompt<Output2>
  ): (self: Prompt<Output>) => Prompt<Output2>
  <Output, Output2>(self: Prompt<Output>, f: (output: Output) => Prompt<Output2>): Prompt<Output2>
} = InternalPrompt.flatMap

/**
 * @since 1.0.0
 * @category constructors
 */
export const float: (options: Prompt.FloatOptions) => Prompt<number> = InternalNumberPrompt.float

/**
 * @since 1.0.0
 * @category constructors
 */
export const hidden: (options: Prompt.TextOptions) => Prompt<Secret> = InternalTextPrompt.hidden

/**
 * @since 1.0.0
 * @category constructors
 */
export const integer: (options: Prompt.IntegerOptions) => Prompt<number> =
  InternalNumberPrompt.integer

/**
 * @since 1.0.0
 * @category constructors
 */
export const list: (options: Prompt.ListOptions) => Prompt<ReadonlyArray<string>> =
  InternalListPrompt.list

/**
 * @since 1.0.0
 * @category combinators
 */
export const map: {
  <Output, Output2>(f: (output: Output) => Output2): (self: Prompt<Output>) => Prompt<Output2>
  <Output, Output2>(self: Prompt<Output>, f: (output: Output) => Output2): Prompt<Output2>
} = InternalPrompt.map

/**
 * @since 1.0.0
 * @category constructors
 */
export const password: (options: Prompt.TextOptions) => Prompt<Secret> = InternalTextPrompt.password

/**
 * Executes the specified `Prompt`.
 *
 * @since 1.0.0
 * @category execution
 */
export const run: <Output>(self: Prompt<Output>) => Effect<Terminal, QuitException, Output> =
  InternalPrompt.run

/**
 * @since 1.0.0
 * @category constructors
 */
export const select: <A>(options: Prompt.SelectOptions<A>) => Prompt<A> =
  InternalSelectPrompt.select

/**
 * Creates a `Prompt` which immediately succeeds with the specified value.
 *
 * **NOTE**: This method will not attempt to obtain user input or render
 * anything to the screen.
 *
 * @since 1.0.0
 * @category constructors
 */
export const succeed: <A>(value: A) => Prompt<A> = InternalPrompt.succeed

/**
 * @since 1.0.0
 * @category constructors
 */
export const text: (options: Prompt.TextOptions) => Prompt<string> = InternalTextPrompt.text

/**
 * @since 1.0.0
 * @category constructors
 */
export const toggle: (options: Prompt.ToggleOptions) => Prompt<boolean> =
  InternalTogglePrompt.toggle
