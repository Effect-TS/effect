import type { Duration, Effect, Option, Result } from "effect"
import { type AiError, Extraction, ExtractionModel } from "effect/ai"
import { describe, expect, it } from "tstyche"

const Invoice = Extraction.make({
  fields: {
    invoiceNumber: Extraction.text(),
    total: Extraction.number(),
    dueDate: Extraction.date(),
    terms: Extraction.duration({ unit: "days" }),
    contacts: Extraction.list({ items: "text" }),
    prices: Extraction.list({ items: "number" }),
    daysToPay: Extraction.estimate({ min: 0, max: 120 }),
    paidBy: Extraction.estimate({ min: "2026-09-02", max: "2027-01-01" }),
    nextOrders: Extraction.forecast({ min: 0, max: 100, horizon: 3 })
  }
})

const extract = ExtractionModel.extract(Invoice, { text: "Invoice INV-2291" })
declare const answers: Extraction.Answers<typeof Invoice.fields>

describe("ExtractionModel", () => {
  it("requires only the ExtractionModel service and fails with AiError", () => {
    expect<Effect.Services<typeof extract>>().type.toBe<ExtractionModel.ExtractionModel>()
    expect<Effect.Error<typeof extract>>().type.toBe<AiError.AiError>()
  })

  it("infers each answer from its field", () => {
    expect(answers.invoiceNumber).type.toBeAssignableTo<Extraction.ValueAnswer<string>>()
    expect(answers.total).type.toBeAssignableTo<Extraction.ValueAnswer<number>>()
    expect(answers.terms).type.toBeAssignableTo<Extraction.ValueAnswer<Duration.Duration>>()
    expect(answers.contacts.items[0]!.value).type.toBe<string>()
    expect(answers.prices.items[0]!.value).type.toBe<number>()
    expect(answers.daysToPay.p90).type.toBe<number>()
    expect(answers.paidBy.p90).type.toBe<string>()
    expect(answers.nextOrders.steps[0]!.median).type.toBe<number>()
  })

  it("narrows Found and Absent by tag", () => {
    const total = answers.total
    if (total._tag === "Found") {
      expect(total.value).type.toBe<number>()
    } else {
      expect(total.guess).type.toBe<number | undefined>()
      expect(total.field).type.toBe<string>()
    }
  })

  it("converts single-value answers to Result and Option", () => {
    expect(Extraction.toResult(answers.terms)).type.toBe<
      Result.Result<Duration.Duration, Extraction.Absent<Duration.Duration>>
    >()
    expect(Extraction.toOption(answers.dueDate)).type.toBe<Option.Option<string>>()
    expect(Extraction.toResult).type.not.toBeCallableWith(answers.contacts)
  })

  it("rejects mixed estimate bounds", () => {
    expect(Extraction.estimate).type.not.toBeCallableWith({ min: 0, max: "2027-01-01" })
  })
})
