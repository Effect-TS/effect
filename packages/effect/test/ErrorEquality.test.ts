import * as Data from "effect/Data"
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"

const locationKeys = ["line", "column", "sourceURL", "originalLine", "originalColumn"] as const

// Deterministic on Node as well as JavaScriptCore, independent of Vitest's stack hook.
const withLocation = (value: string, enumerable = false) => {
  const error = new Error("same message")
  for (const key of locationKeys) {
    Object.defineProperty(error, key, { value, enumerable, configurable: true })
  }
  return error
}

describe("Error location metadata", { concurrent: false }, () => {
  it("ignores non-enumerable runtime locations in equality and hashing", () => {
    const first = withLocation("first")
    const second = withLocation("second")
    expect(Equal.equals(first, second)).toBe(true)
    expect(Hash.hash(first)).toBe(Hash.hash(second))
  })

  it("keeps enumerable location-named payload fields", () => {
    expect(Equal.equals(withLocation("first", true), withLocation("second", true))).toBe(false)
  })

  it("keeps Data.Error fields even when they are non-enumerable", () => {
    class Located extends Data.Error<{ readonly line: number }> {}
    const first = new Located({ line: 1 })
    const second = new Located({ line: 2 })
    Reflect.defineProperty(first, "line", { enumerable: false })
    Reflect.defineProperty(second, "line", { enumerable: false })
    expect(Equal.equals(first, second)).toBe(false)
  })

  it("keeps Schema.TaggedError payload equality", () => {
    class Located extends Schema.TaggedError<Located>()("Located", {
      line: Schema.Number,
      column: Schema.Number
    }) {}
    const first = Located.make({ line: 1, column: 2 })
    const same = Located.make({ line: 1, column: 2 })
    expect(Equal.equals(first, same)).toBe(true)
    expect(Hash.hash(first)).toBe(Hash.hash(same))
    expect(Equal.equals(first, Located.make({ line: 3, column: 2 }))).toBe(false)
  })

  it("ignores actual construction sites without a stack trace hook", () => {
    const descriptor = Object.getOwnPropertyDescriptor(Error, "prepareStackTrace")
    try {
      Object.defineProperty(Error, "prepareStackTrace", { value: undefined, configurable: true, writable: true })
      const first = new Error("same message")
      const second = new Error("same message")
      expect(Equal.equals(first, second)).toBe(true)
      expect(Hash.hash(first)).toBe(Hash.hash(second))
      expect(Equal.equals(first, new Error("different message"))).toBe(false)
    } finally {
      if (descriptor) Object.defineProperty(Error, "prepareStackTrace", descriptor)
      else Reflect.deleteProperty(Error, "prepareStackTrace")
    }
  })
})
