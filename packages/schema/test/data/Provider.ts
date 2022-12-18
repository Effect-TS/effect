import * as _ from "@fp-ts/schema/Provider"

describe.concurrent("Provider", () => {
  describe.concurrent("Semigroup", () => {
    it("empty provider", () => {
      const provider = _.make("a", { b: () => "ab" })
      expect(_.Semigroup.combine(_.empty())(provider)).toStrictEqual(provider)
      expect(_.Semigroup.combine(provider)(_.empty())).toStrictEqual(provider)
    })

    it("combine", () => {
      const s1 = () => "s1"
      const s2 = () => "s2"
      const s3 = () => "s3"
      const s4 = () => "s4"
      const provider1 = _.make("typeId1", { serviceId1: s1, serviceId3: s4 })
      const provider2 = _.make("typeId2", { serviceId1: s3, serviceId2: s2 })
      expect(_.Semigroup.combine(provider1)(provider2)).toEqual(
        new Map<unknown, _.Services>([
          ["serviceId1", new Map([["typeId1", s1], ["typeId2", s3]])],
          ["serviceId2", new Map([["typeId2", s2]])],
          ["serviceId3", new Map([["typeId1", s4]])]
        ])
      )
    })
  })
})
