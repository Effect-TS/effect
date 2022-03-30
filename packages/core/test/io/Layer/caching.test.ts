import { Tuple } from "../../../src/collection/immutable/Tuple"
import type { Has } from "../../../src/data/Has"
import { tag } from "../../../src/data/Has"
import { Effect } from "../../../src/io/Effect"
import { Layer } from "../../../src/io/Layer"

describe("Layer", () => {
  describe("caching", () => {
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

      const program = Effect.scoped((fedB + fedC).build()).map((_) =>
        Tuple(BTag.read(_), CTag.read(_))
      )

      const result = await program.unsafeRunPromise()

      expect(result.get(0).value).toBe(1)
      expect(result.get(1).value).toBe(1)
    })
  })
})
