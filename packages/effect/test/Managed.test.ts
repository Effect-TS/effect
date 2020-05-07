import * as assert from "assert"

import { Do } from "fp-ts-contrib/lib/Do"
import * as Ar from "fp-ts/lib/Array"
import { eqString } from "fp-ts/lib/Eq"
import { monoidSum } from "fp-ts/lib/Monoid"
import { semigroupSum } from "fp-ts/lib/Semigroup"
import { constVoid } from "fp-ts/lib/function"
import { pipe } from "fp-ts/lib/pipeable"

import { effect as T, managed as M, exit as Ex } from "../src"

describe("Managed", () => {
  it("should use resource encaseEffect", async () => {
    const resource = M.encaseEffect(T.pure(1))

    const result = await T.runToPromise(M.use(resource, (n) => T.pure(n + 1)))

    assert.deepStrictEqual(result, 2)
  })

  it("should hold to errors in chain", () => {
    const program = pipe(
      M.bracket(T.pure(0), () => T.raiseError("a")),
      M.chain((n) => M.bracket(T.pure(n + 1), () => T.raiseError("b"))),
      M.chain((n) => M.bracket(T.pure(n + 1), () => T.raiseError("c"))),
      M.consume(() => T.raiseAbort("d"))
    )

    const result = T.runSync(program)

    expect(result).toStrictEqual(
      Ex.withRemaining(Ex.abort("d"), Ex.raise("c"), Ex.raise("b"), Ex.raise("a"))
    )
  })

  it("should use resource encaseEffect with environment", async () => {
    const config = {
      test: 1
    }

    const resource = M.encaseEffect(
      T.accessM(({ test }: typeof config) => T.pure(test))
    )

    const result = await T.runToPromise(
      T.provide(config)(
        M.use(resource, (n) => T.accessM(({ test }: typeof config) => T.pure(n + test)))
      )
    )

    assert.deepStrictEqual(result, 2)
  })

  it("should use resource bracket", async () => {
    let released = false

    const resource = M.bracket(T.pure(1), () =>
      T.sync(() => {
        released = true
      })
    )

    const result = await T.runToPromise(M.use(resource, (n) => T.pure(n + 1)))

    assert.deepStrictEqual(result, 2)
    assert.deepStrictEqual(released, true)
  })

  it("should use resource pure", async () => {
    const resource = M.pure(1)

    const result = await T.runToPromise(M.use(resource, (n) => T.pure(n + 1)))

    assert.deepStrictEqual(result, 2)
  })

  it("should use resource suspend", async () => {
    const resource = M.suspend(T.sync(() => M.pure(1)))

    const result = await T.runToPromise(M.use(resource, (n) => T.pure(n + 1)))

    assert.deepStrictEqual(result, 2)
  })

  it("should use resource chain", async () => {
    const resource = M.pure(1)
    const chain = M.chain((n: number) => M.pure(n + 1))

    const result = await T.runToPromise(M.use(chain(resource), (n) => T.pure(n + 1)))

    assert.deepStrictEqual(result, 3)
  })

  it("should use resource map", async () => {
    const resource = M.pure(1)
    const mapped = M.managed.map(resource, (n) => n + 1)

    const result = await T.runToPromise(M.use(mapped, (n) => T.pure(n + 1)))

    assert.deepStrictEqual(result, 3)
  })

  it("should use resource mapWith", async () => {
    const resource = M.pure(1)
    const mapped = M.map((n: number) => n + 1)

    const result = await T.runToPromise(M.use(mapped(resource), (n) => T.pure(n + 1)))

    assert.deepStrictEqual(result, 3)
  })

  it("should use resource zip", async () => {
    const ma = M.pure(1)
    const mb = M.pure(1)
    const zip = M.zip(ma, mb)

    const result = await T.runToPromise(M.use(zip, ([n, m]) => T.pure(n + m)))

    assert.deepStrictEqual(result, 2)
  })

  describe("parZipWith", () => {
    let logMock: jest.SpyInstance<void, any[]>
    beforeEach(() => {
      logMock = jest.spyOn(console, "log").mockImplementation(constVoid)
    })
    afterEach(() => {
      logMock.mockRestore()
    })

    const sAllocStr = (type: "A" | "B") => `called alloc ${type}`
    const sDeallocStr = (type: "A" | "B") => `called de-alloc ${type}`
    const fAllocStr = (type: "A" | "B") => `fail alloc ${type}`
    const fDeallocStr = (type: "A" | "B") => `fail de-alloc ${type}`

    const sAllocEff = (type: "A" | "B", value: number) =>
      T.delay(
        T.sync(() => {
          console.log(sAllocStr(type))
          return value
        }),
        type === "B" ? 0 : 10
      )
    const fAllocEff = (type: "A" | "B") =>
      pipe(
        T.sync(() => {
          console.log(fAllocStr(type))
        }),
        T.chain(() => T.raiseError(fAllocStr(type))),
        T.liftDelay(type === "B" ? 0 : 10)
      )
    const sDeallocEff = (type: "A" | "B") =>
      T.delay(
        T.sync(() => {
          console.log(sDeallocStr(type))
        }),
        type === "B" ? 0 : 10
      )
    const fDeallocEff = (type: "A" | "B") =>
      pipe(
        T.sync(() => {
          console.log(fDeallocStr(type))
        }),
        T.chain(() => T.raiseError(fDeallocStr(type))),
        T.liftDelay(type === "B" ? 0 : 10)
      )

    const maSS = M.bracket(sAllocEff("A", 1), () => sDeallocEff("A"))
    const maSF = M.bracket(sAllocEff("A", 1), () => fDeallocEff("A"))
    const maFS = M.bracket(fAllocEff("A"), () => sDeallocEff("A"))
    const maFF = M.bracket(fAllocEff("A"), () => fDeallocEff("A"))

    const mbSS = M.bracket(sAllocEff("B", 2), () => sDeallocEff("B"))
    const mbSF = M.bracket(sAllocEff("B", 2), () => fDeallocEff("B"))
    const mbFS = M.bracket(fAllocEff("B"), () => sDeallocEff("B"))
    const mbFF = M.bracket(fAllocEff("B"), () => fDeallocEff("B"))

    function createTest<S>(
      title: string,
      ma: M.Managed<S, unknown, string, number>,
      mb: M.Managed<S, unknown, string, number>,
      expectCalls: string[],
      expectResult: Ex.Exit<string, number>
    ) {
      it(title, async () => {
        const strArrDiff = Ar.difference(Ar.getEq(eqString))
        const expectCalls_ = Ar.array.map(expectCalls, Ar.of)

        const zip = M.parZipWith(ma, mb, (n, m) => n + m)
        const result = await T.runToPromiseExit(M.use(zip, T.pure))

        expect(strArrDiff(logMock.mock.calls, expectCalls_)).toEqual([])
        expect(strArrDiff(expectCalls_, logMock.mock.calls)).toEqual([])
        assert.deepStrictEqual(result, expectResult)
      })
    }

    // region maSS
    createTest(
      "maSS mbSS",
      maSS,
      mbSS,
      [sAllocStr("A"), sDeallocStr("A"), sAllocStr("B"), sDeallocStr("B")],
      Ex.done(3)
    )
    createTest(
      "maSS mbSF",
      maSS,
      mbSF,
      [sAllocStr("A"), sDeallocStr("A"), sAllocStr("B"), fDeallocStr("B")],
      Ex.raise(fDeallocStr("B"))
    )
    createTest(
      "maSS mbFS",
      maSS,
      mbFS,
      [sAllocStr("A"), sDeallocStr("A"), fAllocStr("B")],
      Ex.raise(fAllocStr("B"))
    )
    createTest(
      "maSS mbFF",
      maSS,
      mbFF,
      [sAllocStr("A"), sDeallocStr("A"), fAllocStr("B")],
      Ex.raise(fAllocStr("B"))
    )
    // endregion

    // region maSF
    createTest(
      "maSF mbSS",
      maSF,
      mbSS,
      [sAllocStr("A"), fDeallocStr("A"), sAllocStr("B"), sDeallocStr("B")],
      Ex.raise(fDeallocStr("A"))
    )
    createTest(
      "maSF mbSF",
      maSF,
      mbSF,
      [sAllocStr("A"), fDeallocStr("A"), sAllocStr("B"), fDeallocStr("B")],
      Ex.raise(fDeallocStr("A"))
    )
    createTest(
      "maSF mbFS",
      maSF,
      mbFS,
      [sAllocStr("A"), fDeallocStr("A"), fAllocStr("B")],
      Ex.raise(fAllocStr("B"))
    )
    createTest(
      "maSF mbFF",
      maSF,
      mbFF,
      [sAllocStr("A"), fDeallocStr("A"), fAllocStr("B")],
      Ex.raise(fAllocStr("B"))
    )
    // endregion

    // region maFS
    createTest(
      "maFS mbSS",
      maFS,
      mbSS,
      [fAllocStr("A"), sAllocStr("B"), sDeallocStr("B")],
      Ex.raise(fAllocStr("A"))
    )
    createTest(
      "maFS mbSF",
      maFS,
      mbSF,
      [fAllocStr("A"), sAllocStr("B"), fDeallocStr("B")],
      Ex.raise(fAllocStr("A"))
    )
    createTest(
      "maFS mbFS",
      maFS,
      mbFS,
      [fAllocStr("A"), fAllocStr("B")],
      Ex.raise(fAllocStr("A"))
    )
    createTest(
      "maFS mbFF",
      maFS,
      mbFF,
      [fAllocStr("A"), fAllocStr("B")],
      Ex.raise(fAllocStr("A"))
    )
    // endregion

    // region maFF
    createTest(
      "maFF mbSS",
      maFF,
      mbSS,
      [fAllocStr("A"), sAllocStr("B"), sDeallocStr("B")],
      Ex.raise(fAllocStr("A"))
    )
    createTest(
      "maFF mbSF",
      maFF,
      mbSF,
      [fAllocStr("A"), sAllocStr("B"), fDeallocStr("B")],
      Ex.raise(fAllocStr("A"))
    )
    createTest(
      "maFF mbFS",
      maFF,
      mbFS,
      [fAllocStr("A"), fAllocStr("B")],
      Ex.raise(fAllocStr("A"))
    )
    createTest(
      "maFF mbFF",
      maFF,
      mbFF,
      [fAllocStr("A"), fAllocStr("B")],
      Ex.raise(fAllocStr("A"))
    )
    // endregion
  })

  it("should use resource ap", async () => {
    const ma = M.pure(1)
    const mfab = M.pure((n: number) => n + 1)
    const ap = M.managed.ap(mfab, ma)

    const result = await T.runToPromise(M.use(ap, (n) => T.pure(n + 1)))

    assert.deepStrictEqual(result, 3)
  })

  it("should use resource ap", async () => {
    const ma = M.pure(1)
    const mfab = M.pure((n: number) => n + 1)
    const ap = pipe(mfab, M.ap(ma))

    const result = await T.runToPromise(M.use(ap, (n) => T.pure(n + 1)))

    assert.deepStrictEqual(result, 3)
  })

  it("should use resource as", async () => {
    const ma = M.pure(1)
    const result = await T.runToPromise(M.use(M.as(ma, 2), (n) => T.pure(n + 1)))

    assert.deepStrictEqual(result, 3)
  })

  it("should use resource to", async () => {
    const ma = M.pure(1)
    const result = await T.runToPromise(M.use(M.to(2)(ma), (n) => T.pure(n + 1)))

    assert.deepStrictEqual(result, 3)
  })

  it("should use resource chainTap", async () => {
    const ma = M.pure(1)
    const mm = M.encaseEffect(T.sync(() => ({} as unknown)))
    const mb = M.chainTap(ma, (_) => mm)

    const result = await T.runToPromise(M.use(mb, (n) => T.pure(n + 1)))

    assert.deepStrictEqual(result, 2)
  })

  it("should use resource chainTapWith", async () => {
    const ma = M.pure(1)
    const mm = M.encaseEffect(T.sync(() => ({} as unknown)))
    const mb = M.chainTapWith((_: number) => mm)

    const result = await T.runToPromise(M.use(mb(ma), (n) => T.pure(n + 1)))

    assert.deepStrictEqual(result, 2)
  })

  it("should use resource allocate", async () => {
    let released = false

    const program = Do(T.effect)
      .bindL("resource", () =>
        M.allocate(
          M.bracket(T.pure(1), () =>
            T.sync(() => {
              released = true
            })
          )
        )
      )
      .bindL("result", ({ resource }) => T.pure(resource.a + 1))
      .doL(({ resource }) => resource.release)
      .return(({ result }) => result)

    const result = await T.runToPromise(program)

    assert.deepStrictEqual(result, 2)
    assert.deepStrictEqual(released, true)
  })

  it("should use resource consume", async () => {
    const resource = M.pure(1)
    const mapped = M.consume((n: number) => T.pure(n + 1))

    const result = await T.runToPromise(
      T.effect.chain(mapped(resource), (n) => T.pure(n + 1))
    )

    assert.deepStrictEqual(result, 3)
  })

  it("should use resource provide", async () => {
    const resourceA = M.pure({ n: 1 })
    const program = T.access(({ n }: { n: number }) => n + 1)

    const result = await T.runToPromise(M.provide(resourceA)(program))

    assert.deepStrictEqual(result, 2)
  })

  it("should use resource of", async () => {
    const resourceA = M.managed.of(1)

    const result = await T.runToPromise(M.use(resourceA, (n) => T.pure(n + 1)))

    assert.deepStrictEqual(result, 2)
  })

  it("should use resource getSemigroup", async () => {
    const S = M.getSemigroup(semigroupSum)

    const resourceA = M.managed.of(1)
    const resourceB = M.managed.of(1)

    const result = await T.runToPromise(
      M.use(S.concat(resourceB, resourceA), (n) => T.pure(n + 1))
    )

    assert.deepStrictEqual(result, 3)
  })

  it("should use resource getMonoid", async () => {
    const S = M.getMonoid(monoidSum)

    const resourceA = M.managed.of(1)
    const resourceB = M.managed.of(1)

    const result = await T.runToPromise(
      M.use(S.concat(resourceB, resourceA), (n) => T.pure(n + 1))
    )

    assert.deepStrictEqual(result, 3)
  })
})
