import * as Terminal from "@effect/platform/Terminal"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import { dual } from "effect/Function"
import * as Pipeable from "effect/Pipeable"
import * as Ref from "effect/Ref"
import type * as Prompt from "../Prompt.js"
import { Action } from "./prompt/action.js"

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
    return run(this as any)
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
    readonly initialState: unknown | Effect.Effect<unknown, never, Prompt.Prompt.Environment>
    readonly render: Prompt.Prompt.Handlers<unknown, unknown>["render"]
    readonly process: Prompt.Prompt.Handlers<unknown, unknown>["process"]
    readonly clear: Prompt.Prompt.Handlers<unknown, unknown>["clear"]
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
  const Arg extends Iterable<Prompt.Prompt<any>> | Record<string, Prompt.Prompt<any>>
>(arg: Arg) => Prompt.All.Return<Arg> = function() {
  if (arguments.length === 1) {
    if (isPrompt(arguments[0])) {
      return map(arguments[0], (x) => [x]) as any
    } else if (Array.isArray(arguments[0])) {
      return allTupled(arguments[0]) as any
    } else {
      const entries = Object.entries(arguments[0] as Readonly<{ [K: string]: Prompt.Prompt<any> }>)
      let result = map(entries[0][1], (value) => ({ [entries[0][0]]: value }))
      if (entries.length === 1) {
        return result as any
      }
      const rest = entries.slice(1)
      for (const [key, prompt] of rest) {
        result = result.pipe(
          flatMap((record) =>
            prompt.pipe(map((value) => ({
              ...record,
              [key]: value
            })))
          )
        )
      }
      return result as any
    }
  }
  return allTupled(arguments[0]) as any
}

/** @internal */
export const custom = <State, Output>(
  initialState: State | Effect.Effect<State, never, Prompt.Prompt.Environment>,
  handlers: Prompt.Prompt.Handlers<State, Output>
): Prompt.Prompt<Output> => {
  const op = Object.create(proto)
  op._tag = "Loop"
  op.initialState = initialState
  op.render = handlers.render
  op.process = handlers.process
  op.clear = handlers.clear
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
): Effect.Effect<Output, Terminal.QuitException, Prompt.Prompt.Environment> =>
  Effect.flatMap(Terminal.Terminal, (terminal) => {
    const op = self as Primitive
    switch (op._tag) {
      case "Loop": {
        const makeStateRef = Effect.isEffect(op.initialState)
          ? op.initialState.pipe(Effect.flatMap(Ref.make))
          : Ref.make(op.initialState)
        return makeStateRef.pipe(
          Effect.flatMap((ref) => {
            const loop = (
              action: Exclude<Prompt.Prompt.Action<unknown, unknown>, { _tag: "Submit" }>
            ): Effect.Effect<any, Terminal.QuitException, Prompt.Prompt.Environment> =>
              Ref.get(ref).pipe(
                Effect.flatMap((state) =>
                  op.render(state, action).pipe(
                    Effect.flatMap((msg) => Effect.orDie(terminal.display(msg))),
                    Effect.zipRight(terminal.readInput),
                    Effect.flatMap((input) => op.process(input, state)),
                    Effect.flatMap((action) => {
                      switch (action._tag) {
                        case "Beep": {
                          return loop(action)
                        }
                        case "NextFrame": {
                          return op.clear(state, action).pipe(
                            Effect.flatMap((clear) => Effect.orDie(terminal.display(clear))),
                            Effect.zipRight(Ref.set(ref, action.state)),
                            Effect.zipRight(loop(action))
                          )
                        }
                        case "Submit": {
                          return op.clear(state, action).pipe(
                            Effect.flatMap((clear) => Effect.orDie(terminal.display(clear))),
                            Effect.zipRight(op.render(state, action)),
                            Effect.flatMap((msg) => Effect.orDie(terminal.display(msg))),
                            Effect.zipRight(Effect.succeed(action.value))
                          )
                        }
                      }
                    })
                  )
                )
              )
            return Ref.get(ref).pipe(
              Effect.flatMap((state) => loop(Action.NextFrame({ state })))
            )
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
