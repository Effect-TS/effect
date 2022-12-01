import * as E from "@fp-ts/data/Either"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import type { AST } from "@fp-ts/schema/AST"
import * as BigInt from "@fp-ts/schema/data/Bigint"
import * as Boolean from "@fp-ts/schema/data/Boolean"
import * as Number from "@fp-ts/schema/data/Number"
import * as set from "@fp-ts/schema/data/Set"
import * as String from "@fp-ts/schema/data/String"
import * as G from "@fp-ts/schema/Guard"
import type { Provider } from "@fp-ts/schema/Provider"
import * as P from "@fp-ts/schema/Provider"
import { findHandler, Semigroup } from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"
import type { Schema } from "@fp-ts/schema/Schema"

export const ShowId: unique symbol = Symbol.for(
  "@fp-ts/schema/Show"
)

export type ShowId = typeof ShowId

export interface Show<in out A> extends Schema<A> {
  readonly show: (a: A) => string
}

export const make = <A>(schema: Schema<A>, show: Show<A>["show"]): Show<A> =>
  ({ ast: schema.ast, show }) as any

export const lazy = <A>(
  f: () => Show<A>
): Show<A> => {
  const get = S.memoize<void, Show<A>>(f)
  const schema = S.lazy(f)
  return make(
    schema,
    (a) => get().show(a)
  )
}

export const provideShowFor = (provider: Provider) =>
  <A>(schema: Schema<A>): Show<A> => {
    const go = (ast: AST): Show<any> => {
      switch (ast._tag) {
        case "Declaration": {
          const handler = pipe(
            ast.provider,
            Semigroup.combine(provider),
            findHandler(ShowId, ast.id)
          )
          if (O.isSome(handler)) {
            return O.isSome(ast.config) ?
              handler.value(ast.config.value)(...ast.nodes.map(go)) :
              handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for Show interpreter, data type ${ast.id.description?.toString()}`
          )
        }
        case "Of":
          return make(S.make(ast), (a) => JSON.stringify(a))
        case "Tuple": {
          const components: ReadonlyArray<Show<unknown>> = ast.components.map(go)
          return make(S.make(ast), (tuple: ReadonlyArray<unknown>) =>
            "[" +
            tuple.map((c, i) =>
              i < components.length ?
                components[i].show(c) :
                O.isSome(ast.restElement) ?
                go(ast.restElement.value).show(c) :
                ""
            ).join(
              ","
            ) + "]")
        }
        case "Union": {
          const members = ast.members.map(go)
          const guards = ast.members.map((member) => G.guardFor(S.make(member)))
          return make(S.make(ast), (a) => {
            const index = guards.findIndex((Show) => Show.is(a))
            return members[index].show(a)
          })
        }
        case "Struct": {
          const fields: any = {}
          for (const field of ast.fields) {
            fields[field.key] = go(field.value)
          }
          const oIndexSignature = pipe(ast.indexSignature, O.map((is) => go(is.value)))
          return make(
            S.make(ast),
            (struct: { [_: PropertyKey]: unknown }) => {
              const keys = Object.keys(struct)
              let out = "{"
              for (const key of keys) {
                if (key in fields) {
                  out += `${JSON.stringify(key)}:${fields[key].show(struct[key])},`
                }
              }
              if (O.isSome(oIndexSignature)) {
                const indexSignature = oIndexSignature.value
                for (const key of keys) {
                  if (!(key in fields)) {
                    out += `${JSON.stringify(key)}:${indexSignature.show(struct[key])},`
                  }
                }
              }
              out = out.substring(0, out.length - 1)
              out += "}"
              return out
            }
          )
        }
        case "Lazy":
          return lazy(() => go(ast.f()))
      }
    }

    return go(schema.ast)
  }

const provider: P.Provider = P.Monoid.combineAll([
  set.Provider,
  P.make(BigInt.id, {
    [ShowId]: () => make(BigInt.Schema, (bigint) => bigint.toString())
  }),
  P.make(String.id, {
    [ShowId]: () => make(String.Schema, (s) => JSON.stringify(s))
  }),
  P.make(Number.id, {
    [ShowId]: () => make(Number.Schema, (n) => JSON.stringify(n))
  }),
  P.make(Boolean.id, {
    [ShowId]: () => make(Boolean.Schema, (b) => JSON.stringify(b))
  }),
  P.make(set.id, {
    [ShowId]: <A>(item: Show<A>): Show<Set<A>> =>
      make(
        set.schema(item),
        (set) => `Set([${Array.from(set.values()).map(item.show).join(", ")}])`
      )
  })
])

export const showFor = provideShowFor(provider)

describe("Show", () => {
  it("struct", () => {
    const schema = S.struct({ a: S.string, b: S.struct({ c: S.number }) })
    expect(showFor(schema).show({ a: "a", b: { c: 1 } })).toEqual(
      "{\"a\":\"a\",\"b\":{\"c\":1}}"
    )
    const schema2 = pipe(schema, S.pick("b"))
    expect(showFor(schema2).show({ b: { c: 1 } })).toEqual(
      "{\"b\":{\"c\":1}}"
    )
  })

  it("declaration", () => {
    const schema = set.schema(S.string)
    expect(showFor(schema).show(new Set("a"))).toEqual(
      "Set([\"a\"])"
    )
  })

  it("recursive", () => {
    interface A {
      readonly a: string
      readonly as: Set<A>
    }
    const A: S.Schema<A> = S.lazy<A>(() =>
      S.struct({
        a: S.string,
        as: set.schema(A)
      })
    )
    expect(showFor(A).show({ a: "a", as: new Set() })).toEqual(
      "{\"a\":\"a\",\"as\":Set([])}"
    )
  })

  it("string", () => {
    const schema = S.string
    expect(showFor(schema).show("a")).toEqual(
      "\"a\""
    )
  })

  it("number", () => {
    const schema = S.number
    expect(showFor(schema).show(1)).toEqual(
      "1"
    )
  })

  it("boolean", () => {
    const schema = S.boolean
    expect(showFor(schema).show(true)).toEqual(
      "true"
    )
  })

  it("of", () => {
    const schema = S.of(1)
    expect(showFor(schema).show(1)).toEqual(
      "1"
    )
  })

  it("tuple", () => {
    const schema = S.tuple(S.string, S.number)
    expect(showFor(schema).show(["a", 1])).toEqual(
      "[\"a\",1]"
    )
  })

  it("nonEmptyArray", () => {
    const schema = S.nonEmptyArray(S.string, S.number)
    expect(showFor(schema).show(["a", 1])).toEqual(
      "[\"a\",1]"
    )
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    const s = showFor(schema)
    expect(s.show("a")).toEqual(
      "\"a\""
    )
    expect(s.show(1)).toEqual(
      "1"
    )
  })

  it("struct", () => {
    const schema = S.struct({ a: S.string, b: S.number })
    expect(showFor(schema).show({ a: "a", b: 1 })).toEqual(
      "{\"a\":\"a\",\"b\":1}"
    )
  })

  it("indexSignature", () => {
    const schema = S.indexSignature(S.string)
    expect(showFor(schema).show({ a: "a", b: "b" })).toEqual(
      "{\"a\":\"a\",\"b\":\"b\"}"
    )
  })

  it("array", () => {
    const schema = S.array(S.string)
    expect(showFor(schema).show(["a", "b"])).toEqual(
      "[\"a\",\"b\"]"
    )
  })

  it("option (as structure)", () => {
    const schema = S.option(S.number)
    const show = showFor(schema)
    expect(show.show(O.none)).toEqual(
      "{\"_tag\":\"None\"}"
    )
    expect(show.show(O.some(1))).toEqual(
      "{\"_tag\":\"Some\",\"value\":1}"
    )
  })

  it("either (as structure)", () => {
    const schema = S.either(S.string, S.number)
    const show = showFor(schema)
    expect(show.show(E.right(1))).toEqual(
      "{\"_tag\":\"Right\",\"right\":1}"
    )
    expect(show.show(E.left("e"))).toEqual(
      "{\"_tag\":\"Left\",\"left\":\"e\"}"
    )
  })
})
