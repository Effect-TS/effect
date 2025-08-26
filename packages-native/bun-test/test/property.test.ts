import { describe, expect } from "bun:test"
import * as Effect from "effect/Effect"
import * as fc from "effect/FastCheck"
import * as Schema from "effect/Schema"
import * as BunTest from "../src/index.js"

describe("Property-based testing", () => {
  describe("Schema-based properties", () => {
    BunTest.it.prop(
      "numbers should be commutative",
      { a: Schema.Number, b: Schema.Number },
      ({ a, b }) =>
        Effect.gen(function*() {
          expect(a + b).toBe(b + a)
          expect(a * b).toBe(b * a)
        })
    )

    BunTest.it.prop(
      "strings should concatenate correctly",
      { s1: Schema.String, s2: Schema.String },
      ({ s1, s2 }) =>
        Effect.gen(function*() {
          const concatenated = s1 + s2
          expect(concatenated.startsWith(s1)).toBe(true)
          expect(concatenated.endsWith(s2)).toBe(true)
          expect(concatenated.length).toBe(s1.length + s2.length)
        })
    )

    BunTest.it.prop(
      "arrays should maintain length after map",
      { arr: Schema.Array(Schema.Number) },
      ({ arr }) =>
        Effect.gen(function*() {
          const mapped = arr.map((x) => x * 2)
          expect(mapped.length).toBe(arr.length)
        })
    )
  })

  describe("FastCheck arbitraries", () => {
    BunTest.it.prop(
      "positive integers should be greater than zero",
      { n: fc.integer({ min: 1 }) },
      ({ n }) =>
        Effect.gen(function*() {
          expect(n).toBeGreaterThan(0)
        })
    )

    BunTest.it.prop(
      "email-like strings should contain @",
      {
        user: fc.stringMatching(/^[a-z]+$/),
        domain: fc.stringMatching(/^[a-z]+\.[a-z]+$/)
      },
      ({ domain, user }) =>
        Effect.gen(function*() {
          const email = `${user}@${domain}`
          expect(email).toContain("@")
          expect(email.split("@")).toHaveLength(2)
        })
    )

    BunTest.it.prop(
      "record operations should be consistent",
      {
        record: fc.dictionary(fc.string(), fc.integer())
      },
      ({ record }) =>
        Effect.gen(function*() {
          const keys = Object.keys(record)
          const values = Object.values(record)

          expect(keys.length).toBe(values.length)

          keys.forEach((key) => {
            expect(record).toHaveProperty(key)
            expect(typeof record[key]).toBe("number")
          })
        })
    )
  })

  describe("Mixed Schema and FastCheck", () => {
    BunTest.it.prop(
      "mixed arbitraries should work together",
      {
        schemaNum: Schema.Number,
        fcString: fc.string(),
        schemaBool: Schema.Boolean,
        fcArray: fc.array(fc.integer())
      },
      ({ fcArray, fcString, schemaBool, schemaNum }) =>
        Effect.gen(function*() {
          expect(typeof schemaNum).toBe("number")
          expect(typeof fcString).toBe("string")
          expect(typeof schemaBool).toBe("boolean")
          expect(Array.isArray(fcArray)).toBe(true)
        })
    )
  })

  describe("Array-based properties", () => {
    BunTest.it.prop(
      "array syntax should work",
      [Schema.Number, Schema.String, Schema.Boolean],
      ([num, str, bool]) =>
        Effect.gen(function*() {
          expect(typeof num).toBe("number")
          expect(typeof str).toBe("string")
          expect(typeof bool).toBe("boolean")
        })
    )

    BunTest.it.prop(
      "mixed array syntax",
      [fc.nat(), Schema.String, fc.boolean()],
      ([nat, str, bool]) =>
        Effect.gen(function*() {
          expect(nat).toBeGreaterThanOrEqual(0)
          expect(typeof str).toBe("string")
          expect(typeof bool).toBe("boolean")
        })
    )
  })

  describe("Property options", () => {
    BunTest.it.prop(
      "should respect FastCheck parameters",
      { n: fc.integer() },
      ({ n }) =>
        Effect.gen(function*() {
          expect(typeof n).toBe("number")
        }),
      {
        timeout: 1000,
        fastCheck: {
          numRuns: 10, // Run fewer times for this test
          seed: 42 // Fixed seed for reproducibility
        }
      }
    )
  })

  describe("Non-effect properties", () => {
    BunTest.prop(
      "should support synchronous property tests",
      { a: Schema.Number, b: Schema.Number },
      ({ a, b }) => {
        // Regular assertions without Effect
        // Skip NaN values as they don't behave normally with comparisons
        if (isNaN(a) || isNaN(b)) return

        expect(Math.max(a, b)).toBeGreaterThanOrEqual(a)
        expect(Math.max(a, b)).toBeGreaterThanOrEqual(b)
        expect(Math.min(a, b)).toBeLessThanOrEqual(a)
        expect(Math.min(a, b)).toBeLessThanOrEqual(b)
      }
    )
  })

  describe("Complex schemas", () => {
    const PersonSchema = Schema.Struct({
      name: Schema.String,
      age: Schema.Number.pipe(Schema.int(), Schema.positive()),
      email: Schema.String.pipe(Schema.pattern(/^[^@]+@[^@]+$/))
    })

    BunTest.it.prop(
      "structured data properties",
      { person: PersonSchema },
      ({ person }) =>
        Effect.gen(function*() {
          expect(person.name).toBeTruthy()
          expect(person.age).toBeGreaterThan(0)
          expect(person.age % 1).toBe(0) // Is integer
          expect(person.email).toContain("@")
        })
    )
  })
})
