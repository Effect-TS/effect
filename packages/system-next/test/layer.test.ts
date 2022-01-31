import * as C from "../src/collection/immutable/Chunk"
import { Tuple } from "../src/collection/immutable/Tuple"
import { constFalse, constTrue, identity, pipe } from "../src/data/Function"
import type { Has } from "../src/data/Has"
import { tag } from "../src/data/Has"
import { Effect } from "../src/io/Effect"
import * as Fiber from "../src/io/Fiber"
import { Layer } from "../src/io/Layer"
import { Managed } from "../src/io/Managed"
import * as Promise from "../src/io/Promise"
import * as Ref from "../src/io/Ref"

// -----------------------------------------------------------------------------
// Service 1
// -----------------------------------------------------------------------------

const Service1Id = Symbol.for("tests/layer/Service1")

class Service1Impl {
  readonly [Service1Id] = Service1Id
  get one(): Effect<unknown, never, number> {
    return Effect.succeedNow(1)
  }
}

const Service1 = tag<Service1Impl>(Service1Id)

// -----------------------------------------------------------------------------
// Service 2
// -----------------------------------------------------------------------------

const Service2Id = Symbol.for("tests/layer/Service2")

class Service2Impl {
  readonly [Service2Id] = Service2Id
  get two(): Effect<unknown, never, number> {
    return Effect.succeedNow(2)
  }
}

const Service2 = tag<Service2Impl>(Service2Id)

// -----------------------------------------------------------------------------
// Service 3
// -----------------------------------------------------------------------------

const Service3Id = Symbol.for("tests/layer/Service3")

class Service3Impl {
  readonly [Service3Id] = Service3Id
  get three(): Effect<unknown, never, number> {
    return Effect.succeedNow(3)
  }
}

const Service3 = tag<Service3Impl>(Service3Id)

// -----------------------------------------------------------------------------
// Ref
// -----------------------------------------------------------------------------

function makeRef(): Effect<unknown, never, Ref.Ref<C.Chunk<string>>> {
  return Ref.make(C.empty())
}

// -----------------------------------------------------------------------------
// Layers
// -----------------------------------------------------------------------------

const acquire1 = "Acquiring Module 1"
const acquire2 = "Acquiring Module 2"
const acquire3 = "Acquiring Module 3"
const release1 = "Releasing Module 1"
const release2 = "Releasing Module 2"
const release3 = "Releasing Module 3"

function makeLayer1(
  ref: Ref.Ref<C.Chunk<string>>
): Layer<unknown, never, Has<Service1Impl>> {
  return Layer.fromManaged(Service1)(
    Managed.acquireReleaseWith(
      Ref.update_(ref, C.append(acquire1)).map(() => new Service1Impl()),
      () => Ref.update_(ref, C.append(release1))
    )
  )
}

function makeLayer2(
  ref: Ref.Ref<C.Chunk<string>>
): Layer<unknown, never, Has<Service2Impl>> {
  return Layer.fromManaged(Service2)(
    Managed.acquireReleaseWith(
      Ref.update_(ref, C.append(acquire2)).map(() => new Service2Impl()),
      () => Ref.update_(ref, C.append(release2))
    )
  )
}

function makeLayer3(
  ref: Ref.Ref<C.Chunk<string>>
): Layer<unknown, never, Has<Service3Impl>> {
  return Layer.fromManaged(Service3)(
    Managed.acquireReleaseWith(
      Ref.update_(ref, C.append(acquire3)).map(() => new Service3Impl()),
      () => Ref.update_(ref, C.append(release3))
    )
  )
}

describe("Layer", () => {
  it("sharing with and", async () => {
    const expected = [acquire1, release1]

    const program = Effect.Do()
      .bind("ref", () => makeRef())
      .bindValue("layer", ({ ref }) => makeLayer1(ref))
      .bindValue("env", ({ layer }) => (layer + layer).build())
      .tap(({ env }) => env.useDiscard(Effect.unit))
      .bind("actual", ({ ref }) => Ref.get(ref))

    const { actual } = await program.unsafeRunPromise()

    expect(C.toArray(actual)).toEqual(expected)
  })

  it("sharing itself with and", async () => {
    const program = Effect.Do()
      .bindValue("m", () => new Service1Impl())
      .bindValue("layer", ({ m }) => Layer.fromValue(Service1)(m))
      .bindValue("env", ({ layer }) => (layer + layer + layer).build())
      .bind("m1", ({ env }) => env.use((m) => Effect.succeed(Service1.read(m))))

    const { m, m1 } = await program.unsafeRunPromise()

    expect(m).toStrictEqual(m1)
  })

  it("sharing with to", async () => {
    const expected = [acquire1, release1]

    const program = Effect.Do()
      .bind("ref", () => makeRef())
      .bindValue("layer", ({ ref }) => makeLayer1(ref))
      .bindValue("env", ({ layer }) => (layer >> layer).build())
      .tap(({ env }) => env.useDiscard(Effect.unit))
      .bind("actual", ({ ref }) => Ref.get(ref))

    const { actual } = await program.unsafeRunPromise()

    expect(C.toArray(actual)).toEqual(expected)
  })

  it("sharing with multiple layers", async () => {
    const program = Effect.Do()
      .bind("ref", () => makeRef())
      .bindValue("layer1", ({ ref }) => makeLayer1(ref))
      .bindValue("layer2", ({ ref }) => makeLayer2(ref))
      .bindValue("layer3", ({ ref }) => makeLayer3(ref))
      .bindValue("env", ({ layer1, layer2, layer3 }) =>
        ((layer1 >> layer2) + (layer1 >> layer3)).build()
      )
      .tap(({ env }) => env.useDiscard(Effect.unit))
      .bind("actual", ({ ref }) => Ref.get(ref))

    const result = await program.unsafeRunPromise()

    const actual = C.toArray(result.actual)

    expect(actual[0]).toBe(acquire1)
    expect(actual.slice(1, 3)).toContain(acquire2)
    expect(actual.slice(1, 3)).toContain(acquire3)
    expect(actual.slice(3, 5)).toContain(release2)
    expect(actual.slice(3, 5)).toContain(release3)
    expect(actual[5]).toBe(release1)
  })

  it("finalizers with ++", async () => {
    const program = Effect.Do()
      .bind("ref", () => makeRef())
      .bindValue("layer1", ({ ref }) => makeLayer1(ref))
      .bindValue("layer2", ({ ref }) => makeLayer2(ref))
      .bindValue("env", ({ layer1, layer2 }) => (layer1 + layer2).build())
      .tap(({ env }) => env.useDiscard(Effect.unit))
      .bind("actual", ({ ref }) => Ref.get(ref))

    const result = await program.unsafeRunPromise()

    const actual = C.toArray(result.actual)

    expect(actual.slice(0, 2)).toContain(acquire1)
    expect(actual.slice(0, 2)).toContain(acquire2)
    expect(actual.slice(2, 4)).toContain(release1)
    expect(actual.slice(2, 4)).toContain(release2)
  })

  it("finalizers with to", async () => {
    const program = Effect.Do()
      .bind("ref", () => makeRef())
      .bindValue("layer1", ({ ref }) => makeLayer1(ref))
      .bindValue("layer2", ({ ref }) => makeLayer2(ref))
      .bindValue("env", ({ layer1, layer2 }) => (layer1 >> layer2).build())
      .tap(({ env }) => env.useDiscard(Effect.unit))
      .bind("actual", ({ ref }) => Ref.get(ref))

    const { actual } = await program.unsafeRunPromise()

    expect(C.toArray(actual)).toEqual([acquire1, acquire2, release2, release1])
  })

  it("finalizers with multiple layers", async () => {
    const program = Effect.Do()
      .bind("ref", () => makeRef())
      .bindValue("layer1", ({ ref }) => makeLayer1(ref))
      .bindValue("layer2", ({ ref }) => makeLayer2(ref))
      .bindValue("layer3", ({ ref }) => makeLayer3(ref))
      .bindValue("env", ({ layer1, layer2, layer3 }) =>
        ((layer1 >> layer2) >> layer3).build()
      )
      .tap(({ env }) => env.useDiscard(Effect.unit))
      .bind("actual", ({ ref }) => Ref.get(ref))

    const { actual } = await program.unsafeRunPromise()

    expect(C.toArray(actual)).toEqual([
      acquire1,
      acquire2,
      acquire3,
      release3,
      release2,
      release1
    ])
  })

  it("map does not interfere with sharing", async () => {
    const program = Effect.Do()
      .bind("ref", () => makeRef())
      .bindValue("layer1", ({ ref }) => makeLayer1(ref))
      .bindValue("layer2", ({ ref }) => makeLayer2(ref))
      .bindValue("layer3", ({ ref }) => makeLayer3(ref))
      .bindValue("env", ({ layer1, layer2, layer3 }) =>
        ((layer1.map(identity) >> layer2) + (layer1 >> layer3)).build()
      )
      .tap(({ env }) => env.useDiscard(Effect.unit))
      .bind("actual", ({ ref }) => Ref.get(ref))

    const result = await program.unsafeRunPromise()

    const actual = C.toArray(result.actual)

    expect(actual[0]).toBe(acquire1)
    expect(actual.slice(1, 3)).toContain(acquire2)
    expect(actual.slice(1, 3)).toContain(acquire3)
    expect(actual.slice(3, 5)).toContain(release2)
    expect(actual.slice(3, 5)).toContain(release3)
    expect(actual[5]).toBe(release1)
  })

  it("mapError does not interfere with sharing", async () => {
    const program = Effect.Do()
      .bind("ref", () => makeRef())
      .bindValue("layer1", ({ ref }) => makeLayer1(ref))
      .bindValue("layer2", ({ ref }) => makeLayer2(ref))
      .bindValue("layer3", ({ ref }) => makeLayer3(ref))
      .bindValue("env", ({ layer1, layer2, layer3 }) =>
        ((layer1.mapError(identity) >> layer2) >> (layer1 >> layer3)).build()
      )
      .tap(({ env }) => env.useDiscard(Effect.unit))
      .bind("actual", ({ ref }) => Ref.get(ref))

    const result = await program.unsafeRunPromise()

    const actual = C.toArray(result.actual)

    expect(actual[0]).toBe(acquire1)
    expect(actual.slice(1, 3)).toContain(acquire2)
    expect(actual.slice(1, 3)).toContain(acquire3)
    expect(actual.slice(3, 5)).toContain(release2)
    expect(actual.slice(3, 5)).toContain(release3)
    expect(actual[5]).toBe(release1)
  })

  it("orDie does not interfere with sharing", async () => {
    const program = Effect.Do()
      .bind("ref", () => makeRef())
      .bindValue("layer1", ({ ref }) => makeLayer1(ref))
      .bindValue("layer2", ({ ref }) => makeLayer2(ref))
      .bindValue("layer3", ({ ref }) => makeLayer3(ref))
      .bindValue("env", ({ layer1, layer2, layer3 }) =>
        ((layer1.orDie() >> layer2) >> (layer1 >> layer3)).build()
      )
      .tap(({ env }) => env.useDiscard(Effect.unit))
      .bind("actual", ({ ref }) => Ref.get(ref))

    const result = await program.unsafeRunPromise()

    const actual = C.toArray(result.actual)

    expect(actual[0]).toBe(acquire1)
    expect(actual.slice(1, 3)).toContain(acquire2)
    expect(actual.slice(1, 3)).toContain(acquire3)
    expect(actual.slice(3, 5)).toContain(release2)
    expect(actual.slice(3, 5)).toContain(release3)
    expect(actual[5]).toBe(release1)
  })

  it("interruption with and", async () => {
    const program = Effect.Do()
      .bind("ref", () => makeRef())
      .bindValue("layer1", ({ ref }) => makeLayer1(ref))
      .bindValue("layer2", ({ ref }) => makeLayer2(ref))
      .bindValue("env", ({ layer1, layer2 }) => (layer1 + layer2).build())
      .bind("fiber", ({ env }) => env.useDiscard(Effect.unit).fork())
      .tap(({ fiber }) => Fiber.interrupt(fiber))
      .bind("actual", ({ ref }) => Ref.get(ref))

    const result = await program.unsafeRunPromise()

    const actual = C.toArray(result.actual)

    if (actual.includes(acquire1)) {
      expect(actual).toContain(release1)
    }
    if (actual.includes(acquire2)) {
      expect(actual).toContain(release2)
    }
  })

  it("interruption with to", async () => {
    const program = Effect.Do()
      .bind("ref", () => makeRef())
      .bindValue("layer1", ({ ref }) => makeLayer1(ref))
      .bindValue("layer2", ({ ref }) => makeLayer2(ref))
      .bindValue("env", ({ layer1, layer2 }) => (layer1 >> layer2).build())
      .bind("fiber", ({ env }) => env.useDiscard(Effect.unit).fork())
      .tap(({ fiber }) => Fiber.interrupt(fiber))
      .bind("actual", ({ ref }) => Ref.get(ref))

    const result = await program.unsafeRunPromise()

    const actual = C.toArray(result.actual)

    if (actual.includes(acquire1)) {
      expect(actual).toContain(release1)
    }
    if (actual.includes(acquire2)) {
      expect(actual).toContain(release2)
    }
  })

  it("interruption with multiple layers", async () => {
    const program = Effect.Do()
      .bind("ref", () => makeRef())
      .bindValue("layer1", ({ ref }) => makeLayer1(ref))
      .bindValue("layer2", ({ ref }) => makeLayer2(ref))
      .bindValue("layer3", ({ ref }) => makeLayer3(ref))
      .bindValue("env", ({ layer1, layer2, layer3 }) =>
        (layer1 >> (layer2 + (layer1 >> layer3))).build()
      )
      .bind("fiber", ({ env }) => env.useDiscard(Effect.unit).fork())
      .tap(({ fiber }) => Fiber.interrupt(fiber))
      .bind("actual", ({ ref }) => Ref.get(ref))

    const result = await program.unsafeRunPromise()

    const actual = C.toArray(result.actual)

    if (actual.includes(acquire1)) {
      expect(actual).toContain(release1)
    }
    if (actual.includes(acquire2)) {
      expect(actual).toContain(release2)
    }
    if (actual.includes(acquire3)) {
      expect(actual).toContain(release3)
    }
  })

  it("layers can be acquired in parallel", async () => {
    const test = Effect.Do()
      .bind("promise", () => Promise.make<never, void>())
      .bindValue("layer1", () => Layer.fromRawManaged(Managed.never))
      .bindValue("layer2", ({ promise }) =>
        Layer.fromRawManaged(
          Managed.acquireReleaseWith(
            Promise.succeed_(promise, undefined),
            () => Effect.unit
          )
        ).map((a) => ({ a }))
      )
      .bindValue("env", ({ layer1, layer2 }) => (layer1 + layer2).build())
      .bind("fiber", ({ env }) => env.useDiscard(Effect.unit).forkDaemon())
      .tap(({ promise }) => Promise.await(promise))
      .tap(({ fiber }) => Fiber.interrupt(fiber))
      .map(constTrue)

    // Given the use of `Managed.never`, race the test against a 10 second
    // timer and fail the test if the computation doesn't complete. This delay
    // time may be increased if it turns out this test is flaky.
    const program = Effect.sleep(10000).zipRight(Effect.succeed(constFalse)).race(test)

    const result = await program.unsafeRunPromise()

    expect(result).toBe(true)
  })

  it("map can map a layer to an unrelated type", async () => {
    const ServiceAId = Symbol()

    class ServiceAImpl {
      readonly [ServiceAId] = ServiceAId
      constructor(readonly name: string, readonly value: number) {}
    }

    const ServiceA = tag<ServiceAImpl>(ServiceAId)

    const ServiceBId = Symbol()

    class ServiceBImpl {
      readonly [ServiceBId] = ServiceBId
      constructor(readonly name: string) {}
    }

    const ServiceB = tag<ServiceBImpl>(ServiceBId)

    const layer1 = Layer.fromValue(ServiceA)(new ServiceAImpl("name", 1))
    const layer2 = Layer.fromFunction(ServiceB)(
      (_: ServiceAImpl) => new ServiceBImpl(_.name)
    )

    const live = layer1.map(ServiceA.read) >> layer2

    const program = Effect.service(ServiceB).provideLayer(live)

    const { name } = await program.unsafeRunPromise()

    expect(name).toBe("name")
  })

  it("memoization", async () => {
    const program = Effect.Do()
      .bind("ref", () => makeRef())
      .bindValue("memoized", ({ ref }) => makeLayer1(ref).memoize())
      .tap(({ memoized }) =>
        memoized.use((layer) =>
          Effect.environment<Has<Service1Impl>>()
            .provideLayer(layer)
            .flatMap(() => Effect.environment<Has<Service1Impl>>().provideLayer(layer))
        )
      )
      .bind("actual", ({ ref }) => Ref.get(ref))

    const { actual } = await program.unsafeRunPromise()

    expect(C.toArray(actual)).toEqual([acquire1, release1])
  })

  it("orElse", async () => {
    const program = Effect.Do()
      .bind("ref", () => makeRef())
      .bindValue("layer1", ({ ref }) => makeLayer1(ref))
      .bindValue("layer2", ({ ref }) => makeLayer2(ref))
      .bindValue("env", ({ layer1, layer2 }) =>
        ((layer1 >> Layer.fail("failed!")) | layer2).build()
      )
      .bind("fiber", ({ env }) => env.useDiscard(Effect.unit))
      .bind("actual", ({ ref }) => Ref.get(ref))

    const result = await program.unsafeRunPromise()

    const actual = C.toArray(result.actual)

    expect(actual).toEqual([acquire1, release1, acquire2, release2])
  })

  it("passthrough", async () => {
    const NumberServiceId = Symbol()
    interface NumberService {
      readonly value: number
    }
    const NumberService = tag<NumberService>(NumberServiceId)

    const ToStringServiceId = Symbol()
    interface ToStringService {
      readonly value: string
    }
    const ToStringService = tag<ToStringService>(ToStringServiceId)

    const layer = Layer.fromFunction(ToStringService)((_: Has<NumberService>) => ({
      value: NumberService.read(_).value.toString()
    }))

    const live = Layer.fromValue(NumberService)({ value: 1 }) >> layer.passthrough()

    const program = Effect.Do()
      .bind("i", () => Effect.service(NumberService))
      .bind("s", () => Effect.service(ToStringService))
      .provideLayer(live)

    const { i, s } = await program.unsafeRunPromise()

    expect(i.value).toBe(1)
    expect(s.value).toBe("1")
  })

  it("fresh with and", async () => {
    const program = Effect.Do()
      .bind("ref", () => makeRef())
      .bindValue("layer", ({ ref }) => makeLayer1(ref))
      .bindValue("env", ({ layer }) => (layer + layer.fresh()).build())
      .tap(({ env }) => env.useNow())
      .bind("actual", ({ ref }) => Ref.get(ref))

    const { actual } = await program.unsafeRunPromise()

    expect(C.toArray(actual)).toEqual([acquire1, acquire1, release1, release1])
  })

  it("fresh with to", async () => {
    const program = Effect.Do()
      .bind("ref", () => makeRef())
      .bindValue("layer", ({ ref }) => makeLayer1(ref))
      .bindValue("env", ({ layer }) => (layer >> layer.fresh()).build())
      .tap(({ env }) => env.useNow())
      .bind("actual", ({ ref }) => Ref.get(ref))

    const { actual } = await program.unsafeRunPromise()

    expect(C.toArray(actual)).toEqual([acquire1, acquire1, release1, release1])
  })

  it("fresh with multiple layers", async () => {
    const program = Effect.Do()
      .bind("ref", () => makeRef())
      .bindValue("layer", ({ ref }) => makeLayer1(ref))
      .bindValue("env", ({ layer }) =>
        (layer + layer + (layer + layer).fresh()).build()
      )
      .tap(({ env }) => env.useNow())
      .bind("actual", ({ ref }) => Ref.get(ref))

    const { actual } = await program.unsafeRunPromise()

    expect(C.toArray(actual)).toEqual([acquire1, acquire1, release1, release1])
  })

  it("fresh with identical fresh layers", async () => {
    const program = Effect.Do()
      .bind("ref", () => makeRef())
      .bindValue("layer1", ({ ref }) => makeLayer1(ref))
      .bindValue("layer2", ({ ref }) => makeLayer2(ref))
      .bindValue("layer3", ({ ref }) => makeLayer3(ref))
      .bindValue("env", ({ layer1, layer2, layer3 }) =>
        (layer1.fresh() >> (layer2 + (layer1 >> layer3).fresh())).build()
      )
      .tap(({ env }) => env.useNow())
      .bind("actual", ({ ref }) => Ref.get(ref))

    const { actual } = await program.unsafeRunPromise()

    expect(C.toArray(actual)).toHaveLength(8)
  })

  it("preserves identity of acquired resources", async () => {
    const ChunkServiceId = Symbol()
    const ChunkService = tag<Ref.Ref<C.Chunk<string>>>(ChunkServiceId)

    const program = Effect.Do()
      .bind("testRef", () => Ref.make<C.Chunk<string>>(C.empty()))
      .bindValue("layer", ({ testRef }) =>
        pipe(
          Ref.make<C.Chunk<string>>(C.empty())
            .toManagedWith((ref) => Ref.get(ref).flatMap((_) => Ref.set_(testRef, _)))
            .tap(() => Managed.unit),
          Layer.fromManaged(ChunkService)
        )
      )
      .tap(({ layer }) =>
        layer
          .build()
          .use((_) => pipe(ChunkService.read(_), Ref.update(C.append("test"))))
      )
      .bind("actual", ({ testRef }) => Ref.get(testRef))

    const { actual } = await program.unsafeRunPromise()

    expect(C.toArray(actual)).toEqual(["test"])
  })

  // TODO: implement after Schedule
  // test("retry") {
  //   for {
  //     ref    <- Ref.make(0)
  //     effect  = ref.update(_ + 1) *> ZIO.fail("fail")
  //     layer   = ZLayer.fromZIOEnvironment(effect).retry(Schedule.recurs(3))
  //     _      <- layer.build.useNow.ignore
  //     result <- ref.get
  //   } yield assert(result)(equalTo(4))
  // },

  it("error handling", async () => {
    const sleep = Effect.sleep(100)
    const layer1 = Layer.fail("foo")
    const layer2 = Layer.succeed({ bar: "bar" })
    const layer3 = Layer.succeed({ baz: "baz" })
    const layer4 = Managed.acquireReleaseWith(sleep, () => sleep)
      .toLayerRaw()
      .map((b) => ({ b }))

    const program = Effect.unit.provideLayer(layer1 + (layer2 + layer3 > layer4)).exit()

    const result = await program.unsafeRunPromise()

    expect(result.isFailure()).toBe(true)
  })

  it("project", async () => {
    const PersonServiceId = Symbol()
    const AgeServiceId = Symbol()

    interface PersonService {
      readonly name: string
      readonly age: number
    }

    interface AgeService extends Pick<PersonService, "age"> {}

    const PersonService = tag<PersonService>(PersonServiceId)
    const AgeService = tag<AgeService>(AgeServiceId)

    const personLayer = Layer.fromValue(PersonService)({ name: "User", age: 42 })
    const ageLayer = personLayer.project(PersonService, (_) =>
      AgeService.has({ age: _.age })
    )

    const program = Effect.service(AgeService).provideLayer(ageLayer)

    const { age } = await program.unsafeRunPromise()

    expect(age).toBe(42)
  })

  it("tap", async () => {
    const BarServiceId = Symbol()

    interface BarService {
      readonly bar: string
    }

    const BarService = tag<BarService>(BarServiceId)

    const program = Effect.Do()
      .bind("ref", () => Ref.make("foo"))
      .bindValue("layer", ({ ref }) =>
        Layer.fromValue(BarService)({ bar: "bar" }).tap((r) =>
          Ref.set_(ref, BarService.read(r).bar)
        )
      )
      .tap(({ layer }) => layer.build().useNow())
      .bind("value", ({ ref }) => Ref.get(ref))

    const { value } = await program.unsafeRunPromise()

    expect(value).toBe("bar")
  })

  it("provides a partial environment to an effect", async () => {
    const NumberProviderId = Symbol()
    const NumberProvider = tag<number>(NumberProviderId)

    const StringProviderId = Symbol()
    const StringProvider = tag<string>(StringProviderId)

    const needsNumberAndString = Effect.environment<Has<number> & Has<string>>()

    const providesNumber = Layer.fromValue(NumberProvider)(10)
    const providesString = Layer.fromValue(StringProvider)("hi")

    const needsString = needsNumberAndString.provideSomeLayer(providesNumber)

    const program = needsString
      .provideLayer(providesString)
      .map((result) => Tuple(NumberProvider.read(result), StringProvider.read(result)))

    const result = await program.unsafeRunPromise()

    expect(result.get(0)).toBe(10)
    expect(result.get(1)).toBe("hi")
  })

  it("to provides a partial environment to another layer", async () => {
    const StringProviderId = Symbol()

    const StringProvider = tag<string>(StringProviderId)

    const NumberRefProviderId = Symbol()

    const NumberRefProvider = tag<Ref.Ref<number>>(NumberRefProviderId)

    const FooServiceId = Symbol()

    interface FooService {
      readonly ref: Ref.Ref<number>
      readonly string: string
      readonly get: Effect<unknown, never, Tuple<[number, string]>>
    }

    const FooService = tag<FooService>(FooServiceId)

    const fooBuilder = Layer.environment<Has<string> & Has<Ref.Ref<number>>>().map(
      (_) => {
        const s = StringProvider.read(_)
        const ref = NumberRefProvider.read(_)
        return FooService.has({
          ref,
          string: s,
          get: Ref.get(ref).map((i) => Tuple(i, s))
        })
      }
    )

    const provideNumberRef = Layer.fromEffect(NumberRefProvider)(Ref.make(10))
    const provideString = Layer.fromValue(StringProvider)("hi")
    const needsString = provideNumberRef >> fooBuilder
    const layer = provideString >> needsString

    const program = Effect.serviceWithEffect(FooService)((_) => _.get).provideLayer(
      layer
    )

    const result = await program.unsafeRunPromise()

    expect(result.get(0)).toBe(10)
    expect(result.get(1)).toBe("hi")
  })

  it(">+> provides a partial environment to another layer", async () => {
    const StringProviderId = Symbol()

    const StringProvider = tag<string>(StringProviderId)

    const NumberRefProviderId = Symbol()

    const NumberRefProvider = tag<Ref.Ref<number>>(NumberRefProviderId)

    const FooServiceId = Symbol()

    interface FooService {
      readonly ref: Ref.Ref<number>
      readonly string: string
      readonly get: Effect<unknown, never, Tuple<[number, string]>>
    }

    const FooService = tag<FooService>(FooServiceId)

    const fooBuilder = Layer.environment<Has<string> & Has<Ref.Ref<number>>>().map(
      (_) => {
        const s = StringProvider.read(_)
        const ref = NumberRefProvider.read(_)
        return FooService.has({
          ref,
          string: s,
          get: Ref.get(ref).map((i) => Tuple(i, s))
        })
      }
    )

    const provideNumberRef = Layer.fromEffect(NumberRefProvider)(Ref.make(10))
    const provideString = Layer.fromValue(StringProvider)("hi")
    const needsString = provideNumberRef > fooBuilder
    const layer = provideString > needsString

    const program = Effect.serviceWithEffect(FooService)((_) => _.get)
      .flatMap(({ tuple: [i1, s] }) =>
        Effect.serviceWithEffect(NumberRefProvider)((_) => Ref.get(_)).map((i2) =>
          Tuple(i1, i2, s)
        )
      )
      .provideLayer(layer)

    const result = await program.unsafeRunPromise()

    expect(result.get(0)).toBe(10)
    expect(result.get(1)).toBe(10)
    expect(result.get(2)).toBe("hi")
  })

  it("caching values in dependencies", async () => {
    class Config {
      constructor(readonly value: number) {}
    }

    const AId = Symbol()

    class A {
      constructor(readonly value: number) {}
    }

    const ATag = tag<A>(AId)

    const aLayer = Layer.fromFunction(ATag)((_: Config) => new A(_.value))

    const BId = Symbol()

    class B {
      constructor(readonly value: number) {}
    }

    const BTag = tag<B>(BId)

    const bLayer = Layer.fromFunction(BTag)((_: Has<A>) => new B(ATag.read(_).value))

    const CId = Symbol()

    class C {
      constructor(readonly value: number) {}
    }

    const CTag = tag<C>(CId)

    const cLayer = Layer.fromFunction(CTag)((_: Has<A>) => new C(ATag.read(_).value))

    const fedB = (Layer.succeed(new Config(1)) >> aLayer) >> bLayer
    const fedC = (Layer.succeed(new Config(2)) >> aLayer) >> cLayer

    const program = (fedB + fedC)
      .build()
      .useNow()
      .map((_) => Tuple(BTag.read(_), CTag.read(_)))

    const result = await program.unsafeRunPromise()

    expect(result.get(0).value).toBe(1)
    expect(result.get(1).value).toBe(1)
  })
})
