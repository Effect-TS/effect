import * as Terminal from "@effect/platform/Terminal"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import { dual } from "effect/Function"
import * as Option from "effect/Option"
import * as Pipeable from "effect/Pipeable"
import * as Ref from "effect/Ref"
import type * as Prompt from "../Prompt.js"
import type * as PromptAction from "../Prompt/Action.js"

/** @internal */
const PromptSymbolKey = "@effect/cli/Prompt"

/** @internal */
export const PromptTypeId: Prompt.PromptTypeId = Symbol.for(
  PromptSymbolKey
) as Prompt.PromptTypeId

/** @internal */
const proto = {
  ...Effectable.CommitPrototype,
  [PromptTypeId]: {
    _Output: (_: never) => _
  },
  commit(): Effect.Effect<Terminal.Terminal, Terminal.QuitException, unknown> {
    return run(this as Prompt.Prompt<unknown>)
  },
  pipe() {
    return Pipeable.pipeArguments(this, arguments)
  }
}

/** @internal */
type Op<Tag extends string, Body = {}> = Prompt.Prompt<never> & Body & {
  readonly _tag: Tag
}

/** @internal */
export type Primitive = Loop | OnSuccess | Succeed

/** @internal */
export interface Loop extends
  Op<"Loop", {
    readonly initialState: unknown
    readonly render: (
      prevState: Option.Option<unknown>,
      nextState: unknown,
      action: Prompt.Prompt.Action<unknown, unknown>
    ) => Effect.Effect<never, never, string>
    readonly process: (
      input: Terminal.UserInput,
      state: unknown
    ) => Effect.Effect<never, never, Prompt.Prompt.Action<unknown, unknown>>
  }>
{}

/** @internal */
export interface OnSuccess extends
  Op<"OnSuccess", {
    readonly prompt: Primitive
    readonly onSuccess: (value: unknown) => Prompt.Prompt<unknown>
  }>
{}

/** @internal */
export interface Succeed extends
  Op<"Succeed", {
    readonly value: unknown
  }>
{}

/** @internal */
export const isPrompt = (u: unknown): u is Prompt.Prompt<unknown> =>
  typeof u === "object" && u != null && PromptTypeId in u

const allTupled = <const T extends ArrayLike<Prompt.Prompt<any>>>(arg: T): Prompt.Prompt<
  {
    [K in keyof T]: [T[K]] extends [Prompt.Prompt<infer A>] ? A : never
  }
> => {
  if (arg.length === 0) {
    return succeed([]) as any
  }
  if (arg.length === 1) {
    return map(arg[0], (x) => [x]) as any
  }
  let result = map(arg[0], (x) => [x])
  for (let i = 1; i < arg.length; i++) {
    const curr = arg[i]
    result = flatMap(result, (tuple) => map(curr, (a) => [...tuple, a]))
  }
  return result as any
}

/** @internal */
export const all: <
  const Arg extends Iterable<Prompt.Prompt<any>>
>(arg: Arg) => Prompt.All.Return<Arg> = function() {
  if (arguments.length === 1) {
    if (isPrompt(arguments[0])) {
      return map(arguments[0], (x) => [x]) as any
    } else {
      return allTupled(arguments[0]) as any
    }
  }
  return allTupled(arguments[0]) as any
}

/** @internal */
export const custom = <State, Output>(
  initialState: State,
  render: (
    prevState: Option.Option<State>,
    nextState: State,
    action: Prompt.Prompt.Action<State, Output>
  ) => Effect.Effect<Terminal.Terminal, never, string>,
  process: (
    input: Terminal.UserInput,
    state: State
  ) => Effect.Effect<Terminal.Terminal, never, Prompt.Prompt.Action<State, Output>>
): Prompt.Prompt<Output> => {
  const op = Object.create(proto)
  op._tag = "Loop"
  op.initialState = initialState
  op.render = render
  op.process = process
  return op
}

/** @internal */
export const map = dual<
  <Output, Output2>(
    f: (output: Output) => Output2
  ) => (
    self: Prompt.Prompt<Output>
  ) => Prompt.Prompt<Output2>,
  <Output, Output2>(
    self: Prompt.Prompt<Output>,
    f: (output: Output) => Output2
  ) => Prompt.Prompt<Output2>
>(2, (self, f) => flatMap(self, (a) => succeed(f(a))))

/** @internal */
export const flatMap = dual<
  <Output, Output2>(
    f: (output: Output) => Prompt.Prompt<Output2>
  ) => (
    self: Prompt.Prompt<Output>
  ) => Prompt.Prompt<Output2>,
  <Output, Output2>(
    self: Prompt.Prompt<Output>,
    f: (output: Output) => Prompt.Prompt<Output2>
  ) => Prompt.Prompt<Output2>
>(2, (self, f) => {
  const op = Object.create(proto)
  op._tag = "OnSuccess"
  op.prompt = self
  op.onSuccess = f
  return op
})

/** @internal */
export const run = <Output>(
  self: Prompt.Prompt<Output>
): Effect.Effect<Terminal.Terminal, Terminal.QuitException, Output> =>
  Effect.flatMap(Terminal.Terminal, (terminal) => {
    const op = self as Primitive
    switch (op._tag) {
      case "Loop": {
        return Effect.all([
          Ref.make(Option.none<unknown>()),
          Ref.make(op.initialState)
        ]).pipe(
          Effect.flatMap(([prevStateRef, nextStateRef]) => {
            const loop = (
              action: Exclude<PromptAction.PromptAction<unknown, unknown>, { _tag: "Submit" }>
            ): Effect.Effect<never, Terminal.QuitException, any> =>
              Effect.all([Ref.get(prevStateRef), Ref.get(nextStateRef)]).pipe(
                Effect.flatMap(([prevState, nextState]) =>
                  op.render(prevState, nextState, action).pipe(
                    Effect.flatMap((msg) => Effect.orDie(terminal.display(msg))),
                    Effect.zipRight(terminal.readInput),
                    Effect.flatMap((input) => op.process(input, nextState)),
                    Effect.flatMap((action) => {
                      switch (action._tag) {
                        case "Beep": {
                          return loop(action)
                        }
                        case "NextFrame": {
                          return Ref.set(prevStateRef, Option.some(nextState)).pipe(
                            Effect.zipRight(Ref.set(nextStateRef, action.state)),
                            Effect.zipRight(loop(action))
                          )
                        }
                        case "Submit": {
                          return op.render(prevState, nextState, action).pipe(
                            Effect.flatMap((msg) => Effect.orDie(terminal.display(msg))),
                            Effect.zipRight(Effect.succeed(action.value))
                          )
                        }
                      }
                    })
                  )
                )
              )
            return loop({ _tag: "NextFrame", state: op.initialState })
          }),
          // Always make sure to restore the display of the cursor
          Effect.ensuring(Effect.orDie(
            terminal.display(Doc.render(Doc.cursorShow, { style: "pretty" }))
          ))
        )
      }
      case "OnSuccess": {
        return Effect.flatMap(run(op.prompt), (a) => run(op.onSuccess(a))) as any
      }
      case "Succeed": {
        return Effect.succeed(op.value)
      }
    }
  })

/** @internal */
export const succeed = <A>(value: A): Prompt.Prompt<A> => {
  const op = Object.create(proto)
  op._tag = "Succeed"
  op.value = value
  return op
}
