import * as S from "../src/Core/DocStream"

describe("DocStream", () => {
  describe("destructors", () => {
    it("match", () => {
      const match = S.match({
        FailedStream: () => "FailedStream",
        EmptyStream: () => "EmptyStream",
        CharStream: () => "CharStream",
        TextStream: () => "TextStream",
        LineStream: () => "LineStream",
        PushAnnotationStream: () => "PushAnnotationStream",
        PopAnnotationStream: () => "PopAnnotationStream"
      })

      expect(match(S.failed)).toBe("FailedStream")
      expect(match(S.empty)).toBe("EmptyStream")
      expect(match(S.char_(S.empty, "a"))).toBe("CharStream")
      expect(match(S.text_(S.empty, "foo"))).toBe("TextStream")
      expect(match(S.line_(S.empty, 4))).toBe("LineStream")
      expect(match(S.pushAnnotation_(S.empty, 1))).toBe("PushAnnotationStream")
      expect(match(S.popAnnotation(S.empty))).toBe("PopAnnotationStream")
    })
  })

  describe("operations", () => {
    it("isFailedStream", () => {
      expect(S.isFailedStream(S.failed)).toBeTruthy()
      expect(S.isFailedStream(S.empty)).toBeFalsy()
    })

    it("isEmptyStream", () => {
      expect(S.isEmptyStream(S.empty)).toBeTruthy()
      expect(S.isEmptyStream(S.failed)).toBeFalsy()
    })

    it("isCharStream", () => {
      expect(S.isCharStream(S.char_(S.empty, "a"))).toBeTruthy()
      expect(S.isCharStream(S.empty)).toBeFalsy()
    })

    it("isTextStream", () => {
      expect(S.isTextStream(S.text_(S.empty, "foo"))).toBeTruthy()
      expect(S.isTextStream(S.empty)).toBeFalsy()
    })

    it("isLineStream", () => {
      expect(S.isLineStream(S.line_(S.empty, 4))).toBeTruthy()
      expect(S.isLineStream(S.empty)).toBeFalsy()
    })

    it("isPushAnnotationStream", () => {
      expect(S.isPushAnnotationStream(S.pushAnnotation_(S.empty, 1))).toBeTruthy()
      expect(S.isPushAnnotationStream(S.empty)).toBeFalsy()
    })

    it("isPopAnnotationStream", () => {
      expect(S.isPopAnnotationStream(S.popAnnotation(S.empty))).toBeTruthy()
      expect(S.isPopAnnotationStream(S.empty)).toBeFalsy()
    })
  })
})
