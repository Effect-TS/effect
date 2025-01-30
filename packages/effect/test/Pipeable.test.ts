import { Option } from "effect"
import { assertSome } from "effect/test/util"
import { describe, it } from "vitest"

describe("Pipeable", () => {
  it("pipeArguments", () => {
    const f = (n: number): number => n + 1
    const g = (n: number): number => n * 2
    assertSome(Option.some(2).pipe(Option.map(f)), 3)
    assertSome(Option.some(2).pipe(Option.map(f), Option.map(g)), 6)
    assertSome(Option.some(2).pipe(Option.map(f), Option.map(g), Option.map(f)), 7)
    assertSome(Option.some(2).pipe(Option.map(f), Option.map(g), Option.map(f), Option.map(g)), 14)
    assertSome(Option.some(2).pipe(Option.map(f), Option.map(g), Option.map(f), Option.map(g), Option.map(f)), 15)
    assertSome(
      Option.some(2).pipe(Option.map(f), Option.map(g), Option.map(f), Option.map(g), Option.map(f), Option.map(g)),
      30
    )
    assertSome(
      Option.some(2).pipe(
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g),
        Option.map(f)
      ),
      31
    )
    assertSome(
      Option.some(2).pipe(
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g)
      ),
      62
    )
    assertSome(
      Option.some(2).pipe(
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g),
        Option.map(f)
      ),
      63
    )
    assertSome(
      Option.some(2).pipe(
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g)
      ),
      126
    )
  })
})
