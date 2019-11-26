import * as T from "./";
import { Do } from "fp-ts-contrib/lib/Do";
import * as A from "fp-ts/lib/Array";
import { pipe } from "fp-ts/lib/pipeable";

type Config = {
  env: string;
};

const program = Do(T.effectMonad)
  .bindL("a", () => T.accessM(({ env }: Config) => T.sync(() => `${env}: 0`)))
  .bindL("b", () =>
    T.provide({ env: "yes" } as Config)(
      T.accessM(({ env }: Config) => T.sync(() => `${env}: 1`))
    )
  )
  .return(s => s.a + " " + s.b);

/*const program = T.withEnvironment(({ env }: Config) =>
  pipe(
    A.array.traverse(T.Stack)(A.range(0, 50000), n =>
      T.sync(() => `${env}: ${n}`)
    ),
    T.mapWith(a => a.length)
  )
);*/

T.runToPromiseExit(T.provide({ env: "ok" } as Config)(program)).then(r => {
  console.log(r);
});
