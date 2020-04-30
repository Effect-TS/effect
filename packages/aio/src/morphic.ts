import { T } from "@matechs/prelude";
import { ADT, intersectADT, isIn, makeADT, ofType, unionADT } from "@morphic-ts/adt";
import {
  AsOpaque,
  AsUOpaque,
  M,
  Summoner,
  summonFor,
  UM
} from "@morphic-ts/batteries/lib/summoner-ESBST";
import { AOfMorhpADT } from "@morphic-ts/batteries/lib/usage/tagged-union";
import { AType, EType, RType } from "@morphic-ts/batteries/lib/usage/utils";
import { EqURI } from "@morphic-ts/eq-interpreters/lib/config";
import { FastCheckURI } from "@morphic-ts/fastcheck-interpreters/lib/config";
import { modelFastCheckInterpreter as fc } from "@morphic-ts/fastcheck-interpreters/lib/interpreters";
import { IoTsURI } from "@morphic-ts/io-ts-interpreters/lib/config";
import { ShowURI } from "@morphic-ts/show-interpreters/lib/config";

export {
  AsOpaque,
  AsUOpaque,
  M,
  Summoner,
  UM,
  summonFor,
  EqURI,
  IoTsURI,
  FastCheckURI,
  ShowURI,
  AType,
  EType,
  RType,
  AOfMorhpADT,
  intersectADT,
  isIn,
  makeADT,
  ofType,
  unionADT
};

export const arb = <Env, E, A>(F: M<Env, E, A>) => (
  _: { [k in "FastCheckURI" & keyof Env]: Env[k] }
) => F.derive(fc<Env>())(_).arb;

type Cases<Record, R> = { [key in keyof Record]: (v: Record[key]) => R };

type ValueByKeyByTag<Union extends Record<any, any>, Tags extends keyof Union = keyof Union> = {
  [Tag in Tags]: { [Key in Union[Tag]]: Union extends { [r in Tag]: Key } ? Union : never };
};

export interface MatcherWiden<A, Tag extends keyof A>
  extends MatcherWidenIntern<A, ValueByKeyByTag<A>[Tag]> {}

interface MatcherWidenIntern<A, Record> {
  <M extends Cases<Record, any>>(match: M): (
    a: A
  ) => ReturnType<M[keyof M]> extends T.Effect<infer S, infer R, infer E, infer A>
    ? T.Effect<S, R, E, A>
    : ReturnType<M[keyof M]> extends infer K
    ? K
    : never;
  <
    M extends Partial<Cases<Record, any>>,
    D extends (_: { [k in keyof Record]: Record[k] }[Exclude<keyof Record, keyof M>]) => any
  >(
    match: M,
    def: D
  ): (
    a: A
  ) =>
    | (ReturnType<NonNullable<M[keyof M]>> extends infer R ? R : never)
    | (unknown extends ReturnType<D> ? never : ReturnType<D>) extends T.Effect<
    infer S,
    infer R,
    infer E,
    infer A
  >
    ? T.Effect<S, R, E, A>
    :
        | (ReturnType<NonNullable<M[keyof M]>> extends infer R ? R : never)
        | (unknown extends ReturnType<D> ? never : ReturnType<D>);
}

export const match = <A, Tag extends string & keyof A>(_: ADT<A, Tag>): MatcherWiden<A, Tag> => (
  match: any,
  def?: any
) => (a: any): any => (match[a[_.tag]] || def)(a);
