describe.concurrent("Stream", () => {
  describe.concurrent("paginate", () => {
    it("simple example", async () => {
      const s = Tuple(0, List(1, 2, 3))
      const program = Stream.paginate(
        s,
        ({ tuple: [x, list] }) =>
          list.isNil() ? Tuple(x, Maybe.none) : Tuple(x, Maybe.some(Tuple(list.head, list.tail)))
      ).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(0, 1, 2, 3))
    })
  })

  describe.concurrent("paginateEffect", () => {
    it("simple example", async () => {
      const s = Tuple(0, List(1, 2, 3))
      const program = Stream.paginateEffect(
        s,
        ({ tuple: [x, list] }) =>
          list.isNil() ?
            Effect.sync(Tuple(x, Maybe.none)) :
            Effect.sync(Tuple(x, Maybe.some(Tuple(list.head, list.tail))))
      ).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(0, 1, 2, 3))
    })
  })

  describe.concurrent("paginateChunk", () => {
    it("paginateChunk", async () => {
      const s = Tuple(Chunk.single(0), List(1, 2, 3, 4, 5))
      const pageSize = 2
      const program = Stream.paginateChunk(
        s,
        ({ tuple: [x, list] }) =>
          list.isNil() ?
            Tuple(x, Maybe.none) :
            Tuple(
              x,
              Maybe.some(Tuple(Chunk.from(list.take(pageSize)), List.from(list.skip(pageSize))))
            )
      ).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(0, 1, 2, 3, 4, 5))
    })
  })

  it("paginateChunkEffect", async () => {
    const s = Tuple(Chunk.single(0), List(1, 2, 3, 4, 5))
    const pageSize = 2
    const program = Stream.paginateChunkEffect(
      s,
      ({ tuple: [x, list] }) =>
        list.isNil() ?
          Effect.sync(Tuple(x, Maybe.none)) :
          Effect.sync(
            Tuple(
              x,
              Maybe.some(Tuple(Chunk.from(list.take(pageSize)), List.from(list.skip(pageSize))))
            )
          )
    ).runCollect

    const result = await program.unsafeRunPromise()

    assert.isTrue(result == Chunk(0, 1, 2, 3, 4, 5))
  })
})
