describe.concurrent("DocStream", () => {
  it("isFailedStream", () => {
    assert.isTrue(DocStream.failed.isFailedStream())
    assert.isFalse(DocStream.empty.isFailedStream())
  })

  it("isEmptyStream", () => {
    assert.isTrue(DocStream.empty.isEmptyStream())
    assert.isFalse(DocStream.failed.isEmptyStream())
  })

  it("isCharStream", () => {
    assert.isTrue(DocStream.char("a")(DocStream.empty).isCharStream())
    assert.isFalse(DocStream.empty.isCharStream())
  })

  it("isTextStream", () => {
    assert.isTrue(DocStream.text("foo")(DocStream.empty).isTextStream())
    assert.isFalse(DocStream.empty.isTextStream())
  })

  it("isLineStream", () => {
    assert.isTrue(DocStream.line(4)(DocStream.empty).isLineStream())
    assert.isFalse(DocStream.empty.isLineStream())
  })

  it("isPushAnnotationStream", () => {
    assert.isTrue(DocStream.pushAnnotation(1)(DocStream.empty).isPushAnnotationStream())
    assert.isFalse(DocStream.empty.isPushAnnotationStream())
  })

  it("isPopAnnotationStream", () => {
    assert.isTrue(DocStream.popAnnotation(DocStream.empty).isPopAnnotationStream())
    assert.isFalse(DocStream.empty.isPopAnnotationStream())
  })
})
