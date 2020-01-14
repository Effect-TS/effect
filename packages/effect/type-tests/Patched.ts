import * as F from "../src/freeEnv";
import * as T from "../src/effect";

export interface Test {
  c: T.Effect<T.NoEnv, string, number>;
  fp: <A>(a: A) => T.Effect<T.NoEnv, string, A>;
  fm: (n: number) => T.Effect<T.NoEnv, never, void>;
}

export const testEnv = Symbol();

export interface WithTest {
  [testEnv]: Test;
}

export const testM = F.define<WithTest>({
  [testEnv]: {
    fp: F.fn(),
    fm: F.fn(),
    c: F.cn()
  }
});

export const {
  [testEnv]: { fp, fm, c }
} = F.access(testM);
