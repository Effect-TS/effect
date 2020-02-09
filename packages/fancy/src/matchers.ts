import { effect as T } from "@matechs/effect";
import { Cont } from ".";

// experimental alpha
/* istanbul ignore file */

type ValueByKeyByTag<
  Union extends Record<any, any>,
  Tags extends keyof Union = keyof Union
> = {
  [Tag in Tags]: {
    [Key in Union[Tag]]: Union extends { [r in Tag]: Key } ? Union : never;
  };
};

type Cases<Action, Record, R> = {
  [key in keyof Record]: (v: Record[key], cont: Cont<Action>) => R;
};

interface Default<Action, A, R> {
  default: (a: A, cont: Cont<Action>) => R;
}

export interface MatcherT<A, Tag extends keyof A>
  extends MatcherTIntern<A, A, ValueByKeyByTag<A>[Tag]> {}

interface MatcherTIntern<Action, A, Record> {
  <M extends Cases<Action, Record, any>>(match: M): (
    cont: Cont<A>
  ) => (
    a: A
  ) => ReturnType<M[keyof M]> extends T.Effect<infer R, infer E, infer B>
    ? T.Effect<R, E, B>
    : never;

  <M extends Partial<Cases<Action, Record, any>> & Default<Action, A, any>>(
    match: M
  ): (
    cont: Cont<A>
  ) => (
    a: A
  ) => ReturnType<NonNullable<M[keyof M]>> extends T.Effect<
    infer R,
    infer E,
    infer B
  >
    ? T.Effect<R, E, B>
    : never;
}
