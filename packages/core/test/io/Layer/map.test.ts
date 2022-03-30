import { tag } from "../../../src/data/Has"
import { Effect } from "../../../src/io/Effect"
import { Layer } from "../../../src/io/Layer"

describe("Layer", () => {
  describe("map", () => {
    it("can map a layer to an unrelated type", async () => {
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
  })
})
