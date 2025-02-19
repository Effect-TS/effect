import type { Chunk } from "effect"
import { Predicate, Sink } from "effect"
import { describe, expect, it } from "tstyche"

declare const predicate: Predicate.Predicate<number | string>

describe("Sink", () => {
  it("collectAllWhile", () => {
    expect(Sink.collectAllWhile(predicate))
      .type.toBe<Sink.Sink<Chunk.Chunk<string | number>, string | number, string | number, never, never>>()
    expect(Sink.collectAllWhile(Predicate.isNumber))
      .type.toBe<Sink.Sink<Chunk.Chunk<number>, unknown, unknown, never, never>>()
    expect(Sink.collectAllWhile(Predicate.isString))
      .type.toBe<Sink.Sink<Chunk.Chunk<string>, unknown, unknown, never, never>>()
  })
})
