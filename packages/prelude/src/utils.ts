import { EffectOption } from "./effectOption";
import {
  STypeOf,
  UnionToIntersection,
  RTypeOf,
  ETypeOf,
  ATypeOf
} from "@matechs/effect/lib/overloadEff";
import * as O from "./option";

export type SOf<Effs extends EffectOption<any, any, any, any>[]> = {
  [k in keyof Effs]: STypeOf<Effs[k]>;
}[number];

export type ROf<Effs extends EffectOption<any, any, any, any>[]> = UnionToIntersection<
  {
    [k in keyof Effs]: unknown extends RTypeOf<Effs[k]> ? never : RTypeOf<Effs[k]>;
  }[number]
>;

export type EOf<Effs extends EffectOption<any, any, any, any>[]> = {
  [k in keyof Effs]: ETypeOf<Effs[k]>;
}[number];

export type AOf<Effs extends EffectOption<any, any, any, any>[]> = {
  [k in keyof Effs]: ATypeOf<Effs[k]> extends O.Option<infer A> ? A : never;
}[number];
