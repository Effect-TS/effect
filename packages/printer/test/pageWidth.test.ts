describe.concurrent("PageWidth", () => {
  it("remainingWidth", () => {
    assert.strictEqual(PageWidth.remainingWidth(80, 1, 4, 40), 40)
  })
})
