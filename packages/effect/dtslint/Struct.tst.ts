import { hole, pipe, Struct } from "effect"
import { describe, expect, it, when } from "tstyche"

const asym = Symbol.for("effect/dtslint/a")
const bsym = Symbol.for("effect/dtslint/b")
const csym = Symbol.for("effect/dtslint/c")
const dsym = Symbol.for("effect/dtslint/d")

declare const string$numberRecord: Record<string, number>
declare const symbol$numberRecord: Record<symbol, number>
declare const number$numberRecord: Record<number, number>
declare const templateLiteral$numberRecord: Record<`a${string}`, number>

const stringStruct = { a: "a", b: 1, c: true }
const symbolStruct = { [asym]: "a", [bsym]: 1, [csym]: true }
const numberStruct = { 1: "a", 2: 1, 3: true }
declare const optionalStringStruct: { a?: string; b: number; c: boolean }

describe("Struct", () => {
  describe("evolve", () => {
    it("evolves a single field", () => {
      expect(Struct.evolve({ a: 1 }, {
        a: (n) => {
          expect(n).type.toBe<number>()
          return n > 0
        }
      }))
        .type.toBe<{ a: boolean }>()
      expect(pipe(
        { a: 1 },
        Struct.evolve({
          a: (n) => {
            expect(n).type.toBe<number>()
            return n > 0
          }
        })
      ))
        .type.toBe<{ a: boolean }>()
    })

    it("evolves multiple fields", () => {
      expect(Struct.evolve({ a: "a", b: 1 }, {
        a: (s) => {
          expect(s).type.toBe<string>()
          return s.length
        }
      }))
        .type.toBe<{ a: number; b: number }>()
      expect(pipe(
        { a: "a", b: 1 },
        Struct.evolve({
          a: (s) => {
            expect(s).type.toBe<string>()
            return s.length
          }
        })
      ))
        .type.toBe<{ a: number; b: number }>()
    })

    it("errors", () => {
      expect(Struct.evolve).type.not.toBeCallableWith(
        { a: "a", b: 1 },
        { a: (n: number) => n }
      )
      expect(Struct.evolve).type.not.toBeCallableWith(
        hole<{ a: "a"; b: 1 }>(),
        hole<Record<string, string>>()
      )
      expect(Struct.evolve).type.not.toBeCallableWith(
        hole<{ a: "a"; b: 1 }>(),
        hole<Record<string, (s: string) => null>>()
      )
      when(pipe).isCalledWith(
        { a: "a", b: 1 },
        expect(Struct.evolve).type.not.toBeCallableWith({ a: (n: number) => n })
      )

      when(pipe).isCalledWith(
        hole<{ a: "a"; b: 1 }>(),
        expect(Struct.evolve).type.not.toBeCallableWith(hole<Record<string, string>>())
      )

      when(pipe).isCalledWith(
        hole<{ a: "a"; b: 1 }>(),
        expect(Struct.evolve).type.not.toBeCallableWith(hole<Record<string, (s: string) => null>>())
      )
    })
  })

  describe("get", () => {
    it("returns unknown when getting a key from an empty object", () => {
      expect(pipe({}, Struct.get("a")))
        .type.toBe<unknown>()
    })

    it("gets a required property", () => {
      expect(pipe(stringStruct, Struct.get("a")))
        .type.toBe<string>()
      expect(Struct.get("a")(stringStruct))
        .type.toBe<string>()

      expect(pipe(symbolStruct, Struct.get(asym)))
        .type.toBe<string>()
      expect(Struct.get(asym)(symbolStruct))
        .type.toBe<string>()

      expect(pipe(numberStruct, Struct.get(1)))
        .type.toBe<string>()
      expect(Struct.get(1)(numberStruct))
        .type.toBe<string>()
    })

    it("gets an optional property", () => {
      expect(pipe(optionalStringStruct, Struct.get("a")))
        .type.toBe<string | undefined>()
      expect(Struct.get("a")(optionalStringStruct))
        .type.toBe<string | undefined>()
    })

    it("record", () => {
      expect(pipe(string$numberRecord, Struct.get("a")))
        .type.toBe<number | undefined>()
      expect(Struct.get("a")(string$numberRecord))
        .type.toBe<number | undefined>()

      expect(pipe(symbol$numberRecord, Struct.get(asym)))
        .type.toBe<number | undefined>()
      expect(Struct.get(asym)(symbol$numberRecord))
        .type.toBe<number | undefined>()

      expect(pipe(number$numberRecord, Struct.get(1)))
        .type.toBe<number | undefined>()
      expect(Struct.get(1)(number$numberRecord))
        .type.toBe<number | undefined>()

      expect(pipe(templateLiteral$numberRecord, Struct.get("ab")))
        .type.toBe<number | undefined>()
      expect(Struct.get("ab")(templateLiteral$numberRecord))
        .type.toBe<number | undefined>()
    })

    it("struct + record", () => {
      expect(pipe(hole<Record<string, number> & { a: boolean }>(), Struct.get("a")))
        .type.toBe<boolean>()
      when(pipe).isCalledWith(
        hole<Record<string, number> & { a: boolean }>(),
        expect(Struct.get).type.not.toBeCallableWith("b")
      )
    })
  })

  describe("pick", () => {
    it("errors when picking a non-existent key", () => {
      when(pipe).isCalledWith(
        stringStruct,
        expect(Struct.pick).type.not.toBeCallableWith("d")
      )
      expect(Struct.pick("d")).type.not.toBeCallableWith(
        stringStruct
      )

      when(pipe).isCalledWith(
        symbolStruct,
        expect(Struct.pick).type.not.toBeCallableWith(dsym)
      )
      expect(Struct.pick(dsym)).type.not.toBeCallableWith(
        symbolStruct
      )

      when(pipe).isCalledWith(
        numberStruct,
        expect(Struct.pick).type.not.toBeCallableWith(4)
      )
      expect(Struct.pick(4)).type.not.toBeCallableWith(
        numberStruct
      )
    })

    it("returns a string record with unknown values when picking a dynamic string key", () => {
      expect(pipe(stringStruct, Struct.pick("d" as string)))
        .type.toBe<{ [x: string]: unknown }>()
      expect(Struct.pick("d" as string)(stringStruct))
        .type.toBe<{ [x: string]: unknown }>()
    })

    it("returns a symbol record with unknown values when picking a dynamic symbol key", () => {
      expect(pipe(symbolStruct, Struct.pick(dsym as symbol)))
        .type.toBe<{ [x: symbol]: unknown }>()
      expect(Struct.pick(dsym as symbol)(symbolStruct))
        .type.toBe<{ [x: symbol]: unknown }>()
    })

    it("returns a number record with unknown values when picking a dynamic numeric key", () => {
      expect(pipe(numberStruct, Struct.pick(4 as number)))
        .type.toBe<{ [x: number]: unknown }>()
      expect(Struct.pick(4 as number)(numberStruct))
        .type.toBe<{ [x: number]: unknown }>()
    })

    it("struct with required properties", () => {
      expect(pipe(stringStruct, Struct.pick("a", "b")))
        .type.toBe<{ a: string; b: number }>()
      expect(Struct.pick(stringStruct, "a", "b"))
        .type.toBe<{ a: string; b: number }>()

      expect(Struct.pick(symbolStruct, asym, bsym))
        .type.toBe<{ [asym]: string; [bsym]: number }>()
      expect(pipe(symbolStruct, Struct.pick(asym, bsym)))
        .type.toBe<{ [asym]: string; [bsym]: number }>()

      expect(Struct.pick(numberStruct, 1, 2))
        .type.toBe<{ 1: string; 2: number }>()
      expect(pipe(numberStruct, Struct.pick(1, 2)))
        .type.toBe<{ 1: string; 2: number }>()
    })

    it("record", () => {
      expect(Struct.pick(string$numberRecord, "a", "b"))
        .type.toBe<{ a?: number; b?: number }>()
      expect(pipe(string$numberRecord, Struct.pick("a", "b")))
        .type.toBe<{ a?: number; b?: number }>()

      expect(Struct.pick(symbol$numberRecord, asym, bsym))
        .type.toBe<{ [asym]?: number; [bsym]?: number }>()
      expect(pipe(symbol$numberRecord, Struct.pick(asym, bsym)))
        .type.toBe<{ [asym]?: number; [bsym]?: number }>()

      expect(Struct.pick(number$numberRecord, 1, 2))
        .type.toBe<{ 1?: number; 2?: number }>()
      expect(pipe(number$numberRecord, Struct.pick(1, 2)))
        .type.toBe<{ 1?: number; 2?: number }>()

      expect(Struct.pick(templateLiteral$numberRecord, "aa", "ab"))
        .type.toBe<{ aa?: number; ab?: number }>()
      expect(pipe(templateLiteral$numberRecord, Struct.pick("aa", "ab")))
        .type.toBe<{ aa?: number; ab?: number }>()
    })

    it("struct + record", () => {
      const sr = hole<Record<string, number> & { a: boolean }>()

      expect(Struct.pick(sr, "a"))
        .type.toBe<{ a: boolean }>()
      expect(pipe(sr, Struct.pick("a")))
        .type.toBe<{ a: boolean }>()

      // @tstyche fixme -- This doesn't work but it should
      expect(Struct.pick).type.not.toBeCallableWith(sr, "b")

      when(pipe).isCalledWith(
        sr,
        expect(Struct.pick).type.not.toBeCallableWith("b")
      )
    })

    it("struct with optional properties", () => {
      expect(Struct.pick(optionalStringStruct, "a", "b"))
        .type.toBe<{ a?: string; b: number }>()
      expect(pipe(optionalStringStruct, Struct.pick("a", "b")))
        .type.toBe<{ a?: string; b: number }>()
    })
  })

  describe("omit", () => {
    it("errors when omitting a non-existent key", () => {
      when(pipe).isCalledWith(
        stringStruct,
        expect(Struct.omit).type.not.toBeCallableWith("d")
      )
      expect(Struct.omit("d")).type.not.toBeCallableWith(
        stringStruct
      )

      when(pipe).isCalledWith(
        symbolStruct,
        expect(Struct.omit).type.not.toBeCallableWith(dsym)
      )
      expect(Struct.omit(dsym)).type.not.toBeCallableWith(
        symbolStruct
      )

      when(pipe).isCalledWith(
        numberStruct,
        expect(Struct.omit).type.not.toBeCallableWith(4)
      )
      expect(Struct.omit(4)).type.not.toBeCallableWith(
        numberStruct
      )
    })

    it("struct", () => {
      expect(Struct.omit(stringStruct, "a"))
        .type.toBe<{ b: number; c: boolean }>()
      expect(pipe(stringStruct, Struct.omit("a")))
        .type.toBe<{ b: number; c: boolean }>()

      expect(Struct.omit(symbolStruct, asym))
        .type.toBe<{ [bsym]: number; [csym]: boolean }>()
      expect(pipe(symbolStruct, Struct.omit(asym)))
        .type.toBe<{ [bsym]: number; [csym]: boolean }>()

      expect(Struct.omit(numberStruct, 1))
        .type.toBe<{ 2: number; 3: boolean }>()
      expect(pipe(numberStruct, Struct.omit(1)))
        .type.toBe<{ 2: number; 3: boolean }>()
    })

    it("record", () => {
      expect(Struct.omit(string$numberRecord, "a"))
        .type.toBe<{ [x: string]: number }>()
      expect(pipe(string$numberRecord, Struct.omit("a")))
        .type.toBe<{ [x: string]: number }>()

      expect(Struct.omit(symbol$numberRecord, asym))
        .type.toBe<{ [x: symbol]: number }>()
      expect(pipe(symbol$numberRecord, Struct.omit(asym)))
        .type.toBe<{ [x: symbol]: number }>()

      expect(Struct.omit(number$numberRecord, 1))
        .type.toBe<{ [x: number]: number }>()
      expect(pipe(number$numberRecord, Struct.omit(1)))
        .type.toBe<{ [x: number]: number }>()

      expect(Struct.omit(templateLiteral$numberRecord, "aa"))
        .type.toBe<{ [x: `a${string}`]: number }>()
      expect(pipe(templateLiteral$numberRecord, Struct.omit("aa")))
        .type.toBe<{ [x: `a${string}`]: number }>()
    })
  })

  describe("entries", () => {
    it("excludes symbol keys", () => {
      const c = Symbol("c")
      const value = { a: "a", b: 1, [c]: 2 }
      // should not include symbol keys
      expect(Struct.entries(value)).type.toBe<Array<["a" | "b", string | number]>>()
      // when the object is passed as a parameter, the values should be narrowed
      expect(Struct.entries({ a: "a", b: 1, [c]: 2 })).type.toBe<Array<["a" | "b", "a" | 1]>>()
    })
  })
})
