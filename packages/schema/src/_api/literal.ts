// tracing: off

import { pipe } from "@effect-ts/core/Function"

import type {
  CompositionE,
  LeafE,
  LiteralE,
  NextE,
  PrevE,
  RefinementE
} from "../_schema/error"
import { leafE, literalE } from "../_schema/error"
import { arbitrary, constructor, encoder, mapApi, refine } from "../_schema/primitives"
import type { Schema } from "../_schema/schema"
import * as Th from "../These"
import { unknown } from "./unknown"

export interface MatchStrictLiteral<KS extends readonly string[]> {
  (
    i: {
      [k in keyof KS]: () => void
    }
  ): void
}

export interface LiteralApi<KS extends readonly string[], AS extends KS[number]> {
  readonly matchS: <A>(
    _: {
      [K in KS[number]]: (_: K) => A
    }
  ) => (ks: AS) => A
  readonly matchW: <
    M extends {
      [K in KS[number]]: (_: K) => any
    }
  >(
    _: M
  ) => (
    ks: AS
  ) => {
    [K in keyof M]: ReturnType<M[K]>
  }[keyof M]
}

export function literal<KS extends readonly string[]>(
  ...literals: KS
): Schema<
  unknown,
  CompositionE<NextE<RefinementE<LeafE<LiteralE<KS>>>> | PrevE<never>>,
  KS[number],
  KS[number],
  never,
  KS[number],
  string,
  LiteralApi<KS, KS[number]>
> {
  const ko = {}
  for (const k of literals) {
    ko[k] = true
  }
  return pipe(
    unknown,
    refine(
      (u): u is KS[number] => typeof u === "string" && u in ko,
      (actual) => leafE(literalE(literals, actual))
    ),
    constructor((s: KS[number]) => Th.succeed(s)),
    arbitrary((_) => _.oneof(...literals.map((k) => _.constant(k)))),
    encoder((_) => _ as string),
    mapApi(
      (): LiteralApi<KS, KS[number]> => ({
        matchS: (m) => (k) => m[k](k),
        matchW: (m) => (k) => m[k](k)
      })
    )
  )
}
