describe.concurrent("Chunk", () => {
  it("collectEffect", async () => {
    const chunk = Chunk(0, 1, 2, 3)

    const result = await chunk
      .collectEffect((n) => (n >= 2 ? Maybe.some(Effect.sync(n)) : Maybe.none))
      .unsafeRunPromise()

    assert.isTrue(result == Chunk(2, 3))
  })

  it("dropWhileEffect", async () => {
    const chunk = Chunk(0, 1, 2, 3, 4)

    const result = await chunk
      .dropWhileEffect((n) => Effect.sync(n < 2))
      .unsafeRunPromise()

    assert.isTrue(result == Chunk(2, 3, 4))
  })

  it("filterEffect", async () => {
    const chunk = Chunk(0, 1, 2, 3, 4)

    const result = await chunk
      .filterEffect((n) => Effect.sync(n >= 2))
      .unsafeRunPromise()

    assert.isTrue(result == Chunk(2, 3, 4))
  })

  it("reduceEffect", async () => {
    const order: Array<number> = []
    const chunk = Chunk(0, 1, 2, 3, 4)

    const result = await chunk
      .reduceEffect(0, (s, a) =>
        Effect.sync(() => {
          order.push(a)
          return s + a
        }))
      .unsafeRunPromise()

    assert.isTrue(order == Chunk(0, 1, 2, 3, 4))
    assert.strictEqual(result, 10)
  })

  it("reduceRightEffect", async () => {
    const order: Array<number> = []
    const chunk = Chunk(0, 1, 2, 3, 4)

    const result = await chunk
      .reduceRightEffect(0, (a, s) =>
        Effect.sync(() => {
          order.push(a)
          return a + s
        }))
      .unsafeRunPromise()

    assert.isTrue(order == Chunk(4, 3, 2, 1, 0))
    assert.strictEqual(result, 10)
  })

  it("findEffect - found", async () => {
    const chunk = Chunk(1, 2, 3, 4)

    const result = await chunk
      .findEffect((a) => Effect.sync(a === 3))
      .fold(
        () => -1,
        (option) =>
          option.fold(
            () => -1,
            (n) => n
          )
      )
      .unsafeRunPromise()

    assert.strictEqual(result, 3)
  })

  it("findEffect - not found", async () => {
    const chunk = Chunk(1, 2, 3, 4)

    const result = await chunk
      .findEffect((a) => Effect.sync(a === 20))
      .fold(
        () => -1,
        (option) =>
          option.fold(
            () => 42,
            (n) => n
          )
      )
      .unsafeRunPromise()

    assert.strictEqual(result, 42)
  })

  it("findEffect - failing predicate", async () => {
    const chunk = Chunk(1, 2, 3, 4)

    const result = await chunk
      .findEffect((a) => Effect.failSync("Error"))
      .unsafeRunPromiseExit()

    assert.isTrue(result == Exit.fail("Error"))
  })
})
