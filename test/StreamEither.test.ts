import * as assert from "assert"

import { expect } from "chai"

import { effect as T, streamEither as S } from "../src"
import * as ex from "../src/Exit"
import { FunctionN, identity } from "../src/Function"
import { pipe } from "../src/Function"
import { none, some } from "../src/Option"

export async function expectExitIn<E, A, B>(
  ioa: T.AsyncRE<{}, E, A>,
  f: FunctionN<[ex.Exit<E, A>], B>,
  expected: B
): Promise<void> {
  const result = await T.runToPromiseExit(ioa)
  expect(assert.deepStrictEqual(f(result), expected))
}

export function expectExit<E, A>(
  ioa: T.AsyncRE<{}, E, A>,
  expected: ex.Exit<E, A>
): Promise<void> {
  return expectExitIn(ioa, identity, expected)
}

describe("StreamEither", () => {
  it("use chainError", async () => {
    const stream = pipe(
      S.encaseEffect(T.raiseError("error")),
      S.chainError((_) => S.encaseEffect(T.pure(100)))
    )

    const program = S.collectArray(stream)

    const res = await T.runToPromise(program)

    assert.deepStrictEqual(res, [100])
  })

  it("should use fromArray", async () => {
    const s = S.fromArray([0, 1, 2])

    const res = await T.runToPromise(S.collectArray(s))

    assert.deepStrictEqual(res, [0, 1, 2])
  })

  it("should use fromRange", async () => {
    const s = S.fromRange(0)

    const res = await T.runToPromise(S.collectArray(S.take(s, 3)))

    assert.deepStrictEqual(res, [0, 1, 2])
  })

  it("should use filterRefineWith", async () => {
    const s = S.fromRange(0)

    type Even = number & { _brand: "even" }

    function isEven(x: number): x is Even {
      return x % 2 === 0
    }

    const res = await T.runToPromise(
      S.collectArray(S.take(pipe(s, S.filterWith(isEven)), 3))
    )

    assert.deepStrictEqual(res, [0, 2, 4])
  })

  it("should use once", async () => {
    const s = S.once(0)

    const res = await T.runToPromise(S.collectArray(s))

    assert.deepStrictEqual(res, [0])
  })

  it("should use repeatedly", async () => {
    const s = S.repeatedly(0)

    const res = await T.runToPromise(S.collectArray(S.take(s, 3)))

    assert.deepStrictEqual(res, [0, 0, 0])
  })

  it("should use periodically", async () => {
    const s = S.periodically(10)

    const res = await T.runToPromise(S.collectArray(S.takeWhile(s, (n) => n < 10)))

    assert.deepStrictEqual(res, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it("should use empty", async () => {
    const s = S.empty

    const res = await T.runToPromise(S.collectArray(s))

    assert.deepStrictEqual(res, [])
  })

  it("should use raised", async () => {
    const s = S.raised("message")

    const res = await T.runToPromiseExit(S.collectArray(s))

    assert.deepStrictEqual(res, ex.raise("message"))
  })

  it("should use aborted", async () => {
    const s = S.aborted("message")

    const res = await T.runToPromiseExit(S.collectArray(s))

    assert.deepStrictEqual(res, ex.abort("message"))
  })

  it("should use fromOption - none", async () => {
    const s = S.fromOption(none)

    const res = await T.runToPromise(S.collectArray(s))

    assert.deepStrictEqual(res, [])
  })

  it("should use fromOption - some", async () => {
    const s = S.fromOption(some(1))

    const res = await T.runToPromise(S.collectArray(s))

    assert.deepStrictEqual(res, [1])
  })

  it("should use zipWithIndex", async () => {
    const s = S.zipWithIndex(S.fromArray([0, 1]))

    const res = await T.runToPromise(S.collectArray(s))

    assert.deepStrictEqual(res, [
      [0, 0],
      [1, 1]
    ])
  })

  it("should use map", async () => {
    const s = pipe(
      S.fromArray([0, 1, 2]),
      S.map((n) => n + 1)
    )

    const res = await T.runToPromise(S.collectArray(s))

    assert.deepStrictEqual(res, [1, 2, 3])
  })

  it("should use as", async () => {
    const s = S.as(S.fromArray([0]), 1)

    const res = await T.runToPromise(S.collectArray(s))

    assert.deepStrictEqual(res, [1])
  })

  it("should use filter", async () => {
    const s = S.filter(S.fromArray([0]), (n) => n > 0)

    const res = await T.runToPromise(S.collectArray(s))

    assert.deepStrictEqual(res, [])
  })

  it("should use filter - 2", async () => {
    const s = S.filter(S.fromArray([1]), (n) => n > 0)

    const res = await T.runToPromise(S.collectArray(s))

    assert.deepStrictEqual(res, [1])
  })

  it("should use filterWith", async () => {
    const s = pipe(
      S.fromArray([0]),
      S.filterWith((n) => n > 0)
    )

    const res = await T.runToPromise(S.collectArray(s))

    assert.deepStrictEqual(res, [])
  })

  it("should use zipWith", async () => {
    const sl = S.empty
    const sr = S.empty
    const z = S.zipWith(sl, sr, (l, r) => 0)

    const res = await T.runToPromise(S.collectArray(z))

    assert.deepStrictEqual(res, [])
  })

  it("should use zipWith - 2", async () => {
    const sl = S.fromArray([0, 1, 2])
    const sr = S.empty
    // tslint:disable-next-line: restrict-plus-operands
    const z = S.zipWith(sl, sr, (l, r) => l + r)

    const res = await T.runToPromise(S.collectArray(z))

    assert.deepStrictEqual(res, [])
  })

  it("should use concat", async () => {
    const s = S.concat(S.fromArray([0]), S.fromOption(some(1)))

    const res = await T.runToPromise(S.collectArray(s))

    assert.deepStrictEqual(res, [0, 1])
  })

  it("should use fromIteratorUnsafe", async () => {
    function makeRangeIterator(start = 0, end = Infinity, step = 1) {
      let nextIndex = start
      let iterationCount = 0

      const rangeIterator = {
        next() {
          let result: any
          if (nextIndex < end) {
            result = { value: nextIndex, done: false }
            nextIndex += step
            iterationCount++
            return result
          }
          return { value: iterationCount, done: true }
        }
      }
      return rangeIterator
    }

    const s = S.fromIteratorUnsafe(makeRangeIterator(1, 10, 2))

    const res = await T.runToPromise(S.collectArray(s))

    assert.deepStrictEqual(res, [1, 3, 5, 7, 9])
  })

  it("should use stream with environment", async () => {
    interface Config {
      initial: number
    }
    interface ConfigB {
      second: number
    }

    const a = S.encaseEffect(T.access(({ initial }: Config) => initial))
    const s = S.chain_(a, (n) => S.fromRange(n, 1, 10))

    const m = S.chain_(s, (n) =>
      S.encaseEffect(T.access(({ second }: ConfigB) => n + second))
    )

    const g = S.chain_(m, (n) => S.fromRange(0, 1, n))
    const r = S.collectArray(g)

    const res = await T.runToPromise(
      T.provide<Config & ConfigB>({
        initial: 1,
        second: 1
      })(r)
    )

    assert.deepStrictEqual(
      res,
      // prettier-ignore
      [ 0, 1, 0, 1, 2, 0, 1, 2, 3, 0, 1, 2
      , 3, 4, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3
      , 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 7, 0
      , 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3
      , 4, 5, 6, 7, 8, 9]
    )
  })

  it("should use stream with environment with pipe ", async () => {
    interface Config {
      initial: number
    }
    interface ConfigB {
      second: number
    }

    const a = S.encaseEffect(T.access(({ initial }: Config) => initial))
    const s = pipe(
      a,
      S.chain((n) => S.fromRange(n, 1, 10))
    )

    const m = pipe(
      s,
      S.chain((n) => S.encaseEffect(T.access(({ second }: ConfigB) => n + second)))
    )

    const g = pipe(
      m,
      S.chain((n) => S.fromRange(0, 1, n))
    )
    const r = S.collectArray(g)

    const res = await T.runToPromise(
      T.provide<Config & ConfigB>({
        initial: 1,
        second: 1
      })(r)
    )

    assert.deepStrictEqual(
      res,
      // prettier-ignore
      [ 0, 1, 0, 1, 2, 0, 1, 2, 3, 0, 1, 2
      , 3, 4, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3
      , 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 7, 0
      , 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3
      , 4, 5, 6, 7, 8, 9]
    )
  })
})
