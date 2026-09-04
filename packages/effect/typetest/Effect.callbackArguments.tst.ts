import { type Cause, Context, Effect } from "effect"
import { describe, expect, it } from "tstyche"

class Input extends Context.Service<Input, string>()("callbackArguments/Input") {}
class Output extends Context.Service<Output, string>()("callbackArguments/Output") {}
declare const self: Effect.Effect<string, "source-error", Input>
declare const handled: Effect.Effect<string, "handler-error", Output>
const render = (text: string, uppercase = false) => Effect.succeed(uppercase ? text.toUpperCase() : text)
const rest = (text: string, ...options: Array<boolean>) => Effect.succeed(options[0] ? text.toUpperCase() : text)
const optional = (text: string, uppercase?: boolean) => render(text, uppercase)
const recover = (_cause: Cause.Cause<"source-error">, uppercase = false) => render("hello", uppercase)
const recoverRest = (_cause: Cause.Cause<"source-error">, ...options: Array<boolean>) => rest("hello", ...options)

describe("public callback assignability compatibility", () => {
  it("default and rest callbacks are unary-compatible", () => {
    expect(render).type.toBeAssignableTo<(text: string) => Effect.Effect<string>>()
    expect(rest).type.toBeAssignableTo<(text: string) => Effect.Effect<string>>()
    expect(optional).type.toBeAssignableTo<(text: string) => Effect.Effect<string>>()
    expect(recover).type.toBeAssignableTo<(cause: Cause.Cause<"source-error">) => Effect.Effect<string>>()
    expect(recoverRest).type.toBeAssignableTo<(cause: Cause.Cause<"source-error">) => Effect.Effect<string>>()
  })
  it("direct and pipe ordinary and eager calls preserve channels", () => {
    expect(Effect.flatMap(self, render)).type.toBe<Effect.Effect<string, "source-error", Input>>()
    expect(self.pipe(Effect.flatMap(rest))).type.toBe<Effect.Effect<string, "source-error", Input>>()
    expect(Effect.flatMapEager(self, render)).type.toBe<Effect.Effect<string, "source-error", Input>>()
    expect(self.pipe(Effect.flatMapEager(rest))).type.toBe<Effect.Effect<string, "source-error", Input>>()
    expect(Effect.andThen(self, optional)).type.toBe<Effect.Effect<string, "source-error", Input>>()
    expect(Effect.catchCause(self, recover)).type.toBe<Effect.Effect<string, never, Input>>()
    expect(self.pipe(Effect.catchCause<"source-error", string, never, never>(recoverRest))).type.toBe<
      Effect.Effect<string, never, Input>
    >()
    expect(Effect.matchCauseEffect(self, { onSuccess: render, onFailure: recoverRest })).type.toBe<
      Effect.Effect<string, never, Input>
    >()
    expect(self.pipe(Effect.matchCauseEffect({ onSuccess: rest, onFailure: recover }))).type.toBe<
      Effect.Effect<string, never, Input>
    >()
    expect(Effect.matchCauseEffectEager(self, { onSuccess: render, onFailure: recoverRest })).type.toBe<
      Effect.Effect<string, never, Input>
    >()
    expect(self.pipe(Effect.matchCauseEffectEager({ onSuccess: rest, onFailure: recover }))).type.toBe<
      Effect.Effect<string, never, Input>
    >()
    expect(Effect.matchEffect(self, { onSuccess: render, onFailure: rest })).type.toBe<
      Effect.Effect<string, never, Input>
    >()
  })
  it("selected handler errors and services remain in the output", () => {
    const success = (_text: string, _uppercase = false) => handled
    const failure = (_cause: Cause.Cause<"source-error">, ..._options: Array<boolean>) => handled
    expect(Effect.flatMap(self, success)).type.toBe<
      Effect.Effect<string, "source-error" | "handler-error", Input | Output>
    >()
    expect(Effect.catchCause(self, failure)).type.toBe<Effect.Effect<string, "handler-error", Input | Output>>()
    expect(Effect.matchCauseEffect(self, { onSuccess: success, onFailure: failure })).type.toBe<
      Effect.Effect<string, "handler-error", Input | Output>
    >()
    expect(Effect.matchCauseEffectEager(self, { onSuccess: success, onFailure: failure })).type.toBe<
      Effect.Effect<string, "handler-error", Input | Output>
    >()
  })
})
