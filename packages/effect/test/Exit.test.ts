import { assert, describe, it } from "@effect/vitest"
import { Equal, Exit, Hash } from "effect"

describe("Exit", () => {
  it("uses generic structural equality without implementing Equal or Hash", () => {
    const left = Exit.succeed({ value: 1 })
    const right = Exit.succeed({ value: 1 })

    assert.isFalse(Equal.isEqual(left))
    assert.isFalse(Hash.isHash(left))
    assert.isTrue(Equal.equals(left, right))
    assert.strictEqual(Hash.hash(left), Hash.hash(right))
  })

  it("toString", () => {
    assert.strictEqual(Exit.succeed(1).toString(), "Success(1)")
    assert.strictEqual(Exit.fail("error").toString(), `Failure(Cause([Fail("error")]))`)
    assert.strictEqual(Exit.die("error").toString(), `Failure(Cause([Die("error")]))`)
    assert.strictEqual(Exit.interrupt(1).toString(), `Failure(Cause([Interrupt(1)]))`)
    assert.strictEqual(Exit.interrupt(undefined).toString(), `Failure(Cause([Interrupt(undefined)]))`)
  })
})
