import { assert, describe, it } from "@effect/vitest"
import { pipe, Tuple } from "effect"

const input = (): readonly [number] => [42]
const transforms = (enabled: boolean): readonly [((n: number) => string) | undefined] => [
  enabled ? (n) => `#${n}` : undefined
]

describe("Tuple.evolve optional transform runtime controls", () => {
  it("data-first already returns the selected string or original number", () => {
    assert.deepStrictEqual(Tuple.evolve(input(), transforms(true)), ["#42"])
    assert.deepStrictEqual(Tuple.evolve(input(), transforms(false)), [42])
  })

  it("data-last already returns the selected string or original number", () => {
    assert.deepStrictEqual(pipe(input(), Tuple.evolve(transforms(true))), ["#42"])
    assert.deepStrictEqual(pipe(input(), Tuple.evolve(transforms(false))), [42])
  })

  it("preserves fixed, undefined, omitted, optional and empty positions", () => {
    const pair: readonly [number, boolean] = [42, true]
    assert.deepStrictEqual(Tuple.evolve(pair, [() => "formatted"]), ["formatted", true])
    assert.deepStrictEqual(Tuple.evolve(pair, [undefined]), [42, true])
    assert.deepStrictEqual(Tuple.evolve(pair, []), [42, true])
    const optional: readonly [number?] = []
    assert.deepStrictEqual(Tuple.evolve(optional, [(n) => `${n}`]), [])
    assert.deepStrictEqual(Tuple.evolve([], []), [])
  })
})
