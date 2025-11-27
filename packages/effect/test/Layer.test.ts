import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import {
  Chunk,
  Context,
  Deferred,
  Duration,
  Effect,
  Exit,
  Fiber,
  FiberRef,
  identity,
  Layer,
  pipe,
  Ref,
  Schedule,
  Scope,
  Stream
} from "effect"

const acquire1 = "Acquiring Module 1"
const acquire2 = "Acquiring Module 2"
const acquire3 = "Acquiring Module 3"
const release1 = "Releasing Module 1"
const release2 = "Releasing Module 2"
const release3 = "Releasing Module 3"

describe("Layer", () => {
  it.effect("layers can be acquired in parallel", () =>
    Effect.gen(function*() {
      const BoolTag = Context.GenericTag<boolean>("boolean")
      const deferred = yield* Deferred.make<void>()
      const layer1 = Layer.effectContext<never, never, never>(Effect.never)
      const layer2 = Layer.scopedContext(
        Effect.acquireRelease(
          Deferred.succeed(deferred, void 0).pipe(
            Effect.map((bool) => Context.make(BoolTag, bool))
          ),
          () => Effect.void
        )
      )
      const env = layer1.pipe(Layer.merge(layer2), Layer.build)
      const fiber = yield* pipe(Effect.scoped(env), Effect.forkDaemon)
      yield* Deferred.await(deferred)
      const result = yield* pipe(Fiber.interrupt(fiber), Effect.asVoid)
      strictEqual(result, undefined)
    }))
  it.effect("preserves identity of acquired resources", () =>
    Effect.gen(function*() {
      const ChunkTag = Context.GenericTag<Ref.Ref<Chunk.Chunk<string>>>("Ref.Ref<Chunk.Chunk<string>>")
      const testRef = yield* Ref.make<Chunk.Chunk<string>>(Chunk.empty())
      const layer = Layer.scoped(
        ChunkTag,
        Effect.acquireRelease(
          Ref.make<Chunk.Chunk<string>>(Chunk.empty()),
          (ref) =>
            Ref.get(ref).pipe(
              Effect.flatMap((chunk) => Ref.set(testRef, chunk))
            )
        ).pipe(
          Effect.tap(() => Effect.void)
        )
      )
      yield* pipe(
        Layer.build(layer),
        Effect.flatMap((context) =>
          Ref.update(
            context.pipe(Context.get(ChunkTag)),
            Chunk.append("test")
          )
        ),
        Effect.scoped
      )
      const result = yield* Ref.get(testRef)
      deepStrictEqual(Array.from(result), ["test"])
    }))
  it.effect("sharing with merge", () =>
    Effect.gen(function*() {
      const ref = yield* makeRef()
      const layer = makeLayer1(ref)
      const env = layer.pipe(Layer.merge(layer), Layer.build)
      yield* Effect.scoped(env)
      const result = yield* Ref.get(ref)
      deepStrictEqual(Array.from(result), [acquire1, release1])
    }))
  it.scoped("sharing itself with merge", () =>
    Effect.gen(function*() {
      const service1 = new Service1()
      const layer = Layer.succeed(Service1Tag, service1)
      const env = layer.pipe(Layer.merge(layer), Layer.merge(layer), Layer.build)
      const result = yield* env.pipe(
        Effect.flatMap((context) => Effect.try(() => context.pipe(Context.get(Service1Tag))))
      )
      strictEqual(result, service1)
    }))
  it.effect("finalizers", () =>
    Effect.gen(function*() {
      const ref = yield* makeRef()
      const layer1 = makeLayer1(ref)
      const layer2 = makeLayer2(ref)
      const env = layer1.pipe(Layer.merge(layer2), Layer.build)
      yield* Effect.scoped(env)
      const result = yield* Ref.get(ref)
      assertTrue(Array.from(result).slice(0, 2).find((s) => s === acquire1) !== undefined)
      assertTrue(Array.from(result).slice(0, 2).find((s) => s === acquire2) !== undefined)
      assertTrue(Array.from(result).slice(2, 4).find((s) => s === release1) !== undefined)
      assertTrue(Array.from(result).slice(2, 4).find((s) => s === release2) !== undefined)
    }))
  it.effect("caching values in dependencies", () =>
    Effect.gen(function*() {
      class Config {
        constructor(readonly value: number) {}
      }
      const ConfigTag = Context.GenericTag<Config>("Config")
      class A {
        constructor(readonly value: number) {}
      }
      const ATag = Context.GenericTag<A>("A")
      const aLayer = Layer.function(ConfigTag, ATag, (config) => new A(config.value))
      class B {
        constructor(readonly value: number) {}
      }
      const BTag = Context.GenericTag<B>("B")
      const bLayer = Layer.function(ATag, BTag, (_: A) => new B(_.value))
      class C {
        constructor(readonly value: number) {}
      }
      const CTag = Context.GenericTag<C>("C")
      const cLayer = Layer.function(ATag, CTag, (_: A) => new C(_.value))
      const fedB = bLayer.pipe(
        Layer.provideMerge(aLayer),
        Layer.provideMerge(Layer.succeed(ConfigTag, new Config(1)))
      )
      const fedC = cLayer.pipe(
        Layer.provideMerge(aLayer),
        Layer.provide(Layer.succeed(ConfigTag, new Config(2)))
      )
      const result = yield* pipe(
        fedB,
        Layer.merge(fedC),
        Layer.build,
        Effect.map((context) =>
          [
            context.pipe(Context.get(BTag)),
            context.pipe(Context.get(CTag))
          ] as const
        ),
        Effect.scoped
      )
      strictEqual(result[0].value, 1)
      strictEqual(result[1].value, 1)
    }))
  it.effect("orElse - uses an alternative layer", () =>
    Effect.gen(function*() {
      const ref = yield* makeRef()
      const layer1 = makeLayer1(ref)
      const layer2 = makeLayer2(ref)
      const env = Layer.fail("failed!").pipe(Layer.provideMerge(layer1), Layer.orElse(() => layer2), Layer.build)
      yield* Effect.scoped(env)
      const result = yield* Ref.get(ref)
      deepStrictEqual(Array.from(result), [acquire1, release1, acquire2, release2])
    }))
  it.effect("handles errors gracefully", () =>
    Effect.gen(function*() {
      interface Bar {
        readonly bar: string
      }
      const BarTag = Context.GenericTag<Bar>("Bar")
      interface Baz {
        readonly baz: string
      }
      const BazTag = Context.GenericTag<Baz>("Baz")
      const ScopedTag = Context.GenericTag<void>("void")
      const sleep = Effect.sleep(Duration.millis(100))
      const layer1 = Layer.fail("foo")
      const layer2 = Layer.succeed(BarTag, { bar: "bar" })
      const layer3 = Layer.succeed(BazTag, { baz: "baz" })
      const layer4 = Layer.scoped(
        ScopedTag,
        Effect.scoped(Effect.acquireRelease(sleep, () => sleep))
      )

      const layer = Layer.merge(
        layer1,
        layer4.pipe(
          Layer.provide(Layer.merge(layer2, layer3))
        )
      )
      const result = yield* pipe(Effect.void, Effect.provide(layer), Effect.exit)
      assertTrue(Exit.isFailure(result))
    }))
  it.effect("fresh with merge", () =>
    Effect.gen(function*() {
      const ref = yield* makeRef()
      const layer = makeLayer1(ref)
      const env = layer.pipe(Layer.merge(Layer.fresh(layer)), Layer.build)
      yield* Effect.scoped(env)
      const result = yield* Ref.get(ref)
      deepStrictEqual(Array.from(result), [acquire1, acquire1, release1, release1])
    }))
  it.effect("fresh with to provideTo", () =>
    Effect.gen(function*() {
      const ref = yield* makeRef()
      const layer = makeLayer1(ref)
      const env = Layer.fresh(layer).pipe(
        Layer.provide(layer),
        Layer.build
      )
      yield* Effect.scoped(env)
      const result = yield* Ref.get(ref)
      deepStrictEqual(Array.from(result), [acquire1, acquire1, release1, release1])
    }))
  it.effect("with multiple layers", () =>
    Effect.gen(function*() {
      const ref = yield* makeRef()
      const layer = makeLayer1(ref)
      const env = layer.pipe(
        Layer.merge(layer),
        Layer.merge(layer.pipe(Layer.merge(layer), Layer.fresh)),
        Layer.build
      )
      yield* Effect.scoped(env)
      const result = yield* Ref.get(ref)
      deepStrictEqual(Array.from(result), [acquire1, acquire1, release1, release1])
    }))
  it.effect("with identical fresh layers", () =>
    Effect.gen(function*() {
      const ref = yield* makeRef()
      const layer1 = makeLayer1(ref)
      const layer2 = makeLayer2(ref)
      const layer3 = makeLayer3(ref)
      const env = layer2.pipe(
        Layer.merge(
          layer3.pipe(
            Layer.provide(layer1),
            Layer.fresh
          )
        ),
        Layer.provide(Layer.fresh(layer1)),
        Layer.build
      )
      yield* Effect.scoped(env)
      const result = yield* Ref.get(ref)
      deepStrictEqual(Array.from(result), [
        acquire1,
        acquire2,
        acquire1,
        acquire3,
        release3,
        release1,
        release2,
        release1
      ])
    }))
  it.effect("interruption with merge", () =>
    Effect.gen(function*() {
      const ref = yield* makeRef()
      const layer1 = makeLayer1(ref)
      const layer2 = makeLayer2(ref)
      const env = layer1.pipe(Layer.merge(layer2), Layer.build)
      const fiber = yield* pipe(Effect.scoped(env), Effect.fork)
      yield* Fiber.interrupt(fiber)
      const result = yield* pipe(Ref.get(ref), Effect.map((chunk) => Array.from(chunk)))
      if (result.find((s) => s === acquire1) !== undefined) {
        assertTrue(result.some((s) => s === release1))
      }
      if (result.find((s) => s === acquire2) !== undefined) {
        assertTrue(result.some((s) => s === release2))
      }
    }))
  it.effect("interruption with provideTo", () =>
    Effect.gen(function*() {
      const ref = yield* makeRef()
      const layer1 = makeLayer1(ref)
      const layer2 = makeLayer2(ref)
      const env = layer2.pipe(Layer.provide(layer1), Layer.build)
      const fiber = yield* pipe(Effect.scoped(env), Effect.fork)
      yield* Fiber.interrupt(fiber)
      const result = yield* pipe(Ref.get(ref), Effect.map((chunk) => Array.from(chunk)))
      if (result.find((s) => s === acquire1) !== undefined) {
        assertTrue(result.some((s) => s === release1))
      }
      if (result.find((s) => s === acquire2) !== undefined) {
        assertTrue(result.some((s) => s === release2))
      }
    }))
  it.effect("interruption with multiple layers", () =>
    Effect.gen(function*() {
      const ref = yield* makeRef()
      const layer1 = makeLayer1(ref)
      const layer2 = makeLayer2(ref)
      const layer3 = makeLayer3(ref)
      const env = layer3.pipe(
        Layer.provide(layer1),
        Layer.merge(layer2),
        Layer.provide(layer1),
        Layer.build
      )
      const fiber = yield* pipe(Effect.scoped(env), Effect.fork)
      yield* Fiber.interrupt(fiber)
      const result = yield* pipe(Ref.get(ref), Effect.map((chunk) => Array.from(chunk)))
      if (result.find((s) => s === acquire1) !== undefined) {
        assertTrue(result.some((s) => s === release1))
      }
      if (result.find((s) => s === acquire2) !== undefined) {
        assertTrue(result.some((s) => s === release2))
      }
      if (result.find((s) => s === acquire3) !== undefined) {
        assertTrue(result.some((s) => s === release3))
      }
    }))
  it.effect("can map a layer to an unrelated type", () =>
    Effect.gen(function*() {
      interface ServiceA {
        readonly name: string
        readonly value: number
      }
      const ServiceATag = Context.GenericTag<ServiceA>("ServiceA")
      interface ServiceB {
        readonly name: string
      }
      const ServiceBTag = Context.GenericTag<ServiceB>("ServiceB")
      const StringTag = Context.GenericTag<string>("string")
      const layer1 = Layer.succeed(ServiceATag, { name: "name", value: 1 })
      const layer2 = Layer.function(StringTag, ServiceBTag, (name) => ({ name }))
      const live = layer2.pipe(
        Layer.provide(
          Layer.map(layer1, (context) => Context.make(StringTag, context.pipe(Context.get(ServiceATag)).name))
        )
      )
      const result = yield* pipe(ServiceBTag, Effect.provide(live))
      strictEqual(result.name, "name")
    }))
  it.effect("memoizes acquisition of resources", () =>
    Effect.gen(function*() {
      const ref = yield* makeRef()
      const memoized = Layer.memoize(makeLayer1(ref))
      yield* pipe(
        memoized,
        Effect.flatMap((layer) =>
          Effect.context<Service1>().pipe(
            Effect.provide(layer),
            Effect.flatMap(() => Effect.context<Service1>().pipe(Effect.provide(layer)))
          )
        ),
        Effect.scoped
      )
      const result = yield* Ref.get(ref)
      deepStrictEqual(Array.from(result), [acquire1, release1])
    }))
  it.scoped("fiberRef changes are memoized", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make<boolean>(false)
      const tag = Context.GenericTag<boolean>("boolean")
      const layer1 = Layer.scopedDiscard(Effect.locallyScoped(fiberRef, true))
      const layer2 = Layer.effect(tag, FiberRef.get(fiberRef))
      const layer3 = layer2.pipe(
        Layer.provide(layer1),
        Layer.merge(layer1)
      )
      const result = yield* Layer.build(layer3)
      assertTrue(result.pipe(Context.unsafeGet(tag)))
    }))
  it.effect("provides a partial environment to an effect", () =>
    Effect.gen(function*() {
      const NumberTag = Context.GenericTag<number>("number")
      const StringTag = Context.GenericTag<string>("string")
      const needsNumberAndString = Effect.all([NumberTag, StringTag])
      const providesNumber = Layer.succeed(NumberTag, 10)
      const providesString = Layer.succeed(StringTag, "hi")
      const needsString = needsNumberAndString.pipe(Effect.provide(providesNumber))
      const result = yield* pipe(needsString, Effect.provide(providesString))
      strictEqual(result[0], 10)
      strictEqual(result[1], "hi")
    }))
  it.effect("to provides a partial environment to another layer", () =>
    Effect.gen(function*() {
      const StringTag = Context.GenericTag<string>("string")
      const NumberRefTag = Context.GenericTag<Ref.Ref<number>>("Ref.Ref<number>")
      interface FooService {
        readonly ref: Ref.Ref<number>
        readonly string: string
        readonly get: Effect.Effect<
          readonly [
            number,
            string
          ]
        >
      }
      const FooTag = Context.GenericTag<FooService>("FooService")
      const fooBuilder = Layer.context<string | Ref.Ref<number>>().pipe(
        Layer.map((context) => {
          const s = Context.get(context, StringTag)
          const ref = Context.get(context, NumberRefTag)
          return Context.make(FooTag, {
            ref,
            string: s,
            get: Ref.get(ref).pipe(Effect.map((i) => [i, s] as const))
          })
        })
      )
      const provideNumberRef = Layer.effect(NumberRefTag)(Ref.make(10))
      const provideString = Layer.succeed(StringTag, "hi")
      const needsString = fooBuilder.pipe(Layer.provide(provideNumberRef))
      const layer = needsString.pipe(Layer.provide(provideString))
      const result = yield* pipe(Effect.flatMap(FooTag, (_) => _.get), Effect.provide(layer))
      strictEqual(result[0], 10)
      strictEqual(result[1], "hi")
    }))
  it.effect("andTo provides a partial environment to another layer", () =>
    Effect.gen(function*() {
      const StringTag = Context.GenericTag<string>("string")
      const NumberRefTag = Context.GenericTag<Ref.Ref<number>>("Ref.Ref<number>")
      interface FooService {
        readonly ref: Ref.Ref<number>
        readonly string: string
        readonly get: Effect.Effect<
          readonly [
            number,
            string
          ]
        >
      }
      const FooTag = Context.GenericTag<FooService>("FooService")
      const fooBuilder = Layer.context<string | Ref.Ref<number>>().pipe(
        Layer.map((context) => {
          const s = Context.get(context, StringTag)
          const ref = Context.get(context, NumberRefTag)
          return Context.make(FooTag, {
            ref,
            string: s,
            get: Ref.get(ref).pipe(Effect.map((i) => [i, s] as const))
          })
        })
      )
      const provideNumberRef = Layer.effect(NumberRefTag, Ref.make(10))
      const provideString = Layer.succeed(StringTag, "hi")
      const needsString = fooBuilder.pipe(Layer.provideMerge(provideNumberRef))
      const layer = needsString.pipe(Layer.provideMerge(provideString))
      const result = yield* pipe(
        Effect.flatMap(FooTag, (foo) => foo.get),
        Effect.flatMap(([i1, s]) =>
          NumberRefTag.pipe(Effect.flatMap(Ref.get), Effect.map((i2) => [i1, i2, s] as const))
        ),
        Effect.provide(layer)
      )
      strictEqual(result[0], 10)
      strictEqual(result[1], 10)
      strictEqual(result[2], "hi")
    }))
  it.effect("passthrough passes the inputs through to the next layer", () =>
    Effect.gen(function*() {
      interface NumberService {
        readonly value: number
      }
      const NumberTag = Context.GenericTag<NumberService>("NumberService")
      interface ToStringService {
        readonly value: string
      }
      const ToStringTag = Context.GenericTag<ToStringService>("ToStringService")
      const layer = Layer.function(NumberTag, ToStringTag, (numberService) => ({
        value: numberService.value.toString()
      }))
      const live = Layer.passthrough(layer).pipe(Layer.provide(Layer.succeed(NumberTag, { value: 1 })))
      const { i, s } = yield* pipe(
        Effect.all({
          i: NumberTag,
          s: ToStringTag
        }),
        Effect.provide(live)
      )
      strictEqual(i.value, 1)
      strictEqual(s.value, "1")
    }))
  it.effect("project", () =>
    Effect.gen(function*() {
      interface PersonService {
        readonly name: string
        readonly age: number
      }
      interface AgeService extends Pick<PersonService, "age"> {
      }
      const PersonTag = Context.GenericTag<PersonService>("PersonService")
      const AgeTag = Context.GenericTag<AgeService>("AgeService")
      const personLayer = Layer.succeed(PersonTag, { name: "User", age: 42 })
      const ageLayer = personLayer.pipe(Layer.project(PersonTag, AgeTag, (_) => ({ age: _.age })))
      const { age } = yield* pipe(AgeTag, Effect.provide(ageLayer))
      strictEqual(age, 42)
    }))
  it.effect("sharing with provideTo", () =>
    Effect.gen(function*() {
      const ref = yield* makeRef()
      const layer = makeLayer1(ref)
      const env = layer.pipe(Layer.provide(layer), Layer.build)
      yield* Effect.scoped(env)
      const result = yield* Ref.get(ref)
      deepStrictEqual(Array.from(result), [acquire1, release1])
    }))
  it.effect("sharing with multiple layers with provideTo", () =>
    Effect.gen(function*() {
      const ref = yield* makeRef()
      const layer1 = makeLayer1(ref)
      const layer2 = makeLayer2(ref)
      const layer3 = makeLayer3(ref)
      const env = layer3.pipe(
        Layer.provide(layer1),
        Layer.merge(layer2.pipe(Layer.provide(layer1))),
        Layer.build
      )
      yield* Effect.scoped(env)
      const result = yield* pipe(Ref.get(ref), Effect.map((chunk) => Array.from(chunk)))
      strictEqual(result[0], acquire1)
      assertTrue(result.slice(1, 3).some((s) => s === acquire2))
      assertTrue(result.slice(1, 3).some((s) => s === acquire3))
      assertTrue(result.slice(3, 5).some((s) => s === release3))
      assertTrue(result.slice(3, 5).some((s) => s === release2))
      strictEqual(result[5], release1)
    }))
  it.effect("finalizers with provideTo", () =>
    Effect.gen(function*() {
      const ref = yield* makeRef()
      const layer1 = makeLayer1(ref)
      const layer2 = makeLayer2(ref)
      const env = layer2.pipe(Layer.provide(layer1), Layer.build)
      yield* Effect.scoped(env)
      const result = yield* Ref.get(ref)
      deepStrictEqual(Array.from(result), [acquire1, acquire2, release2, release1])
    }))
  it.effect("finalizers with multiple layers with provideTo", () =>
    Effect.gen(function*() {
      const ref = yield* makeRef()
      const layer1 = makeLayer1(ref)
      const layer2 = makeLayer2(ref)
      const layer3 = makeLayer3(ref)
      const env = layer3.pipe(Layer.provide(layer2), Layer.provide(layer1), Layer.build)
      yield* Effect.scoped(env)
      const result = yield* Ref.get(ref)
      deepStrictEqual(Array.from(result), [acquire1, acquire2, acquire3, release3, release2, release1])
    }))
  it.effect("retry", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(0)
      const effect = ref.pipe(Ref.update((n) => n + 1), Effect.zipRight(Effect.fail("fail")))
      const layer = Layer.effectContext(effect).pipe(Layer.retry(Schedule.recurs(3)))
      yield* Effect.ignore(Effect.scoped(Layer.build(layer)))
      const result = yield* Ref.get(ref)
      strictEqual(result, 4)
    }))
  it.effect("map does not interfere with sharing", () =>
    Effect.gen(function*() {
      const ref = yield* makeRef()
      const layer1 = makeLayer1(ref)
      const layer2 = makeLayer2(ref)
      const layer3 = makeLayer3(ref)
      const env = layer3.pipe(
        Layer.provide(layer1),
        Layer.provide(layer2),
        Layer.provide(Layer.map(layer1, identity)),
        Layer.build
      )
      yield* Effect.scoped(env)
      const result = yield* pipe(Ref.get(ref), Effect.map((chunk) => Array.from(chunk)))
      strictEqual(result[0], acquire1)
      assertTrue(result.slice(1, 3).some((s) => s === acquire2))
      assertTrue(result.slice(1, 3).some((s) => s === acquire3))
      assertTrue(result.slice(3, 5).some((s) => s === release3))
      assertTrue(result.slice(3, 5).some((s) => s === release2))
      strictEqual(result[5], release1)
    }))
  it.effect("mapError does not interfere with sharing", () =>
    Effect.gen(function*() {
      const ref = yield* makeRef()
      const layer1 = makeLayer1(ref)
      const layer2 = makeLayer2(ref)
      const layer3 = makeLayer3(ref)
      const env = layer3.pipe(
        Layer.provide(layer1),
        Layer.provide(layer2),
        Layer.provide(Layer.mapError(layer1, identity)),
        Layer.build
      )
      yield* Effect.scoped(env)
      const result = yield* pipe(Ref.get(ref), Effect.map((chunk) => Array.from(chunk)))
      strictEqual(result[0], acquire1)
      assertTrue(result.slice(1, 3).some((s) => s === acquire2))
      assertTrue(result.slice(1, 3).some((s) => s === acquire3))
      assertTrue(result.slice(3, 5).some((s) => s === release3))
      assertTrue(result.slice(3, 5).some((s) => s === release2))
      strictEqual(result[5], release1)
    }))
  it.effect("orDie does not interfere with sharing", () =>
    Effect.gen(function*() {
      const ref = yield* makeRef()
      const layer1 = makeLayer1(ref)
      const layer2 = makeLayer2(ref)
      const layer3 = makeLayer3(ref)
      const env = layer3.pipe(
        Layer.provide(layer1),
        Layer.provide(layer2),
        Layer.provide(Layer.orDie(layer1)),
        Layer.build
      )
      yield* Effect.scoped(env)
      const result = yield* pipe(Ref.get(ref), Effect.map((chunk) => Array.from(chunk)))
      strictEqual(result[0], acquire1)
      assertTrue(result.slice(1, 3).some((s) => s === acquire2))
      assertTrue(result.slice(1, 3).some((s) => s === acquire3))
      assertTrue(result.slice(3, 5).some((s) => s === release3))
      assertTrue(result.slice(3, 5).some((s) => s === release2))
      strictEqual(result[5], release1)
    }))
  it.effect("tap peeks at an acquired resource", () =>
    Effect.gen(function*() {
      interface BarService {
        readonly bar: string
      }
      const BarTag = Context.GenericTag<BarService>("BarService")
      const ref: Ref.Ref<string> = yield* Ref.make("foo")
      const layer = Layer.succeed(BarTag, { bar: "bar" }).pipe(
        Layer.tap((context) => Ref.set(ref, context.pipe(Context.get(BarTag)).bar))
      )
      yield* Effect.scoped(Layer.build(layer))
      const result = yield* Ref.get(ref)
      strictEqual(result, "bar")
    }))
  it.effect("locally", () =>
    Effect.gen(function*() {
      interface BarService {
        readonly bar: string
      }
      const BarTag = Context.GenericTag<BarService>("BarService")
      const fiberRef = FiberRef.unsafeMake(0)
      const layer = Layer.locally(fiberRef, 100)(
        Layer.effect(
          BarTag,
          Effect.map(
            FiberRef.get(fiberRef),
            (n): BarService => ({ bar: `bar: ${n}` })
          )
        )
      )
      const env = yield* Effect.scoped(Layer.build(layer))
      const result = Context.get(env, BarTag)
      strictEqual(result.bar, "bar: 100")
    }))
  it.effect("locallyWith", () =>
    Effect.gen(function*() {
      interface BarService {
        readonly bar: string
      }
      const BarTag = Context.GenericTag<BarService>("BarService")
      const fiberRef = FiberRef.unsafeMake(0)
      const layer = Layer.locallyWith(fiberRef, (n) => n + 1)(
        Layer.effect(
          BarTag,
          Effect.map(
            FiberRef.get(fiberRef),
            (n): BarService => ({ bar: `bar: ${n}` })
          )
        )
      )
      const env = yield* Effect.scoped(Layer.build(layer))
      const result = Context.get(env, BarTag)
      strictEqual(result.bar, "bar: 1")
    }))

  it.effect("Updates service via updateService", () =>
    Effect.gen(function*() {
      const Foo = Context.GenericTag<"Foo", string>("Foo")
      const FooDefault = Layer.succeed(Foo, "Foo")
      const Bar = Context.GenericTag<"Bar", string>("Bar")
      const BarDefault = Layer.effect(Bar, Foo).pipe(
        Layer.updateService(Foo, (x) => `Bar: ${x}`),
        Layer.provide(FooDefault)
      )
      const result = yield* Bar.pipe(Effect.provide(BarDefault))
      deepStrictEqual(result, "Bar: Foo")
    }))

  it.effect("allows passing partial service", () =>
    Effect.gen(function*() {
      class Service1 extends Effect.Service<Service1>()("Service1", {
        succeed: {
          one: Effect.succeed(123),
          two: () => Effect.succeed(2),
          stream: Stream.succeed(3)
        }
      }) {}

      yield* Effect.gen(function*() {
        const service = yield* Service1

        deepStrictEqual(yield* service.one, 123)

        yield* service.two().pipe(
          Effect.catchAllDefect(Effect.fail),
          Effect.flip
        )
        yield* service.stream.pipe(
          Stream.runDrain,
          Effect.catchAllDefect(Effect.fail),
          Effect.flip
        )
      }).pipe(
        Effect.provide(Layer.mock(Service1, {
          _tag: "Service1",
          one: Effect.succeed(123)
        }))
      )
    }))

  describe("MemoMap", () => {
    it.effect("memoizes layer across builds", () =>
      Effect.gen(function*() {
        const ref = yield* makeRef()
        const layer1 = makeLayer1(ref)
        const layer2 = makeLayer2(ref).pipe(
          Layer.provide(layer1)
        )
        const memoMap = yield* Layer.makeMemoMap
        const scope1 = yield* Scope.make()
        const scope2 = yield* Scope.make()

        yield* Layer.buildWithMemoMap(layer1, memoMap, scope1)
        yield* Layer.buildWithMemoMap(layer2, memoMap, scope2)
        yield* Scope.close(scope2, Exit.void)
        yield* Layer.buildWithMemoMap(layer2, memoMap, scope1)
        yield* Scope.close(scope1, Exit.void)

        const result = yield* Ref.get(ref)
        deepStrictEqual(Array.from(result), [acquire1, acquire2, release2, acquire2, release2, release1])
      }))

    it.effect("layers are not released early", () =>
      Effect.gen(function*() {
        const ref = yield* makeRef()
        const layer1 = makeLayer1(ref)
        const layer2 = makeLayer2(ref).pipe(
          Layer.provide(layer1)
        )
        const memoMap = yield* Layer.makeMemoMap
        const scope1 = yield* Scope.make()
        const scope2 = yield* Scope.make()

        yield* Layer.buildWithMemoMap(layer1, memoMap, scope1)
        yield* Layer.buildWithMemoMap(layer2, memoMap, scope2)
        yield* Scope.close(scope1, Exit.void)
        yield* Scope.close(scope2, Exit.void)

        const result = yield* Ref.get(ref)
        deepStrictEqual(Array.from(result), [acquire1, acquire2, release2, release1])
      }))
  })
})
export const makeRef = (): Effect.Effect<Ref.Ref<Chunk.Chunk<string>>> => {
  return Ref.make(Chunk.empty())
}
export class Service1 {
  one(): Effect.Effect<number> {
    return Effect.succeed(1)
  }
}
export const Service1Tag = Context.GenericTag<Service1>("Service1")
export const makeLayer1 = (ref: Ref.Ref<Chunk.Chunk<string>>): Layer.Layer<Service1> => {
  return Layer.scoped(
    Service1Tag,
    Effect.acquireRelease(
      ref.pipe(Ref.update(Chunk.append(acquire1)), Effect.as(new Service1())),
      () => Ref.update(ref, Chunk.append(release1))
    )
  )
}
export class Service2 {
  two(): Effect.Effect<number> {
    return Effect.succeed(2)
  }
}
export const Service2Tag = Context.GenericTag<Service2>("Service2")
export const makeLayer2 = (ref: Ref.Ref<Chunk.Chunk<string>>): Layer.Layer<Service2> => {
  return Layer.scoped(
    Service2Tag,
    Effect.acquireRelease(
      ref.pipe(Ref.update(Chunk.append(acquire2)), Effect.as(new Service2())),
      () => Ref.update(ref, Chunk.append(release2))
    )
  )
}
export class Service3 {
  three(): Effect.Effect<number> {
    return Effect.succeed(3)
  }
}
export const Service3Tag = Context.GenericTag<Service3>("Service3")
export const makeLayer3 = (ref: Ref.Ref<Chunk.Chunk<string>>): Layer.Layer<Service3> => {
  return Layer.scoped(
    Service3Tag,
    Effect.acquireRelease(
      ref.pipe(Ref.update(Chunk.append(acquire3)), Effect.as(new Service3())),
      () => Ref.update(ref, Chunk.append(release3))
    )
  )
}
