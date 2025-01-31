import * as DocStream from "@effect/printer/DocStream"
import { describe, expect, it } from "@effect/vitest"

describe.concurrent("DocStream", () => {
  it("isFailedStream", () => {
    expect(DocStream.isFailedStream(DocStream.failed)).toBe(true)
    expect(DocStream.isFailedStream(DocStream.empty)).toBe(false)
  })

  it("isEmptyStream", () => {
    expect(DocStream.isEmptyStream(DocStream.empty)).toBe(true)
    expect(DocStream.isEmptyStream(DocStream.failed)).toBe(false)
  })

  it("isCharStream", () => {
    expect(DocStream.isCharStream(DocStream.char(DocStream.empty, "a"))).toBe(true)
    expect(DocStream.isCharStream(DocStream.empty)).toBe(false)
  })

  it("isTextStream", () => {
    expect(DocStream.isTextStream(DocStream.text(DocStream.empty, "foo"))).toBe(true)
    expect(DocStream.isTextStream(DocStream.empty)).toBe(false)
  })

  it("isLineStream", () => {
    expect(DocStream.isLineStream(DocStream.line(DocStream.empty, 4))).toBe(true)
    expect(DocStream.isLineStream(DocStream.empty)).toBe(false)
  })

  it("isPushAnnotationStream", () => {
    expect(DocStream.isPushAnnotationStream(DocStream.pushAnnotation(DocStream.empty, 1))).toBe(
      true
    )
    expect(DocStream.isPushAnnotationStream(DocStream.empty)).toBe(false)
  })

  it("isPopAnnotationStream", () => {
    expect(DocStream.isPopAnnotationStream(DocStream.popAnnotation(DocStream.empty))).toBe(true)
    expect(DocStream.isPopAnnotationStream(DocStream.empty)).toBe(false)
  })
})
