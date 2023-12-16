/**
 * @since 1.0.0
 */

import * as _ from "effect/Secret"
import { describe, expect, it } from "vitest"

describe("Secret", () => {
  it("map", () => {
    const secret = _.fromString("hello")
    const newSecret = _.map(secret, (s) => `${s} world`)
    expect(_.value(newSecret)).toBe("hello world")
  })
})
