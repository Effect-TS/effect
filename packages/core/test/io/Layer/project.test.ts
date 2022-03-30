import { tag } from "../../../src/data/Has"
import { Effect } from "../../../src/io/Effect"
import { Layer } from "../../../src/io/Layer"

describe("Layer", () => {
  describe("project", () => {
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
  })
})
