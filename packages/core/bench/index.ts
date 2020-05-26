import { QIO, defaultRuntime } from "@qio/core"
import { Suite } from "benchmark"
import * as wave from "waveguide/lib/wave"

import * as T from "../build/Effect"
import { pipe } from "../build/Pipe"

export const fibPromise = async (n: bigint): Promise<bigint> => {
  if (n < BigInt(2)) {
    return await Promise.resolve(BigInt(1))
  }

  const a = await fibPromise(n - BigInt(1))
  const b = await fibPromise(n - BigInt(2))

  return a + b
}

export const fib = (n: bigint): bigint => {
  if (n < BigInt(2)) {
    return BigInt(1)
  }

  return fib(n - BigInt(1)) + fib(n - BigInt(2))
}

export const fibWave = (n: bigint): wave.Wave<never, bigint> => {
  if (n < BigInt(2)) {
    return wave.pure(BigInt(1))
  }
  return wave.chain(fibWave(n - BigInt(1)), (a) =>
    wave.map(fibWave(n - BigInt(2)), (b) => a + b)
  )
}

export const fibQio = (n: bigint): QIO<bigint> => {
  if (n < BigInt(2)) {
    return QIO.resolve(BigInt(1))
  }
  return QIO.chain(fibQio(n - BigInt(1)), (a) =>
    QIO.map(fibQio(n - BigInt(2)), (b) => a + b)
  )
}

export const fibEffect = (n: bigint): T.Sync<bigint> => {
  if (n < BigInt(2)) {
    return T.pure(BigInt(1))
  }
  return T.chain_(fibEffect(n - BigInt(1)), (a) =>
    T.map_(fibEffect(n - BigInt(2)), (b) => a + b)
  )
}

export const fibEffectPipe = (n: bigint): T.Sync<bigint> => {
  if (n < BigInt(2)) {
    return T.pure(BigInt(1))
  }

  return pipe(
    fibEffect(n - BigInt(2)),
    T.zip(fibEffect(n - BigInt(1))),
    T.map(([a,b]) => a + b)
  )
}

const n = BigInt(10)

const benchmark = new Suite("Fibonacci", { minTime: 10000 })

benchmark
  .add(
    "qio",
    (cb: any) => {
      defaultRuntime().unsafeExecute(fibQio(n), () => {
        cb.resolve()
      })
    },
    { defer: true }
  )
  .add(
    "wave",
    (cb: any) => {
      wave.run(fibWave(n), () => {
        cb.resolve()
      })
    },
    { defer: true }
  )
  .add(
    "promise",
    (cb: any) => {
      fibPromise(n).then(() => {
        cb.resolve()
      })
    },
    { defer: true }
  )
  .add(
    "native",
    (cb: any) => {
      fib(n)
      cb.resolve()
    },
    { defer: true }
  )
  .add(
    "effect",
    (cb: any) => {
      T.run(fibEffect(n), () => {
        cb.resolve()
      })
    },
    { defer: true }
  )
  .add(
    "effectPipe",
    (cb: any) => {
      T.run(fibEffectPipe(n), () => {
        cb.resolve()
      })
    },
    { defer: true }
  )
  .on("cycle", function (event: any) {
    console.log(String(event.target))
  })
  .on("complete", function (this: any) {
    console.log(`Fastest is ${this.filter("fastest").map("name")}`)
  })
  .run({ async: true })
