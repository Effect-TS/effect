import { Optic, Result, Schema } from "effect"
import type { Option } from "effect"
import { describe, expect, it } from "tstyche"

describe("Optic", () => {
  describe("compose", () => {
    const iso = Optic.makeIso<number, number>((n) => n, (n) => n)
    const lens = Optic.makeLens<number, number>((n) => n, (n) => n)
    const prism = Optic.makePrism<number, number>(Result.succeed, (n) => n)
    const optional = Optic.makeOptional<number, number>(Result.succeed, (n) => Result.succeed(n))

    it("preserves the optic kind matrix", () => {
      expect(iso.compose(iso)).type.toBe<Optic.Iso<number, number>>()
      expect(iso.compose(lens)).type.toBe<Optic.Lens<number, number>>()
      expect(iso.compose(prism)).type.toBe<Optic.Prism<number, number>>()
      expect(iso.compose(optional)).type.toBe<Optic.Optional<number, number>>()

      expect(lens.compose(iso)).type.toBe<Optic.Lens<number, number>>()
      expect(lens.compose(lens)).type.toBe<Optic.Lens<number, number>>()
      expect(lens.compose(prism)).type.toBe<Optic.Optional<number, number>>()
      expect(lens.compose(optional)).type.toBe<Optic.Optional<number, number>>()

      expect(prism.compose(iso)).type.toBe<Optic.Prism<number, number>>()
      expect(prism.compose(lens)).type.toBe<Optic.Optional<number, number>>()
      expect(prism.compose(prism)).type.toBe<Optic.Prism<number, number>>()
      expect(prism.compose(optional)).type.toBe<Optic.Optional<number, number>>()

      expect(optional.compose(iso)).type.toBe<Optic.Optional<number, number>>()
      expect(optional.compose(lens)).type.toBe<Optic.Optional<number, number>>()
      expect(optional.compose(prism)).type.toBe<Optic.Optional<number, number>>()
      expect(optional.compose(optional)).type.toBe<Optic.Optional<number, number>>()
    })

    it("does not expose internal nodes", () => {
      expect(iso).type.not.toHaveProperty("node")
      expect(lens).type.not.toHaveProperty("node")
      expect(prism).type.not.toHaveProperty("node")
      expect(optional).type.not.toHaveProperty("node")
    })
  })

  describe("key", () => {
    it("should not be allowed on union types", () => {
      type S = { readonly _tag: "A"; readonly a?: string } | { readonly _tag: "B"; readonly a?: number }
      expect(Optic.id<S>().key).type.not.toBeCallableWith("_tag")
    })

    it("optional key (with undefined)", () => {
      type S = { readonly a?: number | undefined }
      const optic = Optic.id<S>().key("a")

      expect(optic).type.toBe<Optic.Lens<S, number | undefined>>()
    })
  })

  describe("optionalKey", () => {
    it("should not be allowed on union types", () => {
      type S = { readonly _tag: "A"; readonly a?: string } | { readonly _tag: "B"; readonly a?: number }
      expect(Optic.id<S>().key).type.not.toBeCallableWith("a")
    })

    describe("Struct", () => {
      it("exact optional key (without undefined)", () => {
        type S = { readonly a?: number }
        const optic = Optic.id<S>().optionalKey("a")

        expect(optic).type.toBe<Optic.Lens<S, number | undefined>>()
      })
    })

    it("Record", () => {
      type S = { [x: string]: number }
      const optic = Optic.id<S>().optionalKey("a")

      expect(optic).type.toBe<Optic.Lens<S, number | undefined>>()
    })

    describe("Tuple", () => {
      it("exact optional element (without undefined)", () => {
        type S = readonly [number, number?]
        const optic = Optic.id<S>().optionalKey(1)

        expect(optic).type.toBe<Optic.Lens<S, number | undefined>>()
      })
    })

    it("Array", () => {
      type S = ReadonlyArray<number>
      const optic = Optic.id<S>().optionalKey(1)

      expect(optic).type.toBe<Optic.Lens<S, number | undefined>>()
    })
  })

  describe("at", () => {
    it("should not be allowed on union types", () => {
      type S =
        | Record<string, string>
        | Record<string, number>

      expect(Optic.id<S>().at).type.not.toBeCallableWith("a")
    })
  })

  describe("pick", () => {
    it("should not be allowed on union types", () => {
      type S = { readonly _tag: "A"; readonly a?: string } | { readonly _tag: "B"; readonly a?: number }
      expect(Optic.id<S>().pick).type.not.toBeCallableWith(["a"])
    })

    it("Struct", () => {
      type S = { readonly a: string; readonly b: number; readonly c: boolean }
      const optic = Optic.id<S>().pick(["a", "c"])

      expect(optic).type.toBe<Optic.Lens<S, { readonly a: string; readonly c: boolean }>>()
    })
  })

  describe("omit", () => {
    it("should not be allowed on union types", () => {
      type S = { readonly _tag: "A"; readonly a?: string } | { readonly _tag: "B"; readonly a?: number }
      expect(Optic.id<S>().omit).type.not.toBeCallableWith(["a"])
    })

    it("Struct", () => {
      type S = { readonly a: string; readonly b: number; readonly c: boolean }
      const optic = Optic.id<S>().omit(["b"])

      expect(optic).type.toBe<Optic.Lens<S, { readonly a: string; readonly c: boolean }>>()
    })
  })

  describe("notUndefined", () => {
    it("Prism", () => {
      const optic = Optic.id<number | undefined>().notUndefined()
      expect(optic).type.toBe<Optic.Prism<number | undefined, number>>()
    })

    it("Optional", () => {
      type S = Record<string, number | undefined>
      const optic = Optic.id<S>().at("a").notUndefined()
      expect(optic).type.toBe<Optic.Optional<S, number>>()
    })
  })

  it("fromChecks", () => {
    const optic = Optic.id<number>().compose(Optic.fromChecks(Schema.isGreaterThan(0), Schema.isInt()))
    expect(optic).type.toBe<Optic.Prism<number, number>>()
  })

  describe("Option", () => {
    it("some", () => {
      const optic = Optic.id<Option.Option<number>>().compose(Optic.some())
      expect(optic).type.toBe<Optic.Prism<Option.Option<number>, number>>()
    })

    it("none", () => {
      const optic = Optic.id<Option.Option<number>>().compose(Optic.none())
      expect(optic).type.toBe<Optic.Prism<Option.Option<number>, undefined>>()
    })
  })

  describe("Result", () => {
    it("success", () => {
      const optic = Optic.id<Result.Result<number, string>>().compose(Optic.success())
      expect(optic).type.toBe<Optic.Prism<Result.Result<number, string>, number>>()
    })

    it("failure", () => {
      const optic = Optic.id<Result.Result<number, string>>().compose(Optic.failure())
      expect(optic).type.toBe<Optic.Prism<Result.Result<number, string>, string>>()
    })
  })
})
