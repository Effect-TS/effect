import * as P from "./";
import * as T from "../src";
import { pipe } from "fp-ts/lib/pipeable";

interface Math {
  add: (x: number, y: number) => P.Sem<number>;
}

interface Program {
  addOne: (x: number) => P.Sem<number>;
}

const Math = P.interpret<T.NoEnv, Math>(_ => ({
  add: (x, y) => T.sync(() => x + y)
}));

const Program = P.interpret<Math, Program>(({ add }) => ({
  addOne: x => add(x, 1)
}));

const runAll = <A>(
  ma: T.Effect<P.Interpretation<Program>, never, A>
): T.Effect<T.NoEnv, never, A> =>
  pipe(ma, T.provideM(Program), T.provideM(Math), T.provideAll({}));

T.run(
  runAll(T.accessM(({ addOne }: P.Interpretation<Program>) => addOne(1))),
  e => {
    console.log(e);
  }
);
