import * as assert from "assert"

import { effect as T, exit as Ex, managed as M } from "../src"
import * as Ar from "../src/Array"
import { eqString } from "../src/Eq"
import { constVoid } from "../src/Function"
import { pipe } from "../src/Function"
import { monoidSum } from "../src/Monoid"
import { semigroupSum } from "../src/Semigroup"

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
      Ex.combinedCause(Ex.abort("d"))(Ex.raise("c"), Ex.raise("b"), Ex.raise("a"))
    )
  })

  it("should use resource allocate", async () => {
    let released = false

    const program = T.Do()
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
  it("should use resource leaked", async () => {
    let released = false

    const program = T.Do()
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
      .return(({ resource }) => resource.release)

    const release = await T.runToPromise(program)

    assert.deepStrictEqual(released, false)

    await T.runToPromise(release)

    assert.deepStrictEqual(released, true)
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
        const expectCalls_ = Ar.array.map(Ar.of)(expectCalls)

        const zip = M.parZipWith_(ma, mb, (n, m) => n + m)
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
      Ex.combinedCause(Ex.raise(fDeallocStr("A")))(Ex.raise(fDeallocStr("B")))
    )
    createTest(
      "maSF mbFS",
      maSF,
      mbFS,
      [sAllocStr("A"), fDeallocStr("A"), fAllocStr("B")],
      Ex.combinedCause(Ex.raise(fAllocStr("B")))(Ex.raise(fDeallocStr("A")))
    )
    createTest(
      "maSF mbFF",
      maSF,
      mbFF,
      [sAllocStr("A"), fDeallocStr("A"), fAllocStr("B")],
      Ex.combinedCause(Ex.raise(fAllocStr("B")))(Ex.raise(fDeallocStr("A")))
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
      Ex.combinedCause(Ex.raise(fAllocStr("A")))(Ex.raise(fDeallocStr("B")))
    )
    createTest(
      "maFS mbFS",
      maFS,
      mbFS,
      [fAllocStr("A"), fAllocStr("B")],
      Ex.combinedCause(Ex.raise(fAllocStr("A")))(Ex.raise(fAllocStr("B")))
    )
    createTest(
      "maFS mbFF",
      maFS,
      mbFF,
      [fAllocStr("A"), fAllocStr("B")],
      Ex.combinedCause(Ex.raise(fAllocStr("A")))(Ex.raise(fAllocStr("B")))
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
      Ex.combinedCause(Ex.raise(fAllocStr("A")))(Ex.raise(fDeallocStr("B")))
    )
    createTest(
      "maFF mbFS",
      maFF,
      mbFS,
      [fAllocStr("A"), fAllocStr("B")],
      Ex.combinedCause(Ex.raise(fAllocStr("A")))(Ex.raise(fAllocStr("B")))
    )
    createTest(
      "maFF mbFF",
      maFF,
      mbFF,
      [fAllocStr("A"), fAllocStr("B")],
      Ex.combinedCause(Ex.raise(fAllocStr("A")))(Ex.raise(fAllocStr("B")))
    )
    // endregion
  })

  it("should hold to errors in chain & handle them", () => {
    const program = pipe(
      M.bracket(T.pure(0), () => T.raiseError("a")),
      M.chain((n) => M.bracket(T.pure(n + 1), () => T.raiseError("b"))),
      M.chain((n) => M.bracket(T.pure(n + 1), () => T.raiseError("c"))),
      M.consume(() => T.raiseAbort("d")),
      T.chainCause(
        Ex.ifAll((x) => Ex.isCause(x) || Ex.isAbort(x))((_) => T.pure(1), T.completed)
      )
    )

    const result = T.runSync(program)

    expect(result).toStrictEqual(Ex.done(1))
  })

  it("should use resource encaseEffect with environment", async () => {
    const config = {
      test: 1
    }

    const resource = pipe(
      M.encaseEffect(T.accessM(({ test }: typeof config) => T.pure(test))),
      M.useProvider(T.provide(config))
    )

    const result = await T.runToPromise(M.use(resource, (n) => T.pure(n + 1)))

    assert.deepStrictEqual(result, 2)
  })

  it("should use nested env", async () => {
    const program = pipe(
      M.pure(1),
      M.chain((n) =>
        M.bracket(
          T.access(({ s }: { s: number }) => n + s),
          () => T.unit
        )
      ),
      M.consume(T.pure)
    )

    const res = await pipe(program, T.provide({ s: 2 }), T.runToPromiseExit)

    assert.deepStrictEqual(res, Ex.done(3))
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
    const mapped = pipe(
      resource,
      M.managed.map((n) => n + 1)
    )

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

  it("should use resource ap", async () => {
    const ma = M.pure(1)
    const mfab = M.pure((n: number) => n + 1)
    const ap = M.managed.ap(ma)(mfab)

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
    const mb = M.chainTap_(ma, (_) => mm)

    const result = await T.runToPromise(M.use(mb, (n) => T.pure(n + 1)))

    assert.deepStrictEqual(result, 2)
  })

  it("should use resource chainTapWith", async () => {
    const ma = M.pure(1)
    const mm = M.encaseEffect(T.sync(() => ({} as unknown)))
    const mb = M.chainTap((_: number) => mm)

    const result = await T.runToPromise(M.use(mb(ma), (n) => T.pure(n + 1)))

    assert.deepStrictEqual(result, 2)
  })

  it("should use resource consume", async () => {
    const resource = M.pure(1)
    const mapped = M.consume((n: number) => T.pure(n + 1))

    const result = await T.runToPromise(
      T.chain_(mapped(resource), (n) => T.pure(n + 1))
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
