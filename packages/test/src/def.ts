import { effect as T } from "@matechs/effect";

export interface Test<R> {
  _R: (_: R) => void;
  _tag: "test";
  name: string;
  eff: T.Effect<any, R, any, any>;
  config: Record<string, unknown>;
}

export interface Suite<R> {
  _R: (_: R) => void;
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

export interface AspectE<R2> {
  <R>(Spec: Spec<R>): Spec<R & R2>;
}

export interface Aspect extends AspectR<unknown> {}

export const patch = <R, R2>(f: (_: Test<R>) => Test<R2>) => (s: Spec<R>): Spec<R2> => {
  switch (s._tag) {
    case "test":
      return f(s);
    case "suite":
      return (
        {
          ...s,
          specs: s.specs.map(patch(f))
        } as any
      );
  }
};

export interface Describe {
  (name: string, op: () => void): void;
}

export interface It {
  run: <A>(name: string, op: () => Promise<A>, timeout?: number) => void;
  skip: <A>(name: string, op: () => Promise<A>, timeout?: number) => void;
  todo: (name: string) => void;
}

export interface Runner {
  describe: Describe;
  it: It;
}
