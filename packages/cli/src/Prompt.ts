/**
 * @since 1.0.0
 */
import type { FileSystem } from "@effect/platform/FileSystem"
import type { Path } from "@effect/platform/Path"
import type { QuitException, Terminal, UserInput } from "@effect/platform/Terminal"
import type { TaggedEnum } from "effect/Data"
import type { Effect } from "effect/Effect"
import type { Pipeable } from "effect/Pipeable"
import type { Redacted } from "effect/Redacted"
import * as InternalPrompt from "./internal/prompt.js"
import * as InternalConfirmPrompt from "./internal/prompt/confirm.js"
import * as InternalDatePrompt from "./internal/prompt/date.js"
import * as InternalFilePrompt from "./internal/prompt/file.js"
import * as InternalListPrompt from "./internal/prompt/list.js"
import * as InternalMultiSelectPrompt from "./internal/prompt/multi-select.js"
import * as InternalNumberPrompt from "./internal/prompt/number.js"
import * as InternalSelectPrompt from "./internal/prompt/select.js"
import * as InternalTextPrompt from "./internal/prompt/text.js"
import * as InternalTogglePrompt from "./internal/prompt/toggle.js"
import type { Primitive } from "./Primitive.js"

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
export interface Prompt<Output> extends Prompt.Variance<Output>, Pipeable, Effect<Output, QuitException, Terminal> {}

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
   * Represents the services available to a custom `Prompt`.
   *
   * @since 1.0.0
   * @category models
   */
  export type Environment = FileSystem | Path | Terminal

  /**
   * Represents the action that should be taken by a `Prompt` based upon the
   * user input received during the current frame.
   *
   * @since 1.0.0
   * @category models
   */
  export type Action<State, Output> = TaggedEnum<{
    readonly Beep: {}
    readonly NextFrame: { readonly state: State }
    readonly Submit: { readonly value: Output }
  }>

  /**
   * Represents the definition of an `Action`.
   *
   * Required to create a `Data.TaggedEnum` with generic type arguments.
   *
   * @since 1.0.0
   * @category models
   */
  export interface ActionDefinition extends TaggedEnum.WithGenerics<2> {
    readonly taggedEnum: Action<this["A"], this["B"]>
  }

  /**
   * Represents the set of handlers used by a `Prompt` to:
   *
   *   - Render the current frame of the prompt
   *   - Process user input and determine the next `Prompt.Action` to take
   *   - Clear the terminal screen before the next frame
   *
   * @since 1.0.0
   * @category models
   */
  export interface Handlers<State, Output> {
    /**
     * A function that is called to render the current frame of the `Prompt`.
     *
     * @param state The current state of the prompt.
     * @param action The `Prompt.Action` for the current frame.
     * @returns An ANSI escape code sequence to display in the terminal screen.
     */
    readonly render: (
      state: State,
      action: Action<State, Output>
    ) => Effect<string, never, Environment>
    /**
     * A function that is called to process user input and determine the next
     * `Prompt.Action` that should be taken.
     *
     * @param input The input the user provided for the current frame.
     * @param state The current state of the prompt.
     * @returns The next `Prompt.Action` that should be taken.
     */
    readonly process: (
      input: UserInput,
      state: State
    ) => Effect<Action<State, Output>, never, Environment>
    /**
     * A function that is called to clear the terminal screen before rendering
     * the next frame of the `Prompt`.
     *
     * @param action The `Prompt.Action` for the current frame.
     * @param columns The current number of columns available in the `Terminal`.
     * @returns An ANSI escape code sequence used to clear the terminal screen.
     */
    readonly clear: (
      state: State,
      action: Action<State, Output>
    ) => Effect<string, never, Environment>
  }

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
    readonly validate?: (value: globalThis.Date) => Effect<globalThis.Date, string>
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
    readonly validate?: (value: number) => Effect<number, string>
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
  export interface FileOptions {
    /**
     * The path type that will be selected.
     *
     * Defaults to `"file"`.
     */
    readonly type?: Primitive.PathType
    /**
     * The message to display in the prompt.
     *
     * Defaults to `"Choose a file"`.
     */
    readonly message?: string
    /**
     * Where the user will initially be prompted to select files from.
     *
     * Defaults to the current working directory.
     */
    readonly startingPath?: string
    /**
     * The number of choices to display at one time
     *
     * Defaults to `10`.
     */
    readonly maxPerPage?: number
    /**
     * A function which removes any file from the prompt display where the
     * specified predicate returns `true`.
     *
     * Defaults to returning all files.
     */
    readonly filter?: (file: string) => boolean | Effect<boolean, never, Environment>
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
  export interface MultiSelectOptions {
    /**
     * Text for the "Select All" option (defaults to "Select All").
     */
    readonly selectAll?: string
    /**
     * Text for the "Select None" option (defaults to "Select None").
     */
    readonly selectNone?: string
    /**
     * Text for the "Inverse Selection" option (defaults to "Inverse Selection").
     */
    readonly inverseSelection?: string
    /**
     * The minimum number of choices that must be selected.
     */
    readonly min?: number
    /**
     * The maximum number of choices that can be selected.
     */
    readonly max?: number
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
    /**
     * Whether this option should be selected by default (only used by MultiSelect).
     */
    readonly selected?: boolean
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
    readonly validate?: (value: string) => Effect<string, string>
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
  export type ReturnObject<T> = [T] extends [{ [K: string]: PromptAny }] ? Prompt<
      {
        -readonly [K in keyof T]: [T[K]] extends [Prompt.Variance<infer _A>] ? _A : never
      }
    >
    : never

  /**
   * @since 1.0.0
   */
  export type Return<
    Arg extends Iterable<PromptAny> | Record<string, PromptAny>
  > = [Arg] extends [ReadonlyArray<PromptAny>] ? ReturnTuple<Arg>
    : [Arg] extends [Iterable<PromptAny>] ? ReturnIterable<Arg>
    : [Arg] extends [Record<string, PromptAny>] ? ReturnObject<Arg>
    : never
}

/**
 * Runs all the provided prompts in sequence respecting the structure provided
 * in input.
 *
 * Supports either a tuple / iterable of prompts or a record / struct of prompts
 * as an argument.
 *
 * **Example**
 *
 * ```ts
 * import * as Prompt from "@effect/cli/Prompt"
 * import * as Effect from "effect/Effect"
 *
 * const username = Prompt.text({
 *   message: "Enter your username: "
 * })
 *
 * const password = Prompt.password({
 *   message: "Enter your password: ",
 *   validate: (value) =>
 *     value.length === 0
 *       ? Effect.fail("Password cannot be empty")
 *       : Effect.succeed(value)
 * })
 *
 * const allWithTuple = Prompt.all([username, password])
 *
 * const allWithRecord = Prompt.all({ username, password })
 * ```
 *
 * @since 1.0.0
 * @category collecting & elements
 */
export const all: <const Arg extends Iterable<Prompt<any>> | Record<string, Prompt<any>>>(arg: Arg) => All.Return<Arg> =
  InternalPrompt.all

/**
 * @since 1.0.0
 * @category constructors
 */
export const confirm: (options: Prompt.ConfirmOptions) => Prompt<boolean> = InternalConfirmPrompt.confirm

/**
 * Creates a custom `Prompt` from the specified initial state and handlers.
 *
 * The initial state can either be a pure value or an `Effect`. This is
 * particularly useful when the initial state of the `Prompt` must be computed
 * by performing some effectful computation, such as reading data from the file
 * system.
 *
 * A `Prompt` is essentially a render loop where user input triggers a new frame
 * to be rendered to the `Terminal`. The `handlers` of a custom prompt are used
 * to control what is rendered to the `Terminal` each frame. During each frame,
 * the following occurs:
 *
 *   1. The `render` handler is called with this frame's prompt state and prompt
 *      action and returns an ANSI escape string to be rendered to the
 *      `Terminal`
 *   2. The `Terminal` obtains input from the user
 *   3. The `process` handler is called with the input obtained from the user
 *      and this frame's prompt state and returns the next prompt action that
 *      should be performed
 *   4. The `clear` handler is called with this frame's prompt state and prompt
 *      action and returns an ANSI escape string used to clear the screen of
 *      the `Terminal`
 *
 * @since 1.0.0
 * @category constructors
 */
export const custom: <State, Output>(
  initialState: State | Effect<State, never, Prompt.Environment>,
  handlers: Prompt.Handlers<State, Output>
) => Prompt<Output> = InternalPrompt.custom

/**
 * @since 1.0.0
 * @category constructors
 */
export const date: (options: Prompt.DateOptions) => Prompt<Date> = InternalDatePrompt.date

/**
 * @since 1.0.0
 * @category constructors
 */
export const file: (options?: Prompt.FileOptions) => Prompt<string> = InternalFilePrompt.file

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
export const hidden: (options: Prompt.TextOptions) => Prompt<Redacted> = InternalTextPrompt.hidden

/**
 * @since 1.0.0
 * @category constructors
 */
export const integer: (options: Prompt.IntegerOptions) => Prompt<number> = InternalNumberPrompt.integer

/**
 * @since 1.0.0
 * @category constructors
 */
export const list: (options: Prompt.ListOptions) => Prompt<Array<string>> = InternalListPrompt.list

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
export const password: (options: Prompt.TextOptions) => Prompt<Redacted> = InternalTextPrompt.password

/**
 * Executes the specified `Prompt`.
 *
 * @since 1.0.0
 * @category execution
 */
export const run: <Output>(self: Prompt<Output>) => Effect<Output, QuitException, Prompt.Environment> =
  InternalPrompt.run

/**
 * @since 1.0.0
 * @category constructors
 */
export const select: <const A>(options: Prompt.SelectOptions<A>) => Prompt<A> = InternalSelectPrompt.select

/**
 * @since 1.0.0
 * @category constructors
 */
export const multiSelect: <const A>(options: Prompt.SelectOptions<A> & Prompt.MultiSelectOptions) => Prompt<Array<A>> =
  InternalMultiSelectPrompt.multiSelect

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
export const toggle: (options: Prompt.ToggleOptions) => Prompt<boolean> = InternalTogglePrompt.toggle
