import type * as PromptAction from "../../Prompt/Action"

/** @internal */
export const beep: PromptAction.PromptAction<never, never> = {
  _tag: "Beep"
}

/** @internal */
export const error = (message: string): PromptAction.PromptAction<never, never> => ({
  _tag: "Error",
  message
})

/** @internal */
export const nextFrame = <State>(state: State): PromptAction.PromptAction<State, never> => ({
  _tag: "NextFrame",
  state
})

/** @internal */
export const submit = <Output>(value: Output): PromptAction.PromptAction<never, Output> => ({
  _tag: "Submit",
  value
})
