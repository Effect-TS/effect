import { Brand, Schema } from "effect"
import { describe, expect, it } from "tstyche"

describe("Brand", () => {
  it("FromConstructor", () => {
    type Positive = number & Brand.Brand<"Positive">
    const Positive = Brand.check<Positive>(Schema.isGreaterThan(0))
    expect<Brand.Brand.FromConstructor<typeof Positive>>().type.toBe<Positive>()
  })

  it("Unbranded", () => {
    type Positive = number & Brand.Brand<"Positive">
    expect<Brand.Brand.Unbranded<Positive>>().type.toBe<number>()

    type PositiveInt = number & Brand.Brand<"Int"> & Brand.Brand<"Positive">
    expect<Brand.Brand.Unbranded<PositiveInt>>().type.toBe<number>()
  })

  it("Keys", () => {
    type Positive = number & Brand.Brand<"Positive">
    expect<Brand.Brand.Keys<Positive>>().type.toBe<"Positive">()

    type PositiveInt = number & Brand.Brand<"Int"> & Brand.Brand<"Positive">
    expect<Brand.Brand.Keys<PositiveInt>>().type.toBe<"Int" | "Positive">()
  })

  it("Brands", () => {
    type Positive = number & Brand.Brand<"Positive">
    expect<Brand.Brand.Brands<Positive>>().type.toBe<Brand.Brand<"Positive">>()

    type PositiveInt = number & Brand.Brand<"Int"> & Brand.Brand<"Positive">
    expect<Brand.Brand.Brands<PositiveInt>>().type.toBe<Brand.Brand<"Int"> & Brand.Brand<"Positive">>()

    type PositiveIntWithParser = number & Brand.Brand<"Int", IntParser> & Brand.Brand<"Positive">
    interface IntParser {
      value: unknown
      result: this["value"] extends number ? `${this["value"]}` extends `${bigint}` ? this["value"]
        : { IntParserError: "Expected an interger" }
        : number
    }
    expect<Brand.Brand.Brands<PositiveIntWithParser>>().type.toBe<
      Brand.Brand<"Int", IntParser> & Brand.Brand<"Positive">
    >()
  })

  it("EnsureCommonBase", () => {
    type Int = number & Brand.Brand<"Int">
    const Int = Brand.check<Int>(Schema.isInt())

    type Positive = number & Brand.Brand<"Positive">
    const Positive = Brand.check<Positive>(Schema.isGreaterThan(0))

    expect<Brand.Brand.EnsureCommonBase<[typeof Positive, typeof Int]>>().type.toBe<[typeof Positive, typeof Int]>()

    type MyString = string & Brand.Brand<"MyString">
    const MyString = Brand.nominal<MyString>()

    expect<Brand.Brand.EnsureCommonBase<[typeof MyString, typeof Int]>>().type.toBe<
      [typeof MyString, "ERROR: All brands should have the same base type"]
    >()
  })

  describe("literal", () => {
    it("parses the value using the parser on the brand", () => {
      type Int = number & Brand.Brand<"Int", IntParser>
      interface IntParser {
        value: unknown
        result: this["value"] extends number ? `${this["value"]}` extends `${bigint}` ? this["value"]
          : { IntParserError: "Expected an integer" }
          : number
      }

      const Int = Brand.make<Int>((n) => Number.isInteger(n))

      // @ts-expect-error Argument of type 'number' is not assignable to parameter of type 'number & { IntParserError: "Expected an integer"; }'
      Int.literal(3.14)
      Int.literal(42)
      Int.literal(-1)

      type StateMachine =
        & { initial: string; states: Record<string, string> }
        & Brand.Brand<"StateMachine", StateMachineParser>
      interface StateMachineParser {
        value: unknown
        result: this["value"] extends infer Value extends Brand.Brand.Unbranded<StateMachine>
          ? { initial: keyof Value["states"]; states: Record<string, keyof Value["states"]> }
          : Brand.Brand.Unbranded<StateMachine>
      }
      const StateMachine = Brand.nominal<StateMachine>()

      StateMachine.literal({
        // @ts-expect-error Type '"LOL"' is not assignable to type '"YELLOW" | "RED" | "GREEN"'
        initial: "LOL",
        states: {
          RED: "YELLOW",
          YELLOW: "GREEN",
          GREEN: "RED"
        }
      })

      StateMachine.literal({
        initial: "RED",
        states: {
          RED: "YELLOW",
          YELLOW: "GREEN",
          GREEN: "RED"
        }
      })
    })

    it("parses the value using all parsers on the brand", () => {
      type Int = number & Brand.Brand<"Int", IntParser>
      interface IntParser {
        value: unknown
        result: this["value"] extends number ? `${this["value"]}` extends `${bigint}` ? this["value"]
          : { IntParserError: "Expected an integer" }
          : number
      }
      const Int = Brand.make<Int>((n) => Number.isInteger(n))

      type Positive = number & Brand.Brand<"Positive", PositiveParser>
      interface PositiveParser {
        value: unknown
        result: this["value"] extends number
          ? `${this["value"]}` extends `-${number}` ? { PositiveParserError: "Expected a positive number" }
          : this["value"]
          : number
      }
      const Positive = Brand.make<Positive>((n) => n > 0)

      const PositiveInt = Brand.all(Int, Positive)

      // @ts-expect-error Argument of type 'number' is not assignable to parameter of type 'number & { IntParserError: "Expected an integer"; } & { PositiveParserError: "Expected a positive number"; }'
      PositiveInt.literal(-1.2)

      // @ts-expect-error Argument of type '1.2' is not assignable to parameter of type '{ IntParserError: "Expected an integer"; } & 1.2'
      PositiveInt.literal(1.2)

      // @ts-expect-error Argument of type '-1' is not assignable to parameter of type '-1 & { PositiveParserError: "Expected a positive number"; }'
      PositiveInt.literal(-1)

      PositiveInt.literal(1)
    })
  })
})
