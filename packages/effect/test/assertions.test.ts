import { Cause, Option } from "effect"
import * as assert from "node:assert"
import { assert as vassert, describe, expect, it } from "vitest"

// where `fails: false` there is a problem with the assertion library

describe("node:assert", () => {
  describe("Option", () => {
    describe("none vs some", () => {
      it("deepStrictEqual", { fails: true }, () => {
        assert.deepStrictEqual(Option.none(), Option.some(2))
      })
    })
  })

  describe("Cause", () => {
    describe("sequential vs parallel", () => {
      it("deepStrictEqual", { fails: true }, () => {
        assert.deepStrictEqual(Cause.sequential(Cause.empty, Cause.empty), Cause.parallel(Cause.empty, Cause.empty))
      })
    })
  })
})

describe("vitest assert", () => {
  describe("Option", () => {
    describe("none vs some", () => {
      it("deepStrictEqual", { fails: false }, () => {
        vassert.deepStrictEqual(Option.none(), Option.some(2))
      })
    })
  })

  describe("Cause", () => {
    describe("sequential vs parallel", () => {
      it("deepStrictEqual", { fails: true }, () => {
        vassert.deepStrictEqual(Cause.sequential(Cause.empty, Cause.empty), Cause.parallel(Cause.empty, Cause.empty))
      })
    })
  })
})

describe("expect", () => {
  describe("Option", () => {
    describe("none vs some", () => {
      it("toEqual", { fails: true }, () => {
        expect(Option.none()).toEqual(Option.some(1))
      })

      it("toStrictEqual", { fails: true }, () => {
        expect(Option.none()).toStrictEqual(Option.some(1))
      })
    })
  })

  describe("Cause", () => {
    describe("sequential vs parallel", () => {
      it("toEqual", { fails: false }, () => {
        expect(Cause.sequential(Cause.empty, Cause.empty)).toEqual(Cause.parallel(Cause.empty, Cause.empty))
      })

      it("toStrictEqual", { fails: false }, () => {
        expect(Cause.sequential(Cause.empty, Cause.empty)).toStrictEqual(Cause.parallel(Cause.empty, Cause.empty))
      })
    })
  })
})
