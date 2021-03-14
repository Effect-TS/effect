import "@effect-ts/tracing-utils/Enable"

import { pretty } from "../src/Cause"
import * as T from "../src/Effect"
import { assertsFailure } from "../src/Exit"
import { prettyTrace } from "../src/Fiber"
import { pipe } from "../src/Function"
import { tag } from "../src/Has"

describe("Tracing", () => {
  it("should trace andThen", async () => {
    const result = await T.runPromiseExit(
      pipe(
        T.effectTotal(() => 0),
        T.andThen(T.effectTotal(() => 1)),
        T.andThen(T.effectTotal(() => 2)),
        T.andThen(T.fail("error"))
      )
    )

    assertsFailure(result)
    const cause = pretty(result.cause)
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:17:25")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:17:18")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:16:32")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:16:18")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:15:32")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:15:18")
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

    expect(cause).toContain(
      "a future continuation at (@effect-ts/system/test): test/tracing.test.ts:85:23"
    )
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:85:77")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:85:56")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:85:35")
  })
  it("should trace tuple", async () => {
    const exit = await T.runPromiseExit(T.tuple(T.succeed(0), T.succeed(1), T.fail(0)))

    assertsFailure(exit)
    const cause = pretty(exit.cause)

    expect(cause).toContain(
      "a future continuation at (@effect-ts/system/test): test/tracing.test.ts:99:48"
    )
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:99:83")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:99:72")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:99:58")
  })
  it("should trace tuplePar", async () => {
    const exit = await T.runPromiseExit(
      T.tuplePar(T.succeed(0), T.succeed(1), T.fail(0))
    )

    assertsFailure(exit)
    const cause = pretty(exit.cause)

    expect(cause).toContain(
      "a future continuation at (@effect-ts/system/test): test/tracing.test.ts:113:17"
    )
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:113:52")
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

    expect(cause).toContain(
      "a future continuation at (@effect-ts/system/test): test/tracing.test.ts:126:21"
    )
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:129:27")
  })
  it("should trace pipe operator", async () => {
    const result = await T.runPromiseExit(
      T.effectTotal(() => 0)
        ["|>"](T.andThen(T.effectTotal(() => 1)))
        ["|>"](T.andThen(T.effectTotal(() => 2)))
        ["|>"](T.andThen(T.fail("error")))
    )

    assertsFailure(result)
    const cause = pretty(result.cause)
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:146:32")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:146:25")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:145:39")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:145:25")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:144:39")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:144:25")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:143:20")
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

    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:165:26")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:163:18")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:162:16")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:161:20")
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

    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:191:37")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:191:23")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:190:18")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:192:41")
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

    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:214:33")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:214:19")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:215:34")
  })
  it("should trace delay", async () => {
    const result = await T.runPromiseExit(
      T.delay(10)(T.succeed(0))["|>"](T.chain(() => T.fail(0)))
    )

    assertsFailure(result)
    const cause = pretty(result.cause)

    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:228:59")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:228:46")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:228:28")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:228:14")
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
        ["|>"](T.andThen(T.fail("ok")))
        ["|>"](T.provideAll({ n: 1 }))
    )

    assertsFailure(result)
    const cause = pretty(result.cause)

    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:248:32")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:248:25")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:241:21")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:249:28")
  })
  it("should trace collectAllParN", async () => {
    const result = await T.runPromiseExit(
      [T.succeed(0), T.succeed(1), T.fail("ok")]["|>"](T.collectAllParN(2))
    )

    assertsFailure(result)
    const cause = pretty(result.cause)

    expect(cause).toContain(
      "a future continuation at (@effect-ts/system/test): test/tracing.test.ts:262:72"
    )
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:262:42")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:262:31")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:262:17")
  })
  it("should trace filter", async () => {
    const result = await T.runPromiseExit(
      [0, 1, 2]["|>"](T.filter((k) => (k > 1 ? T.fail("ok") : T.succeed(true))))
    )

    assertsFailure(result)
    const cause = pretty(result.cause)

    expect(cause).toContain(
      "a future continuation at (@effect-ts/system/test): test/tracing.test.ts:277:31"
    )
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:277:54")
    expect(cause).toContain("(@effect-ts/system/test): test/tracing.test.ts:277:72")
  })
})
