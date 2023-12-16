/**
 * @since 1.0.0
 */

import { pipe } from "effect"
import * as _ from "effect/Secret"
import { describe, expect, it } from "vitest"

describe("Secret", () => {
  it("map", () => {
    const secret = _.fromString("hello")
    const newSecret1 = _.map(secret, (s) => `${s} world`)
    const newSecret2 = pipe(secret, _.map((s) => `${s} world`))

    expect(_.value(newSecret1)).toBe("hello world")
    expect(_.value(newSecret2)).toBe("hello world")
  })
})
