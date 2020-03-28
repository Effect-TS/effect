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

export interface AspectR<R2> {
  <R>(Spec: Spec<R & R2>): Spec<R>;
}
export interface AspectR12<R1, R2> {
  <R>(Spec: Spec<R & R1>): Spec<R & R2>;
}

export interface Aspect extends AspectR<unknown> {}

export const patch = <R, R2>(f: (_: Test<R>) => Test<R2>) => (s: Spec<R>): Spec<R2> => {
  switch (s._tag) {
    case "test":
      return f(s);
    case "suite":
      return {
        ...s,
        specs: s.specs.map(patch(f))
      } as any;
  }
};
