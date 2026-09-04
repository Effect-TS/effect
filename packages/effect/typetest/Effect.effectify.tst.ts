/// <reference types="node" />
/** @effect-diagnostics floatingEffect:skip-file missingEffectError:skip-file */
import { Effect } from "effect"
import * as Fs from "node:fs"
import { describe, expect, it } from "tstyche"

type Callback = (error: Error | null, value?: string) => void
declare const one: (input: string, callback: Callback) => void
declare const zero: (callback: Callback) => void
declare const many: (input: string, count: number, callback: Callback) => void
declare const optional: (...args: [...inputs: [input?: string], callback: Callback]) => void
declare function overloaded(callback: Callback): void
declare function overloaded(input: string, callback: (error: TypeError | null, value?: number) => void): void

describe("effectify mapper caller inputs", () => {
  it("single onError receives the exact input tuple", () => {
    const adapted = Effect.effectify(one, (error, args) => {
      expect(args).type.toBe<[input: string]>()
      const inputs: [input: string] = args
      expect(error).type.toBe<Error>()
      return inputs[0] + error.message
    })
    expect(adapted("hello")).type.toBe<Effect.Effect<string, string>>()
  })

  it("both mappers receive multiple caller inputs", () => {
    const adapted = Effect.effectify(many, (error, args) => {
      expect(args).type.toBe<[input: string, count: number]>()
      const inputs: [input: string, count: number] = args
      expect(error).type.toBe<Error>()
      return inputs[0] + error.message
    }, (error, args) => {
      expect(args).type.toBe<[input: string, count: number]>()
      const inputs: [input: string, count: number] = args
      expect(error).type.toBe<unknown>()
      return inputs[1]
    })
    expect(adapted("hello", 2)).type.toBe<Effect.Effect<string, string | number>>()
  })

  it("zero inputs excludes the callback", () => {
    Effect.effectify(zero, (_error, args) => {
      expect(args).type.toBe<[]>()
      const inputs: [] = args
      return inputs.length
    }, (_error, args) => {
      expect(args).type.toBe<[]>()
      return args.length
    })
  })

  it("optional input before required callback retains undefined", () => {
    const adapted = Effect.effectify(optional, (_error, args) => {
      expect(args).type.toBe<[input: string | undefined]>()
      return args[0]
    })
    expect(adapted(undefined)).type.toBe<Effect.Effect<string, string | undefined>>()
  })

  it("control indexed input and extraction stay precise", () => {
    const adapted = Effect.effectify(one, (error, args) => {
      const inputs: [input: string] = [args[0]]
      return inputs[0] + error.message
    })
    expect(adapted("hello")).type.toBe<Effect.Effect<string, string>>()
    expect(Effect.effectify(one)("hello")).type.toBe<Effect.Effect<string, Error>>()
    expect(Effect.effectify(zero)()).type.toBe<Effect.Effect<string, Error>>()
  })

  it("control broad generic wrappers can consume arrays", () => {
    function wrap<F extends (...args: Array<any>) => any>(fn: F) {
      return Effect.effectify(fn, (error, args) => {
        const inputs: ReadonlyArray<unknown> = args
        return String(error) + inputs.join(",")
      }, (_error, args: Array<any>) => args.length)
    }
    expect(wrap(one)("hello")).type.toBe<Effect.Effect<string, string | number>>()
    function wrapInputs<Args extends Array<unknown>>(fn: (...args: [...Args, Callback]) => void) {
      return Effect.effectify(fn, (_error, args) => args.join(","))
    }
    expect(wrapInputs(many)("hello", 2)).type.toBe<Effect.Effect<string, string>>()
  })

  it("control adapted overloads retain their arguments and success types", () => {
    const adapted = Effect.effectify(overloaded, () => "mapped")
    expect(adapted()).type.toBe<Effect.Effect<string, string>>()
    expect(adapted("hello")).type.toBe<Effect.Effect<number, string>>()
    // @ts-expect-error Argument of type 'number'
    adapted(1)
    expect(Effect.effectify(overloaded)()).type.toBe<Effect.Effect<string, Error | TypeError>>()
    expect(Effect.effectify(overloaded)("hello")).type.toBe<Effect.Effect<number, Error | TypeError>>()
  })

  it("control existing Node callback overloads remain callable", () => {
    const access = Effect.effectify(Fs.access, () => "callback", () => 1)
    expect(access("path")).type.toBe<Effect.Effect<void, string | number>>()
    expect(access("path", Fs.constants.F_OK)).type.toBe<Effect.Effect<void, string | number>>()
    const readFile = Effect.effectify(Fs.readFile, () => "callback")
    expect(readFile("path", "utf8")).type.toBe<Effect.Effect<string, string>>()
    expect(readFile("path")).type.toBe<Effect.Effect<Buffer<ArrayBuffer>, string>>()
    const copyFile = Effect.effectify(Fs.copyFile)
    expect(copyFile("a", "b")).type.toBe<Effect.Effect<void, NodeJS.ErrnoException>>()
    expect(copyFile("a", "b", 0)).type.toBe<Effect.Effect<void, NodeJS.ErrnoException>>()
  })
})
