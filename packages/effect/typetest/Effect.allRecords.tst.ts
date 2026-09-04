import { Context, Effect, type Result } from "effect"
import { describe, expect, it } from "tstyche"

class Left extends Context.Service<Left, { readonly n: number }>()("Left") {}
class Right extends Context.Service<Right, { readonly s: string }>()("Right") {}
type L = Effect.Effect<number, "left", Left>
type R = Effect.Effect<string, "right", Right>
type Choice = { left: L } | { right: R }
type Output = { left: number } | { right: string }
type Wrapped = { left: Result.Result<number, "left"> } | { right: Result.Result<string, "right"> }
type Common = { common: Effect.Effect<boolean>; left: L } | { common: Effect.Effect<boolean>; right: R }
const collect = (choice: Choice) => Effect.all(choice)
const result = (choice: Choice) => Effect.all(choice, { mode: "result" })
const discard = (choice: Choice) => Effect.all(choice, { discard: true })
const resultDiscard = (choice: Choice) => Effect.all(choice, { discard: true, mode: "result" })

describe("all union record channels", () => {
  it("disjoint default is one Effect", () => {
    expect<ReturnType<typeof collect>>().type.toBe<Effect.Effect<Output, "left" | "right", Left | Right>>()
  })
  it("disjoint result preserves requirements", () => {
    expect<ReturnType<typeof result>>().type.toBe<Effect.Effect<Wrapped, never, Left | Right>>()
  })
  it("disjoint discard preserves channels", () => {
    expect<ReturnType<typeof discard>>().type.toBe<Effect.Effect<void, "left" | "right", Left | Right>>()
  })
  it("disjoint result discard preserves requirements", () => {
    expect<ReturnType<typeof resultDiscard>>().type.toBe<Effect.Effect<void, never, Left | Right>>()
  })
  it("nonshared keys with common infallible key", () => {
    const run = (choice: Common) => Effect.all(choice)
    expect<ReturnType<typeof run>>().type.toBe<
      Effect.Effect<
        { common: boolean; left: number } | { common: boolean; right: string },
        "left" | "right",
        Left | Right
      >
    >()
  })
  it("generator propagation", () => {
    const run = (choice: Choice) =>
      Effect.gen(function*() {
        return yield* collect(choice)
      })
    expect<ReturnType<typeof run>>().type.toBe<Effect.Effect<Output, "left" | "right", Left | Right>>()
  })
  it("pipe ergonomic propagation", () => {
    const run = (choice: Choice) => collect(choice).pipe(Effect.map(() => 1), Effect.mapError((e) => e))
    expect<ReturnType<typeof run>>().type.toBe<Effect.Effect<number, "left" | "right", Left | Right>>()
  })
  it("missing requirements rejected", () => {
    expect<ReturnType<typeof collect>>().type.not.toBeAssignableTo<Effect.Effect<Output, "left" | "right">>()
  })
  it("missing errors rejected", () => {
    expect<ReturnType<typeof collect>>().type.not.toBeAssignableTo<Effect.Effect<Output, never, Left | Right>>()
  })
  it("partial provision still requires Right", () => {
    const run = (choice: Choice) => collect(choice).pipe(Effect.provideService(Left, { n: 1 }))
    expect<ReturnType<typeof run>>().type.toBe<Effect.Effect<Output, "left" | "right", Right>>()
  })
  it("fully provided remains runnable", () => {
    const run = (choice: Choice) =>
      collect(choice).pipe(Effect.provideService(Left, { n: 1 }), Effect.provideService(Right, { s: "r" }))
    expect<ReturnType<typeof run>>().type.toBeAssignableTo<Effect.Effect<Output, "left" | "right">>()
  })
  it("public ReturnObject utility", () => {
    expect<Effect.All.ReturnObject<Choice, false>>().type.toBe<Effect.Effect<Output, "left" | "right", Left | Right>>()
  })
  it("public Return utility", () => {
    expect<Effect.All.Return<Choice, {}>>().type.toBe<Effect.Effect<Output, "left" | "right", Left | Right>>()
  })
  it("generic wrapper and explicit arguments", () => {
    const wrapper = <T extends Choice>(input: T): Effect.All.Return<T, {}> => Effect.all<T, {}>(input)
    expect(wrapper<Choice>).type.toBe<(input: Choice) => Effect.Effect<Output, "left" | "right", Left | Right>>()
  })
  it("shared-key union control", () => {
    const run = (choice: { value: L } | { value: R }) => Effect.all(choice)
    expect<ReturnType<typeof run>>().type.toBe<
      Effect.Effect<{ value: number } | { value: string }, "left" | "right", Left | Right>
    >()
  })
  it("literal struct control", () => {
    const run = (left: L, right: R) => Effect.all({ left, right })
    expect<ReturnType<typeof run>>().type.toBe<
      Effect.Effect<{ left: number; right: string }, "left" | "right", Left | Right>
    >()
  })
  it("record index control", () => {
    const run = (record: Record<string, L | R>) => Effect.all(record)
    expect<ReturnType<typeof run>>().type.toBe<
      Effect.Effect<Record<string, number | string>, "left" | "right", Left | Right>
    >()
  })
  it("literal result control", () => {
    const run = (left: L, right: R) => Effect.all({ left, right }, { mode: "result" })
    expect<ReturnType<typeof run>>().type.toBe<
      Effect.Effect<{ left: Result.Result<number, "left">; right: Result.Result<string, "right"> }, never, Left | Right>
    >()
  })
  it("empty control", () => {
    expect(Effect.all({})).type.toBe<Effect.Effect<{}>>()
  })
})
