// tracing: off

import * as Chunk from "@effect-ts/core/Collections/Immutable/Chunk"
import { pipe } from "@effect-ts/system/Function"

import type { ApiSelfType, UnionE } from "../_schema"
import * as S from "../_schema"
import * as Arbitrary from "../Arbitrary"
import * as Constructor from "../Constructor"
import * as Encoder from "../Encoder"
import * as Guard from "../Guard"
import * as Parser from "../Parser"
import * as Th from "../These"
import { literal } from "./literal"

export interface TagApi<K> {
  value: K
}

export const tagIdentifier = Symbol.for("@effect-ts/schema/ids/tag")

export function tag<K extends string>(
  _tag: K
): S.Schema<
  unknown,
  S.RefinementE<S.LeafE<S.LiteralE<[K]>>>,
  K,
  K,
  never,
  K,
  string,
  TagApi<K>
> {
  return literal(_tag)
    ["|>"](S.mapApi((_) => ({ value: _tag })))
    ["|>"](S.identified(tagIdentifier, { _tag }))
}

type SchemaK<Key extends string, N extends string> = S.Schema<
  unknown,
  any,
  any,
  any,
  { readonly [K in Key]: N },
  any,
  any,
  {
    fields: {
      [K in Key]: TagApi<N>
    }
  }
>

export interface TaggedApi<
  Key extends string,
  Props extends readonly SchemaK<Key, string>[]
> extends ApiSelfType<unknown> {
  readonly of: {
    [K in Props[number]["Api"]["fields"][Key]["value"]]: (
      _: Omit<
        Extract<
          {
            [K in keyof Props]: Props[K] extends S.SchemaAny
              ? S.ConstructorInputOf<Props[K]>
              : never
          }[number],
          {
            [k in Key]: K
          }
        >,
        Key
      >
    ) => Th.These<
      UnionE<
        {
          [K in keyof Props]: Props[K] extends S.SchemaAny
            ? S.MemberE<
                S.ConstructedShapeOf<Props[K]>[Key],
                S.ConstructorErrorOf<Props[K]>
              >
            : never
        }[number]
      >,
      S.GetApiSelfType<
        this,
        {
          [K in keyof Props]: Props[K] extends S.SchemaAny
            ? S.ParsedShapeOf<Props[K]>
            : never
        }[number]
      >
    >
  }
  readonly matchS: <A>(
    _: {
      [K in Props[number]["Api"]["fields"][Key]["value"]]: (
        _: Extract<
          {
            [K in keyof Props]: Props[K] extends S.SchemaAny
              ? S.ParsedShapeOf<Props[K]>
              : never
          }[number],
          {
            [k in Key]: K
          }
        >
      ) => A
    }
  ) => (
    ks: S.GetApiSelfType<
      this,
      {
        [K in keyof Props]: Props[K] extends S.SchemaAny
          ? S.ParsedShapeOf<Props[K]>
          : never
      }[number]
    >
  ) => A
  readonly matchW: <
    M extends {
      [K in Props[number]["Api"]["fields"][Key]["value"]]: (
        _: Extract<
          {
            [K in keyof Props]: Props[K] extends S.SchemaAny
              ? S.ParsedShapeOf<Props[K]>
              : never
          }[number],
          {
            [k in Key]: K
          }
        >
      ) => any
    }
  >(
    _: M
  ) => (
    ks: S.GetApiSelfType<
      this,
      {
        [K in keyof Props]: Props[K] extends S.SchemaAny
          ? S.ParsedShapeOf<Props[K]>
          : never
      }[number]
    >
  ) => {
    [K in keyof M]: ReturnType<M[K]>
  }[keyof M]
}

export const taggedUnionIdentifier = Symbol.for("@effect-ts/schema/ids/tagged")

export function makeTagged<Key extends string>(key: Key) {
  return <Props extends readonly SchemaK<Key, string>[]>(
    ...props: Props
  ): S.Schema<
    unknown,
    S.CompositionE<
      | S.PrevE<S.LeafE<S.ExtractKeyE>>
      | S.NextE<
          UnionE<
            {
              [K in keyof Props]: Props[K] extends S.SchemaAny
                ? S.MemberE<S.ParsedShapeOf<Props[K]>[Key], S.ParserErrorOf<Props[K]>>
                : never
            }[number]
          >
        >
    >,
    {
      [K in keyof Props]: Props[K] extends S.SchemaAny
        ? S.ParsedShapeOf<Props[K]>
        : never
    }[number],
    {
      [K in keyof Props]: Props[K] extends S.SchemaAny
        ? S.ConstructorInputOf<Props[K]>
        : never
    }[number],
    UnionE<
      {
        [K in keyof Props]: Props[K] extends S.SchemaAny
          ? S.MemberE<
              S.ConstructedShapeOf<Props[K]>[Key],
              S.ConstructorErrorOf<Props[K]>
            >
          : never
      }[number]
    >,
    {
      [K in keyof Props]: Props[K] extends S.SchemaAny
        ? S.ConstructedShapeOf<Props[K]>
        : never
    }[number],
    {
      [K in keyof Props]: Props[K] extends S.SchemaAny ? S.EncodedOf<Props[K]> : never
    }[number],
    TaggedApi<Key, Props>
  > => {
    const propsObj = {}
    const guards = {}
    const parsers = {}
    const encoders = {}
    const constructors = {}
    const ofs = {}
    const arbitraries = [] as Arbitrary.Gen<unknown>[]
    const keys = [] as string[]

    for (const p of props) {
      propsObj[p.Api.fields[key].value] = p
      guards[p.Api.fields[key].value] = Guard.for(p)
      parsers[p.Api.fields[key].value] = Parser.for(p)
      encoders[p.Api.fields[key].value] = Encoder.for(p)
      constructors[p.Api.fields[key].value] = Constructor.for(p)
      ofs[p.Api.fields[key].value] = (_: any) =>
        constructors[p.Api.fields[key].value](
          Object.assign({ [key]: p.Api.fields[key].value }, _)
        )
      arbitraries.push(Arbitrary.for(p))
      keys.push(p.Api.fields[key].value)
    }

    const guard = (
      u: unknown
    ): u is {
      [K in keyof Props]: Props[K] extends S.SchemaAny
        ? S.ParsedShapeOf<Props[K]>
        : never
    }[number] => {
      if (typeof u === "object" && u != null && key in u) {
        const tag = u[key as string]
        const memberGuard = guards[tag]

        if (memberGuard) {
          return memberGuard(u)
        }
      }
      return false
    }

    return pipe(
      S.identity(guard),
      S.arbitrary(
        (_) =>
          _.oneof(...arbitraries.map((f) => f(_))) as Arbitrary.Arbitrary<
            {
              [K in keyof Props]: Props[K] extends S.SchemaAny
                ? S.ParsedShapeOf<Props[K]>
                : never
            }[number]
          >
      ),
      S.encoder((_): {
        [K in keyof Props]: Props[K] extends S.SchemaAny ? S.EncodedOf<Props[K]> : never
      }[number] => (encoders as any)[_[key]](_)),
      S.parser(
        (
          u: unknown
        ): Th.These<
          S.CompositionE<
            | S.PrevE<S.LeafE<S.ExtractKeyE>>
            | S.NextE<
                UnionE<
                  {
                    [K in keyof Props]: Props[K] extends S.SchemaAny
                      ? S.MemberE<
                          S.ParsedShapeOf<Props[K]>[Key],
                          S.ParserErrorOf<Props[K]>
                        >
                      : never
                  }[number]
                >
              >
          >,
          {
            [K in keyof Props]: Props[K] extends S.SchemaAny
              ? S.ParsedShapeOf<Props[K]>
              : never
          }[number]
        > => {
          if (typeof u === "object" && u != null && key in u) {
            const tag = u[key as string]

            const memberParser = parsers[tag] as Parser.Parser<
              unknown,
              unknown,
              unknown
            >

            if (memberParser) {
              const result = memberParser(u)

              if (result.effect._tag === "Left") {
                return Th.fail(
                  S.compositionE(
                    Chunk.single(
                      S.nextE(
                        S.unionE(
                          Chunk.single(
                            S.memberE(
                              tag,
                              result.effect.left
                            ) as Props[number] extends S.SchemaAny
                              ? S.MemberE<
                                  S.ParsedShapeOf<Props[number]>[Key],
                                  S.ParserErrorOf<Props[number]>
                                >
                              : never
                          )
                        )
                      )
                    )
                  )
                )
              } else {
                const warnings = result.effect.right.get(1)
                if (warnings._tag === "Some") {
                  return Th.warn(
                    result.effect.right.get(0) as any,
                    S.compositionE(
                      Chunk.single(
                        S.nextE(
                          S.unionE(
                            Chunk.single(
                              S.memberE(
                                tag,
                                warnings.value
                              ) as Props[number] extends S.SchemaAny
                                ? S.MemberE<
                                    S.ParsedShapeOf<Props[number]>[Key],
                                    S.ParserErrorOf<Props[number]>
                                  >
                                : never
                            )
                          )
                        )
                      )
                    )
                  )
                }

                return Th.succeed(result.effect.right.get(0) as any)
              }
            }
          }
          return Th.fail(
            S.compositionE(Chunk.single(S.prevE(S.leafE(S.extractKeyE(key, keys, u)))))
          )
        }
      ),
      S.constructor(
        (
          u: {
            [K in keyof Props]: Props[K] extends S.SchemaAny
              ? S.ConstructorInputOf<Props[K]>
              : never
          }[number]
        ): Th.These<
          UnionE<
            {
              [K in keyof Props]: Props[K] extends S.SchemaAny
                ? S.MemberE<
                    S.ConstructedShapeOf<Props[K]>[Key],
                    S.ConstructorErrorOf<Props[K]>
                  >
                : never
            }[number]
          >,
          {
            [K in keyof Props]: Props[K] extends S.SchemaAny
              ? S.ConstructedShapeOf<Props[K]>
              : never
          }[number]
        > => {
          const tag = u[key as string]

          const memberConstructor = constructors[tag] as Constructor.Constructor<
            unknown,
            unknown,
            unknown
          >

          const result = memberConstructor(u)

          if (result.effect._tag === "Left") {
            return Th.fail(
              S.unionE(
                Chunk.single(
                  S.memberE(
                    tag,
                    result.effect.left
                  ) as Props[number] extends S.SchemaAny
                    ? S.MemberE<
                        S.ConstructedShapeOf<Props[number]>[Key],
                        S.ConstructorErrorOf<Props[number]>
                      >
                    : never
                )
              )
            )
          }

          const warnings = result.effect.right.get(1)

          if (warnings._tag === "Some") {
            return Th.warn(
              result.effect.right.get(0) as any,
              S.unionE(
                Chunk.single(
                  S.memberE(tag, warnings.value) as Props[number] extends S.SchemaAny
                    ? S.MemberE<
                        S.ConstructedShapeOf<Props[number]>[Key],
                        S.ConstructorErrorOf<Props[number]>
                      >
                    : never
                )
              )
            )
          }

          return Th.succeed(result.effect.right.get(0) as any)
        }
      ),
      S.mapApi(
        (_) =>
          ({
            of: ofs,
            matchS: (match) => (a) => match[a[key]](a),
            matchW: (match) => (a) => match[a[key]](a)
          } as TaggedApi<Key, Props>)
      ),
      S.identified(taggedUnionIdentifier, { key, props })
    )
  }
}

export const tagged = makeTagged("_tag")

export function withTag<Key extends string, Value extends string>(
  key: Key,
  value: Value
) {
  return <
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape extends ParsedShape,
    Encoded,
    Api
  >(
    self: S.Schema<
      unknown,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      Api
    >
  ): S.Schema<
    unknown,
    S.CompositionE<S.PrevE<S.LeafE<S.ExtractKeyE>> | S.NextE<ParserError>>,
    ParsedShape & { readonly [k in Key]: Value },
    ConstructorInput,
    ConstructorError,
    ConstructedShape & { readonly [k in Key]: Value },
    Encoded & { readonly [k in Key]: Value },
    Api & { fields: { [k in Key]: TagApi<Value> } }
  > => {
    const parseSelf = Parser.for(self)
    const constructSelf = Constructor.for(self)
    const arbSelf = Arbitrary.for(self)
    const encodeSelf = Encoder.for(self)
    const guardSelf = Guard.for(self)
    return pipe(
      self,
      S.parser((u: any): any => {
        if (typeof u !== "object" || u == null || u[key] !== value) {
          return Th.fail(
            S.compositionE(
              Chunk.single(S.prevE(S.leafE(S.extractKeyE(key, [value], u))))
            )
          )
        }
        const res = parseSelf(u)
        if (res.effect._tag === "Left") {
          return Th.fail(S.compositionE(Chunk.single(S.nextE(res.effect.left))))
        }
        const warnings = res.effect.right.get(1)
        const x = res.effect.right.get(0)
        // @ts-expect-error
        x[key] = value
        if (warnings._tag === "Some") {
          return Th.warn(
            S.compositionE(Chunk.single(S.nextE(warnings))),
            warnings.value
          )
        }
        return Th.succeed(x)
      }),
      S.constructor((u: any): any => {
        const res = constructSelf(u)
        if (res.effect._tag === "Left") {
          return Th.fail(res.effect.left)
        }
        const warnings = res.effect.right.get(1)
        const x = res.effect.right.get(0)
        // @ts-expect-error
        x[key] = value
        if (warnings._tag === "Some") {
          return Th.warn(warnings, warnings.value)
        }
        return Th.succeed(x)
      }),
      S.arbitrary((_) =>
        arbSelf(_).map((x) => {
          // @ts-expect-error
          x[key] = value
          return x
        })
      ),
      S.encoder((_) => {
        const x = encodeSelf(_)
        // @ts-expect-error
        x[key] = value
        return x
      }),
      S.guard(
        (u): u is ParsedShape =>
          guardSelf(u) &&
          typeof u === "object" &&
          u != null &&
          (u as any)[key] === value
      ),
      S.mapApi(() => ({
        ...self.Api,
        fields: { [key]: { value }, ...(self.Api["fields"] ? self.Api["fields"] : {}) }
      }))
    ) as any
  }
}
