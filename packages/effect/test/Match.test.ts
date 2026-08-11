import { describe, it } from "@effect/vitest"
import { Match, pipe } from "effect"
import { strictEqual } from "./utils/assert.ts"

describe("Match", () => {
  it("tag matches an exact _tag and falls through for null", () => {
    const match = pipe(
      Match.type<{ _tag: "A" } | null>(),
      Match.tag("A", () => "hit"),
      Match.orElse(() => "miss")
    )

    strictEqual(match({ _tag: "A" }), "hit")
    strictEqual(match(null), "miss")
  })

  it("tagStartsWith matches a _tag prefix and falls through otherwise", () => {
    const match = pipe(
      Match.type<{ _tag: "A.one" } | null>(),
      Match.tagStartsWith("A", () => "hit"),
      Match.orElse(() => "miss")
    )

    strictEqual(match({ _tag: "A.one" }), "hit")
    strictEqual(match(null), "miss")
  })

  it("checks symbol-keyed object pattern properties", () => {
    const key = Symbol("key")
    const match = pipe(
      Match.type<{ readonly [key]: "expected" | "other" }>(),
      Match.when({ [key]: "expected" }, () => "hit"),
      Match.orElse(() => "miss")
    )

    strictEqual(match({ [key]: "expected" }), "hit")
    strictEqual(match({ [key]: "other" }), "miss")
    strictEqual(match({} as any), "miss")
  })
})
