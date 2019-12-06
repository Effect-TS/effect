import * as T from "./effect";
import { Suite } from "benchmark";

const MAX = 1e3;
const inc = (_: bigint) => _ + BigInt(1);

export const nestedMapEffect = (): T.Effect<T.NoEnv, never, bigint> => {
  let io: T.Effect<T.NoEnv, never, bigint> = T.pure(BigInt(0));
  for (let i = 0; i < MAX; i++) {
    io = T.effect.map(io, inc);
  }
  return io;
};

const benchmark = new Suite(`NestedMap ${MAX}`, { minTime: 10000 });

benchmark
  .add(
    "effect",
    (cb: any) => {
      T.run(nestedMapEffect(), () => {
        cb.resolve();
      });
    },
    { defer: true }
  )
  .on("cycle", function(event: any) {
    console.log(String(event.target));
  })
  .on("complete", function(this: any) {
    console.log(`Fastest is ${this.filter("fastest").map("name")}`);
  })
  .run({ async: true });
