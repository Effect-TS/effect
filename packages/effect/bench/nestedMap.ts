import * as wave from "waveguide/lib/wave";
import * as T from "../lib/effect";
import { QIO, defaultRuntime } from "@qio/core";
import { Suite } from "benchmark";

const MAX = 1e3;

const inc = (_: bigint) => _ + BigInt(1);

export const nestedMapWave = (): wave.Wave<never, bigint> => {
  let io: wave.Wave<never, bigint> = wave.pure(BigInt(0));
  for (let i = 0; i < MAX; i++) {
    io = wave.map(io, inc);
  }
  return io;
};

export const nestedMapQio = (): QIO<bigint> => {
  let io: QIO<bigint> = QIO.resolve(BigInt(0));
  for (let i = 0; i < MAX; i++) {
    io = QIO.map(io, inc);
  }
  return io;
};

export const nestedMapEffect = (): T.Sync<bigint> => {
  let io: T.Sync<bigint> = T.pure(BigInt(0));
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
  .add(
    "wave",
    (cb: any) => {
      wave.run(nestedMapWave(), () => {
        cb.resolve();
      });
    },
    { defer: true }
  )
  .add(
    "qio",
    (cb: any) => {
      defaultRuntime().unsafeExecute(nestedMapQio(), () => {
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
