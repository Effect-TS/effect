import type { STM } from "effect"
import { pipe, TSet } from "effect"
import { describe, expect, it } from "tstyche"

declare const string: TSet.TSet<string>

describe("TSet", () => {
  it("removeIf", () => {
    expect(TSet.removeIf(string, (key) => key === "aa"))
      .type.toBe<STM.STM<Array<string>>>()
    expect(pipe(string, TSet.removeIf((key) => key === "aa")))
      .type.toBe<STM.STM<Array<string>>>()

    expect(TSet.removeIf(string, (key) => key === "aa", { discard: false }))
      .type.toBe<STM.STM<Array<string>>>()
    expect(pipe(string, TSet.removeIf((key) => key === "aa", { discard: false })))
      .type.toBe<STM.STM<Array<string>>>()

    expect(TSet.removeIf(string, (key) => key === "aa", { discard: true }))
      .type.toBe<STM.STM<void>>()
    expect(pipe(string, TSet.removeIf((key) => key === "aa", { discard: true })))
      .type.toBe<STM.STM<void>>()
  })

  it("retainIf", () => {
    expect(TSet.retainIf(string, (key) => key === "aa"))
      .type.toBe<STM.STM<Array<string>>>()
    expect(pipe(string, TSet.retainIf((key) => key === "aa")))
      .type.toBe<STM.STM<Array<string>>>()

    expect(TSet.retainIf(string, (key) => key === "aa", { discard: false }))
      .type.toBe<STM.STM<Array<string>>>()
    expect(pipe(string, TSet.retainIf((key) => key === "aa", { discard: false })))
      .type.toBe<STM.STM<Array<string>>>()

    expect(TSet.retainIf(string, (key) => key === "aa", { discard: true }))
      .type.toBe<STM.STM<void>>()
    expect(pipe(string, TSet.retainIf((key) => key === "aa", { discard: true })))
      .type.toBe<STM.STM<void>>()
  })
})
