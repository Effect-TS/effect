import { effect as T } from "@matechs/effect";

export interface Test<R> {
  _R: R;
  _tag: "test";
  name: string;
  eff: T.Effect<R, any, void>;
  config: Record<string, unknown>;
}

export interface Suite<R> {
  _R: R;
  _tag: "suite";
  name: string;
  specs: Spec<R>[];
}

export type Spec<R> = Test<R> | Suite<R>;

export type AspectR<R2> = <R>(Spec: Spec<R>) => Spec<R & R2>;
export type Aspect = AspectR<unknown>;

export const patch = <R>(f: (_: Test<R>) => Test<R>) => (s: Spec<R>): Spec<R> => {
  switch (s._tag) {
    case "test":
      return f(s);
    case "suite":
      return {
        ...s,
        specs: s.specs.map(patch(f))
      };
  }
};
