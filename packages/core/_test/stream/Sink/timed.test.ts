describe.concurrent("Sink", () => {
  describe.concurrent("timed", () => {
    it("should time execution of a sink", async () => {
      const program = Stream.fromCollection(Chunk(1, 10))
        .mapEffect((i) => Clock.sleep((10).millis).as(i))
        .run(Sink.$.timed());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result.millis >= 10);
    });
  });
});
