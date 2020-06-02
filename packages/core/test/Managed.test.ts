import * as assert from "assert"

import { effect as T, exit as Ex, managed as M } from "../src"
import { monoidSum } from "../src/Monoid"
import { pipe } from "../src/Pipe"
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
