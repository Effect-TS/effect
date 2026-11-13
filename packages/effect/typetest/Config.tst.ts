import { Brand, Config, ConfigProvider, Newtype, Schema } from "effect"
import { describe, expect, it } from "tstyche"

describe("Config", () => {
  it("literals", () => {
    const c = Config.Literals(["a", "b"])

    expect(c).type.toBe<Config.Config<"a" | "b">>()
    expect<Config.Success<typeof c>>().type.toBe<"a" | "b">()
  })

  it("withDefault", () => {
    const c = Config.schema(Schema.Literals(["a", "b"]))

    const c1 = c.pipe(Config.withDefault("a"))
    expect(c1).type.toBe<Config.Config<"a" | "b">>()

    const c2 = Config.withDefault(c, "a")
    expect(c2).type.toBe<Config.Config<"a" | "b">>()

    const c3 = c.pipe(Config.withDefault("c"))
    expect(c3).type.toBe<Config.Config<"a" | "b" | "c">>()
  })

  it("withBrand", () => {
    type UserId = string & Brand.Brand<"UserId">
    const UserId = Brand.nominal<UserId>()

    expect(Config.String("a").pipe(Config.withBrand("UserId"))).type.toBe<Config.Config<UserId>>()
    expect(Config.withBrand(Config.String("a"), "UserId")).type.toBe<Config.Config<UserId>>()

    expect(Config.String("a").pipe(Config.withBrand(UserId))).type.toBe<Config.Config<UserId>>()
    expect(Config.withBrand(Config.String("a"), UserId)).type.toBe<Config.Config<UserId>>()

    const literal = Config.Literals(["a", "b"]).pipe(Config.withBrand(UserId))
    expect(literal).type.toBe<Config.Config<("a" | "b") & Brand.Brand<"UserId">>>()

    expect(Config.Number("a").pipe).type.not.toBeCallableWith(Config.withBrand(UserId))
    expect(Config.withBrand).type.not.toBeCallableWith(Config.Number("a"), UserId)
  })

  it("withNewtype", () => {
    interface UserId extends Newtype.Newtype<"UserId", string> {}
    const UserIdIso = Newtype.makeIso<UserId>()

    expect(Config.String("a").pipe(Config.withNewtype<UserId>())).type.toBe<Config.Config<UserId>>()
    expect(Config.Number("a").pipe).type.not.toBeCallableWith(Config.withNewtype<UserId>())

    expect(Config.String("a").pipe(Config.withNewtype(UserIdIso))).type.toBe<Config.Config<UserId>>()
    expect(Config.withNewtype(Config.String("a"), UserIdIso)).type.toBe<Config.Config<UserId>>()
    expect(Config.Literals(["a", "b"]).pipe(Config.withNewtype(UserIdIso))).type.toBe<Config.Config<UserId>>()

    expect(Config.Number("a").pipe).type.not.toBeCallableWith(Config.withNewtype(UserIdIso))
    expect(Config.withNewtype).type.not.toBeCallableWith(Config.Number("a"), UserIdIso)
  })

  it("type level helpers", () => {
    const c = Config.schema(Schema.Literals(["a", "b"]))

    type S = Config.Success<typeof c>
    expect<S>().type.toBe<"a" | "b">()
  })

  it("Record", () => {
    const c = Config.Record(Schema.String, Schema.FiniteFromString)

    expect(c).type.toBe<Config.Config<{ readonly [x: string]: number }>>()

    const withPath = Config.Record(Schema.String, Schema.FiniteFromString, "values", { separator: ";" })
    expect(withPath).type.toBe<Config.Config<{ readonly [x: string]: number }>>()
  })

  it("Array", () => {
    const c = Config.Array(Schema.FiniteFromString)

    expect(c).type.toBe<Config.Config<ReadonlyArray<number>>>()

    const withPath = Config.Array(Schema.FiniteFromString, "values", { separator: ";" })
    expect(withPath).type.toBe<Config.Config<ReadonlyArray<number>>>()
  })

  it("parse", () => {
    const config = Config.String("a")
    const provider = ConfigProvider.fromUnknown({ a: "value" })

    config.parse(provider)
    // @ts-expect-error Expected 1 arguments, but got 2.
    config.parse(provider, ["prefix"])
  })
})
