import type * as DE from "@fp-ts/codec/DecodeError"
import type { Meta } from "@fp-ts/codec/Meta"
import * as S from "@fp-ts/codec/Schema"
import type { Schema } from "@fp-ts/codec/Schema"
import * as C from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"

interface SetService {
  readonly _tag: "SetService"
  readonly rep: (reps: [string]) => string
}

const SetService = C.Tag<SetService>()

const set = <P, E, A>(item: S.Schema<P, E, A>): S.Schema<P | SetService, E, Set<A>> =>
  S.constructor(SetService, item)

const typeRepSet = (type: [string]) => `Set<${type[0]}>`

interface OptionService {
  readonly _tag: "OptionService"
  readonly rep: (type: [string]) => string
}

const OptionService = C.Tag<OptionService>()

const option = <P, E, A>(
  item: S.Schema<P, E, A>
): S.Schema<P | OptionService, E, Option<A>> => S.constructor(OptionService, item)

const typeRepOption = (reps: [string]) => `Option<${reps[0]}>`

interface BigIntService {
  readonly _tag: "BigIntService"
  readonly rep: () => string
}

const BigIntService = C.Tag<BigIntService>()

const bigint: S.Schema<BigIntService, DE.Type, bigint> = S.primitive(BigIntService)

export const typeRepFor = <P>(ctx: C.Context<P>) => {
  const f = (meta: Meta): string => {
    switch (meta._tag) {
      case "Constructor": {
        const service = pipe(ctx, C.get(meta.tag as any)) as any
        return service.rep(meta.metas.map(f))
      }
      case "String":
        return "string"
      case "Number":
        return "number"
      case "Boolean":
        return "boolean"
      case "Literal":
        return JSON.stringify(meta.literal)
      case "Tuple": {
        const components = meta.components
        const restElement = pipe(
          meta.restElement,
          O.map((meta) => (components.length > 0 ? ", " : "") + `...${f(meta)}[]`),
          O.getOrElse("")
        )
        return `${meta.readonly ? "readonly " : ""}[${components.map(f).join(", ")}${restElement}]`
      }
      case "Union":
        return meta.members.map(f).join(" | ")
      case "Struct":
        return "{ " +
          meta.fields.map((field) =>
            `${field.readonly ? "readonly " : ""}${String(field.key)}${
              field.optional ? "?" : ""
            }: ${f(field.value)}`
          ).join(", ")
          + " }"
      case "IndexSignature":
        return `{ ${meta.readonly ? "readonly " : ""}[_: ${meta.key}]: ${f(meta.value)} }`
      case "Array":
        return `${meta.readonly ? "Readonly" : ""}Array<${f(meta.item)}>`
      case "Refinement":
        return f(meta.meta)
    }
  }
  return <E, A>(schema: Schema<P, E, A>): string => f(schema)
}

describe("typeRepFor", () => {
  const ctx = pipe(
    C.empty(),
    C.add(SetService)({
      _tag: "SetService",
      rep: typeRepSet
    }),
    C.add(OptionService)({
      _tag: "OptionService",
      rep: typeRepOption
    }),
    C.add(BigIntService)({
      _tag: "BigIntService",
      rep: () => "bigint"
    })
  )
  const show = typeRepFor(ctx)

  it("primitive", () => {
    const schema = set(bigint)
    expect(pipe(schema, show)).toEqual("Set<bigint>")
  })

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

    it("nonEmptyArray", () => {
      const schema = S.nonEmptyArray(true, S.string, S.number)
      expect(pipe(schema, show)).toEqual(
        "readonly [string, ...number[]]"
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

    it("tuple", () => {
      const schema = S.tuple(true, S.string, S.number)
      expect(pipe(schema, show)).toEqual(
        "readonly [string, number]"
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

    it("refinement", () => {
      const schema = pipe(S.string, S.minLength(2), S.maxLength(4))
      expect(pipe(schema, show)).toEqual(
        "string"
      )
    })
  })
})
