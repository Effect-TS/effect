// tracing: off

import { pipe } from "@effect-ts/core/Function"

import * as S from "../_schema"
import * as Th from "../These"
import { refinement } from "./refinement"

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

export const literalIdentifier = Symbol.for("@effect-ts/schema/ids/literal")

export function literal<KS extends readonly string[]>(
  ...literals: KS
): S.Schema<
  unknown,
  S.RefinementE<S.LeafE<S.LiteralE<KS>>>,
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
    refinement(
      (u): u is KS[number] => typeof u === "string" && u in ko,
      (actual) => S.leafE(S.literalE(literals, actual))
    ),
    S.constructor((s: KS[number]) => Th.succeed(s)),
    S.arbitrary((_) => _.oneof(...literals.map((k) => _.constant(k)))),
    S.encoder((_) => _ as string),
    S.mapApi(
      (): LiteralApi<KS, KS[number]> => ({
        matchS: (m) => (k) => m[k](k),
        matchW: (m) => (k) => m[k](k)
      })
    ),
    S.identified(literalIdentifier, { literals })
  )
}
