import { identity } from "@fp-ts/data/Function"

describe.concurrent("Flatten", () => {
  it("isFlattened", () => {
    assert.isTrue(Flatten.Flattened(1).isFlattened())
    assert.isFalse(Flatten.NeverFlat.isFlattened())
  })

  it("isAlreadyFlat", () => {
    assert.isTrue(Flatten.AlreadyFlat.isAlreadyFlat())
    assert.isFalse(Flatten.NeverFlat.isAlreadyFlat())
  })

  it("isNeverFlat", () => {
    assert.isTrue(Flatten.NeverFlat.isNeverFlat())
    assert.isFalse(Flatten.AlreadyFlat.isNeverFlat())
  })

  it("map", () => {
    assert.deepStrictEqual(Flatten.Flattened(1).map((n) => n + 1), Flatten.Flattened(2))
    assert.deepStrictEqual(Flatten.AlreadyFlat.map(identity), Flatten.AlreadyFlat)
    assert.deepStrictEqual(Flatten.NeverFlat.map(identity), Flatten.NeverFlat)
  })
})
