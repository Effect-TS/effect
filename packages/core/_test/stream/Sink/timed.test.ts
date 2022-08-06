describe.concurrent("Sink", () => {
  describe.concurrent("timed", () => {
    it("should time execution of a sink", () =>
      Do(($) => {
        const sink = Sink.$.timed()
        const stream = Stream.fromCollection(Chunk(1, 10))
          .mapEffect((i) => Clock.sleep((10).millis).as(i))
        const result = $(stream.run(sink))
        assert.isTrue(result.millis >= 10)
      }).unsafeRunPromise())
  })
})
