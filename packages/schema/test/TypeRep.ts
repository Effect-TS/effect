import type { DSL } from "@fp-ts/codec/DSL"
import * as S from "@fp-ts/codec/Schema"
import type { Schema } from "@fp-ts/codec/Schema"
import * as C from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"

interface SetService {
  readonly show: (type: string) => string
}

const SetService = C.Tag<SetService>()

const set = <P, E, A>(item: S.Schema<P, E, A>): S.Schema<P | SetService, E, Set<A>> =>
  S.constructor(SetService, item)

export const typeRepSet = (type: string) => `Set<${type}>`

interface OptionService {
  readonly show: (type: string) => string
}

const OptionService = C.Tag<OptionService>()

const option = <P, E, A>(
  item: S.Schema<P, E, A>
): S.Schema<P | OptionService, E, Option<A>> => S.constructor(OptionService, item)

export const typeRepOption = (type: string) => `Option<${type}>`

export const typeRepFor = <P>(ctx: C.Context<P>) => {
  const f = (dsl: DSL): string => {
    switch (dsl._tag) {
      case "ConstructorDSL": {
        const service: any = pipe(ctx, C.get(dsl.tag as any))
        return service.show(f(dsl.type))
      }
      case "StringDSL":
        return "string"
      case "NumberDSL":
        return "number"
      case "BooleanDSL":
        return "boolean"
      case "LiteralDSL":
        return JSON.stringify(dsl.literal)
      case "TupleDSL":
        return "[" + dsl.components.map(f).join(", ") + "]"
      case "UnionDSL":
        return dsl.members.map(f).join(" | ")
      case "StructDSL":
        return "{ " +
          dsl.fields.map((field) =>
            `${field.readonly ? "readonly " : ""}${String(field.key)}${
              field.optional ? "?" : ""
            }: ${f(field.value)}`
          ).join(", ")
          + " }"
      case "IndexSignatureDSL":
        return `{ ${dsl.readonly ? "readonly " : ""}[_: ${dsl.key}]: ${f(dsl.value)} }`
      case "ArrayDSL":
        return `${dsl.readonly ? "Readonly" : ""}Array<${f(dsl.item)}>`
    }
  }
  return <E, A>(schema: Schema<P, E, A>): string => f(schema)
}

describe("typeRepFor", () => {
  const ctx = pipe(
    C.empty(),
    C.add(SetService)({
      show: typeRepSet
    }),
    C.add(OptionService)({
      show: typeRepOption
    })
  )
  const show = typeRepFor(ctx)

  it("constructor", () => {
    const schema = set(set(S.string))
    expect(pipe(schema, show)).toEqual("Set<Set<string>>")
  })

  describe("show", () => {
    it("struct", () => {
      const schema = S.struct({
        a: S.string,
        b: S.number
      })
      expect(pipe(schema, show)).toEqual(
        "{ readonly a: string, readonly b: number }"
      )
    })

    it("constructor", () => {
      const schema = S.struct({
        a: set(S.string)
      })
      expect(pipe(schema, show)).toEqual(
        "{ readonly a: Set<string> }"
      )
    })

    it("ReadonlyArray", () => {
      const schema = S.array(true, S.string)
      expect(pipe(schema, show)).toEqual(
        "ReadonlyArray<string>"
      )
    })

    it("Array", () => {
      const schema = S.array(false, S.string)
      expect(pipe(schema, show)).toEqual(
        "Array<string>"
      )
    })

    it("literal", () => {
      const schema = S.literal("a")
      expect(pipe(schema, show)).toEqual(
        "\"a\""
      )
    })

    it("indexSignature", () => {
      const schema = S.indexSignature(S.string)
      expect(pipe(schema, show)).toEqual(
        "{ readonly [_: string]: string }"
      )
    })

    it("union", () => {
      const schema = S.union(S.string, S.number)
      expect(pipe(schema, show)).toEqual(
        "string | number"
      )
    })

    it("option (as structure)", () => {
      const schema = S.option(S.string)
      expect(pipe(schema, show)).toEqual(
        "{ readonly _tag: \"None\" } | { readonly _tag: \"Some\", readonly value: string }"
      )
    })

    it("either (as structure)", () => {
      const schema = S.either(S.string, S.number)
      expect(pipe(schema, show)).toEqual(
        "{ readonly _tag: \"Left\", readonly left: string } | { readonly _tag: \"Right\", readonly right: number }"
      )
    })

    it("option (as constructor)", () => {
      const schema = option(set(S.string))
      expect(pipe(schema, show)).toEqual(
        "Option<Set<string>>"
      )
    })
  })
})
