import { Match, Option, pipe, type Result } from "effect"
import { describe, expect, it } from "tstyche"

type Closed = { readonly _tag: "Closed" }

declare const stringOrNumber: string | number

describe("Match", () => {
  it("value matchers resolve terminals for generic inputs", () => {
    // https://github.com/Effect-TS/effect/issues/7315
    const orElse = <Open extends { readonly _tag: "Open" }>(
      state: Closed | Open,
      describeOpen: (open: Open) => string
    ): string =>
      Match.value(state).pipe(
        Match.tag("Closed", () => "closed"),
        Match.orElse((open) => describeOpen(open))
      )
    expect(orElse({ _tag: "Closed" }, () => "open")).type.toBe<string>()

    const option = <Open extends { readonly _tag: "Open" }>(
      state: Closed | Open
    ): Option.Option<Open> =>
      Match.value(state).pipe(
        Match.tag("Closed", () => Option.none()),
        Match.orElse((open) => Option.some(open))
      )
    expect(option<{ readonly _tag: "Open" }>({ _tag: "Closed" })).type.toBe<Option.Option<{ readonly _tag: "Open" }>>()

    const terminalOption = <Open extends { readonly _tag: "Open" }>(
      state: Closed | Open
    ): Option.Option<string> =>
      Match.value(state).pipe(
        Match.tag("Closed", () => "closed"),
        Match.option
      )
    expect(terminalOption({ _tag: "Closed" })).type.toBe<Option.Option<string>>()

    const terminalResult = <Open extends { readonly _tag: "Open" }>(
      state: Closed | Open
    ): Result.Result<string, Open> =>
      Match.value(state).pipe(
        Match.tag("Closed", () => "closed"),
        Match.result
      )
    expect(terminalResult<{ readonly _tag: "Open" }>({ _tag: "Closed" })).type.toBe<
      Result.Result<string, { readonly _tag: "Open" }>
    >()

    const freePipe = <Open extends { readonly _tag: "Open" }>(
      state: Closed | Open
    ): string =>
      pipe(
        Match.value(state),
        Match.tag("Closed", () => "closed"),
        Match.orElse(() => "open")
      )
    expect(freePipe({ _tag: "Closed" })).type.toBe<string>()
  })

  it("value matchers return values for non-generic inputs", () => {
    expect(
      Match.value(stringOrNumber).pipe(
        Match.when(Match.number, (n) => n),
        Match.when(Match.string, (s) => s),
        Match.exhaustive
      )
    ).type.toBe<string | number>()

    expect(
      Match.value(stringOrNumber).pipe(
        Match.when(Match.number, (n) => n),
        Match.option
      )
    ).type.toBe<Option.Option<number>>()

    expect(
      Match.value(stringOrNumber).pipe(
        Match.when(Match.number, (n) => n),
        Match.result
      )
    ).type.toBe<Result.Result<number, string>>()

    expect(
      Match.value(stringOrNumber).pipe(
        Match.when(Match.number, (n) => n),
        Match.orElse((s) => s)
      )
    ).type.toBe<string | number>()
  })

  it("type matchers still return functions", () => {
    expect(
      Match.type<string | number>().pipe(
        Match.when(Match.number, (n) => n),
        Match.when(Match.string, (s) => s),
        Match.exhaustive
      )
    ).type.toBe<(u: string | number) => string | number>()

    expect(
      Match.type<string | number>().pipe(
        Match.when(Match.number, (n) => n),
        Match.option
      )
    ).type.toBe<(u: string | number) => Option.Option<number>>()
  })

  it("exhaustiveness checking is preserved", () => {
    const incomplete = Match.value(stringOrNumber).pipe(
      Match.when(Match.number, (n) => n)
    )
    const complete = Match.value(stringOrNumber).pipe(
      Match.when(Match.number, (n) => n),
      Match.when(Match.string, (s) => s)
    )
    // @ts-expect-error Argument of type
    Match.exhaustive(incomplete)
    expect(Match.exhaustive(complete)).type.toBe<string | number>()
  })
})
