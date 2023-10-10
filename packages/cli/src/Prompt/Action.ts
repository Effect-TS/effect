/**
 * @since 1.0.0
 */
import * as internal from "@effect/cli/internal/prompt/action"

/**
 * @since 1.0.0
 * @category models
 */
export type PromptAction<State, Output> = Beep | Error | NextFrame<State> | Submit<Output>

/**
 * @since 1.0.0
 * @category models
 */
export interface Beep {
  readonly _tag: "Beep"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Error {
  readonly _tag: "Error"
  readonly message: string
}

/**
 * @since 1.0.0
 * @category models
 */
export interface NextFrame<State> {
  readonly _tag: "NextFrame"
  readonly state: State
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Submit<Output> {
  readonly _tag: "Submit"
  readonly value: Output
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const beep: PromptAction<never, never> = internal.beep

/**
 * @since 1.0.0
 * @category constructors
 */
export const error: (message: string) => PromptAction<never, never> = internal.error

/**
 * @since 1.0.0
 * @category constructors
 */
export const nextFrame: <State>(state: State) => PromptAction<State, never> = internal.nextFrame

/**
 * @since 1.0.0
 * @category constructors
 */
export const submit: <Output>(value: Output) => PromptAction<never, Output> = internal.submit
