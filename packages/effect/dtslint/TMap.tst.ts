import type { STM } from "effect"
import { pipe, TMap } from "effect"
import { describe, expect, it } from "tstyche"

declare const string$number: TMap.TMap<string, number>

describe("TMap", () => {
  it("removeIf", () => {
    expect(TMap.removeIf(string$number, (key) => key === "aa"))
      .type.toBe<STM.STM<Array<[string, number]>>>()
    expect(pipe(string$number, TMap.removeIf((key) => key === "aa")))
      .type.toBe<STM.STM<Array<[string, number]>>>()

    expect(TMap.removeIf(string$number, (key) => key === "aa", { discard: false }))
      .type.toBe<STM.STM<Array<[string, number]>>>()
    expect(pipe(string$number, TMap.removeIf((key) => key === "aa", { discard: false })))
      .type.toBe<STM.STM<Array<[string, number]>>>()

    expect(TMap.removeIf(string$number, (key) => key === "aa", { discard: true }))
      .type.toBe<STM.STM<void>>()
    expect(pipe(string$number, TMap.removeIf((key) => key === "aa", { discard: true })))
      .type.toBe<STM.STM<void>>()
  })

  it("retainIf", () => {
    expect(TMap.retainIf(string$number, (key) => key === "aa"))
      .type.toBe<STM.STM<Array<[string, number]>>>()

    expect(TMap.retainIf(string$number, (key) => key === "aa", { discard: false }))
      .type.toBe<STM.STM<Array<[string, number]>>>()

    expect(pipe(string$number, TMap.retainIf((key) => key === "aa")))
      .type.toBe<STM.STM<Array<[string, number]>>>()

    expect(pipe(string$number, TMap.retainIf((key) => key === "aa", { discard: false })))
      .type.toBe<STM.STM<Array<[string, number]>>>()

    expect(TMap.retainIf(string$number, (key) => key === "aa", { discard: true }))
      .type.toBe<STM.STM<void>>()

    expect(pipe(string$number, TMap.retainIf((key) => key === "aa", { discard: true })))
      .type.toBe<STM.STM<void>>()
  })
})
