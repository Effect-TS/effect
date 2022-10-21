describe.concurrent("Stream", () => {
  describe.concurrent("paginate", () => {
    it("simple example", async () => {
      const s = [0 as number, List(1, 2, 3)] as const
      const program = Stream.paginate(
        s,
        ([x, list]) =>
          list.isNil() ?
            [x, Maybe.none] as const :
            [x, Maybe.some([list.head, list.tail] as const)] as const
      ).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(0, 1, 2, 3))
    })
  })

  describe.concurrent("paginateEffect", () => {
    it("simple example", async () => {
      const s = [0, List(1, 2, 3)] as readonly [number, List<number>]
      const program = Stream.paginateEffect(
        s,
        ([x, list]) =>
          list.isNil() ?
            Effect.sync([x, Maybe.none] as const) :
            Effect.sync([x, Maybe.some([list.head, list.tail] as const)] as const)
      ).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(0, 1, 2, 3))
    })
  })

  describe.concurrent("paginateChunk", () => {
    it("paginateChunk", async () => {
      const s = [Chunk.single(0), List(1, 2, 3, 4, 5)] as const
      const pageSize = 2
      const program = Stream.paginateChunk(
        s,
        ([x, list]) =>
          list.isNil() ?
            [x, Maybe.none] as const :
            [
              x,
              Maybe.some([Chunk.from(list.take(pageSize)), List.from(list.skip(pageSize))] as const)
            ] as const
      ).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(0, 1, 2, 3, 4, 5))
    })
  })

  it("paginateChunkEffect", async () => {
    const s = [Chunk.single(0), List(1, 2, 3, 4, 5)] as const
    const pageSize = 2
    const program = Stream.paginateChunkEffect(
      s,
      ([x, list]) =>
        list.isNil() ?
          Effect.sync([x, Maybe.none] as const) :
          Effect.sync(
            [
              x,
              Maybe.some([Chunk.from(list.take(pageSize)), List.from(list.skip(pageSize))] as const)
            ] as const
          )
    ).runCollect

    const result = await program.unsafeRunPromise()

    assert.isTrue(result == Chunk(0, 1, 2, 3, 4, 5))
  })
})
