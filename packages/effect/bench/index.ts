import * as wave from "waveguide/lib/wave";
import * as T from "../src/effect";
// @ts-ignore
import ben from "nodemark";
import { Lazy } from "fp-ts/lib/function";

export const fibPromise = async (n: bigint): Promise<bigint> => {
  if (n < BigInt(2)) {
    return await Promise.resolve(BigInt(1));
  }

  const a = await fibPromise(n - BigInt(1));
  const b = await fibPromise(n - BigInt(2));

  return a + b;
};

export const fib = (n: bigint): bigint => {
  if (n < BigInt(2)) {
    return BigInt(1);
  }

  return fib(n - BigInt(1)) + fib(n - BigInt(2));
};

export const fibWave = (n: bigint): wave.Wave<never, bigint> => {
  if (n < BigInt(2)) {
    return wave.pure(BigInt(1));
  }
  return wave.chain(fibWave(n - BigInt(1)), a =>
    wave.map(fibWave(n - BigInt(2)), b => a + b)
  );
};

export const fibEffect = (n: bigint): T.Effect<T.NoEnv, never, bigint> => {
  if (n < BigInt(2)) {
    return T.pure(BigInt(1));
  }
  return T.effect.chain(fibEffect(n - BigInt(1)), a =>
    T.effect.map(fibEffect(n - BigInt(2)), b => a + b)
  );
};

const n = BigInt(10);

ben((cb: Lazy<void>) => {
  T.run(fibEffect(n), () => {
    cb();
  });
}).then((r: any) => {
  console.log("effect: ", r);

  ben((cb: Lazy<void>) => {
    wave.run(fibWave(n), () => {
      cb();
    });
  }).then((r: any) => {
    console.log("wave: ", r);

    ben((cb: Lazy<void>) => {
      fibPromise(n).then(() => {
        cb();
      });
    }).then((r: any) => {
      console.log("promise: ", r);
    });

    ben((cb: Lazy<void>) => {
      fib(n);
      cb();
    }).then((r: any) => {
      console.log("native: ", r);
    });
  });
});
