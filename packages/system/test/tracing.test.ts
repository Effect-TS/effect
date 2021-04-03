import "../src/Tracing/Enable"

import { pretty } from "../src/Cause"
import * as T from "../src/Effect"
import { assertsFailure } from "../src/Exit"
import { prettyTrace } from "../src/Fiber"
import { pipe } from "../src/Function"
import { tag } from "../src/Has"

describe("Tracing", () => {
  it("should trace zipRight", async () => {
    const result = await T.runPromiseExit(
      pipe(
        T.effectTotal(() => 0),
        T.zipRight(T.effectTotal(() => 1)),
        T.zipRight(T.effectTotal(() => 2)),
        T.zipRight(T.fail("error"))
      )
    )

    assertsFailure(result)
    const cause = pretty(result.cause)
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:17:26")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:17:19")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:16:33")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:16:19")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:15:33")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:15:19")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:14:22")
  })
  it("should trace bracket", async () => {
    const result = await T.runPromiseExit(
      pipe(
        T.effectTotal(() => 0),
        T.bracket(
          (n) => T.fail(`error ${n}`),
          () => T.die("error release")
        )
      )
    )

    assertsFailure(result)
    const cause = pretty(result.cause)
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:37:22")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:36:24")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:35:18")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:34:22")
    expect(cause).toContain("error 0")
    expect(cause).toContain("error release")
  })
  it("should trace eventually", async () => {
    let n = 0
    const [res, trace] = await T.runPromise(
      pipe(
        T.suspend(() => {
          if (n > 2) {
            return T.succeed(n)
          } else {
            return T.fail(n++)
          }
        }),
        T.eventually,
        T.zip(T.trace)
      )
    )
    expect(res).toEqual(3)
    const cause = prettyTrace(trace).matchAll(
      new RegExp("\\(@effect-ts/system/test\\): (.*)", "g")
    )
    expect(Array.from(cause).map((s) => s[1])).toEqual([
      "test/tracing.test.ts:63:14",
      "test/tracing.test.ts:57:29",
      "test/tracing.test.ts:55:18",
      "test/tracing.test.ts:59:26",
      "test/tracing.test.ts:55:18",
      "test/tracing.test.ts:59:26",
      "test/tracing.test.ts:55:18",
      "test/tracing.test.ts:62:21",
      "test/tracing.test.ts:59:26",
      "test/tracing.test.ts:55:18"
    ])
  })
  it("should trace firstSuccessOf", async () => {
    const exit = await T.runPromiseExit(
      T.firstSuccessOf([T.failWith(() => 0), T.failWith(() => 1), T.failWith(() => 2)])
    )

    assertsFailure(exit)
    const cause = pretty(exit.cause)

    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:85:77")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:85:56")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:85:35")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:85:23")
  })
  it("should trace tuple", async () => {
    const exit = await T.runPromiseExit(T.tuple(T.succeed(0), T.succeed(1), T.fail(0)))

    assertsFailure(exit)
    const cause = pretty(exit.cause)

    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:97:83")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:97:72")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:97:58")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:97:48")
  })
  it("should trace tuplePar", async () => {
    const exit = await T.runPromiseExit(
      T.tuplePar(T.succeed(0), T.succeed(1), T.fail(0))
    )

    assertsFailure(exit)
    const cause = pretty(exit.cause)

    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:109:52")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:109:17")
  })
  it("should trace tupleParN", async () => {
    const exit = await T.runPromiseExit(
      T.tupleParN(2)(
        T.delay(10)(T.succeed(0)),
        T.delay(10)(T.succeed(1)),
        T.delay(10)(T.fail(0))
      )
    )

    assertsFailure(exit)
    const cause = pretty(exit.cause)

    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:123:27")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:123:16")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:121:30")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:121:16")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:120:21")
  })
  it("should trace pipe operator", async () => {
    const result = await T.runPromiseExit(
      T.effectTotal(() => 0)
        ["|>"](T.zipRight(T.effectTotal(() => 1)))
        ["|>"](T.zipRight(T.effectTotal(() => 2)))
        ["|>"](T.zipRight(T.fail("error")))
    )

    assertsFailure(result)
    const cause = pretty(result.cause)

    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:141:33")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:141:26")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:140:40")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:140:26")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:139:40")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:139:26")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:138:20")
  })
  it("should trace condM", async () => {
    const result = await T.runPromiseExit(
      T.effectTotal(() => false)["|>"](
        T.chain(
          T.condM(
            T.effectTotal(() => 0),
            T.effectTotal(() => 1)
          )
        )
      )
    )

    assertsFailure(result)
    const cause = pretty(result.cause)

    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:161:26")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:159:18")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:158:16")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:157:20")
  })
  it("should trace derived access", async () => {
    interface Service {
      _tag: "Service"
      value: number
    }

    const Service = tag<Service>()

    const { value: accessValue } = T.deriveAccess(Service)(["value"])

    const result = await T.runPromiseExit(
      accessValue((n) => n + 1)
        ["|>"](T.chain((n) => T.fail(n)))
        ["|>"](T.provideService(Service)({ _tag: "Service", value: 0 }))
    )

    assertsFailure(result)
    const cause = pretty(result.cause)

    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:187:37")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:187:23")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:186:18")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:188:41")
  })
  it("should trace derived accessM", async () => {
    interface Service {
      _tag: "Service"
      value: number
    }

    const Service = tag<Service>()

    const { value: accessValueM } = T.deriveAccessM(Service)(["value"])

    const result = await T.runPromiseExit(
      accessValueM((n) => T.fail(n + 1))["|>"](
        T.provideService(Service)({ _tag: "Service", value: 0 })
      )
    )

    assertsFailure(result)
    const cause = pretty(result.cause)

    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:210:33")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:210:19")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:211:34")
  })
  it("should trace delay", async () => {
    const result = await T.runPromiseExit(
      T.delay(10)(T.succeed(0))["|>"](T.chain(() => T.fail(0)))
    )

    assertsFailure(result)
    const cause = pretty(result.cause)

    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:224:59")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:224:46")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:224:28")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:224:14")
  })
  it("should trace effectAsyncM", async () => {
    const result = await T.runPromiseExit(
      T.effectAsyncM((cb: T.Cb<T.UIO<number>>) =>
        T.accessM((_: { n: number }) =>
          T.effectTotal(() => {
            cb(T.succeed(_.n))
          })
        )
      )
        ["|>"](T.zipRight(T.fail("ok")))
        ["|>"](T.provideAll({ n: 1 }))
    )

    assertsFailure(result)
    const cause = pretty(result.cause)

    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:244:33")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:244:26")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:237:21")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:245:28")
  })
  it("should trace collectAllParN", async () => {
    const result = await T.runPromiseExit(
      [T.succeed(0), T.succeed(1), T.fail("ok")]["|>"](T.collectAllParN(2))
    )

    assertsFailure(result)
    const cause = pretty(result.cause)

    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:258:42")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:258:31")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:258:17")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:258:72")
  })
  it("should trace filter", async () => {
    const result = await T.runPromiseExit(
      [0, 1, 2]["|>"](T.filter((k) => (k > 1 ? T.fail("ok") : T.succeed(true))))
    )

    assertsFailure(result)
    const cause = pretty(result.cause)

    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:271:54")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:271:72")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:271:72")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:271:31")
  })
  it("should trace filterOrElse", async () => {
    const result = await T.runPromiseExit(
      T.succeed("no" as "ok" | "no")["|>"](
        T.filterOrElse((a): a is "ok" => a === "ok", T.fail)
      )
    )

    assertsFailure(result)
    const cause = pretty(result.cause)

    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:285:60")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:285:23")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:284:16")
  })
  it("should trace gen", async () => {
    const result = await T.runPromiseExit(
      T.gen(function* (_) {
        const x = yield* _(T.succeed(0))
        const y = yield* _(T.succeed(1))

        return `${x} - ${y}`
      })["|>"](T.chain(T.fail))
    )

    assertsFailure(result)
    const cause = pretty(result.cause)

    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:303:30")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:303:23")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:300:37")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:300:27")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:299:37")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:299:27")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:298:12")
  })
  it("pipe should not break with comments and new lines", async () => {
    const double = (n: number) => n * 2
    const f = pipe(
      // comment here
      T.effectTotal(() => 1),
      // then double it
      T.map((v) => {
        return pipe(
          // comment here
          v,
          // double the value
          double
        )
      })
      // final comment
    )

    const res = await T.runPromise(f)
    expect(res).toEqual(2)
  })
  it("should trace stack", async () => {
    const result = await T.runPromiseExit(
      pipe(
        T.fail(0),
        T.zipRight(T.succeed(0)),
        T.zipRight(T.succeed(1)),
        T.zipRight(T.succeed(2))
      )
    )

    assertsFailure(result)
    const cause = pretty(result.cause)

    expect(cause).toContain(
      "a future continuation at (@effect-ts/system/test): test/tracing.test.ts:341:19"
    )
    expect(cause).toContain(
      "a future continuation at (@effect-ts/system/test): test/tracing.test.ts:342:19"
    )
    expect(cause).toContain(
      "a future continuation at (@effect-ts/system/test): test/tracing.test.ts:343:19"
    )
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:340:15")
  })
  it("trace forEach", async () => {
    const result = await T.runPromiseExit(
      pipe(
        [0, 1, 2],
        T.forEach((n) => T.succeed(n + 1)),
        T.chain(T.fail)
      )
    )

    assertsFailure(result)
    const cause = pretty(result.cause)

    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:366:23")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:366:16")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:365:35")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:365:35")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:365:35")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:365:18")
  })
})
