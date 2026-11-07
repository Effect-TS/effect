/**
 * A program that uses no operation and no record service: two ordinary
 * `Context.Service` keys, provided and read as they are today. It measures
 * what `Context.ts` costs a program that never touches the new exports.
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"

export const Greeting = Context.Service<string>("plain/Greeting")
export const Name = Context.Service<string>("plain/Name")

export const greet = Effect.gen(function*() {
  const greeting = yield* Greeting
  const name = yield* Name
  return `${greeting}, ${name}`
})
