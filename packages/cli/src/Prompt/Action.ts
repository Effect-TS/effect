/**
 * @since 1.0.0
 */
import * as InternalPromptAction from "../internal/prompt/action.js"

/**
 * @since 1.0.0
 * @category models
 */
export type PromptAction<State, Output> = Beep | NextFrame<State> | Submit<Output>

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
export const beep: PromptAction<never, never> = InternalPromptAction.beep

/**
 * @since 1.0.0
 * @category constructors
 */
export const nextFrame: <State>(state: State) => PromptAction<State, never> = InternalPromptAction.nextFrame

/**
 * @since 1.0.0
 * @category constructors
 */
export const submit: <Output>(value: Output) => PromptAction<never, Output> = InternalPromptAction.submit
