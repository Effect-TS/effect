import * as wave from "waveguide/lib/wave";
import * as T from "../src/effect";
// @ts-ignore
import ben from "nodemark";

import { Suite } from "benchmark";

const MAX = 1e4;

const waveMapper = (_: bigint) => wave.pure(_ + BigInt(1));
const effectMapper = (_: bigint) => T.pure(_ + BigInt(1));

export const nestedChainWave = (): wave.Wave<never, bigint> => {
  let io: wave.Wave<never, bigint> = wave.pure(BigInt(0));
  for (let i = 0; i < MAX; i++) {
    io = wave.chain(io, waveMapper);
  }
  return io;
};

export const nestedChainEffect = (): T.Effect<T.NoEnv, never, bigint> => {
  let io: T.Effect<T.NoEnv, never, bigint> = T.pure(BigInt(0));
  for (let i = 0; i < MAX; i++) {
    io = T.effect.chain(io, effectMapper);
  }
  return io;
};

const benchmark = new Suite(`NestedChain ${MAX}`);

benchmark
  .add(
    "effect",
    (cb: any) => {
      T.run(nestedChainEffect(), () => {
        cb.resolve();
      });
    },
    { defer: true }
  )
  .add(
    "wave",
    (cb: any) => {
      wave.run(nestedChainWave(), () => {
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
