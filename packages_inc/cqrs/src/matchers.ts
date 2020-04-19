import { T } from "@matechs/prelude";

// experimental alpha
/* istanbul ignore file */

type ValueByKeyByTag<Union extends Record<any, any>, Tags extends keyof Union = keyof Union> = {
  [Tag in Tags]: {
    [Key in Union[Tag]]: Union extends { [r in Tag]: Key } ? Union : never;
  };
};

type Cases<Record, R> = { [key in keyof Record]: (v: Record[key]) => R };

interface Default<A, R> {
  default: (a: A) => R;
}

export interface MatcherT<A, Tag extends keyof A>
  extends MatcherTIntern<A, ValueByKeyByTag<A>[Tag]> {}

interface MatcherTIntern<A, Record> {
  <M extends Cases<Record, any>>(match: M): (
    a: A
  ) => ReturnType<M[keyof M]> extends T.Effect<infer S, infer R, infer E, infer B>
    ? T.Effect<S, R, E, B>
    : never;

  <M extends Partial<Cases<Record, any>> & Default<A, any>>(match: M): (
    a: A
  ) => ReturnType<NonNullable<M[keyof M]>> extends T.Effect<infer S, infer R, infer E, infer B>
    ? T.Effect<S, R, E, B>
    : never;
}
