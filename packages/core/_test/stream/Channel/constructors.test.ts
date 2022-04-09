describe.concurrent("Channel", () => {
  it("succeed", async () => {
    const program = Channel.succeed(1).runCollect();

    const {
      tuple: [chunk, z]
    } = await program.unsafeRunPromise();

    assert.isTrue(chunk.isEmpty());
    assert.strictEqual(z, 1);
  });

  it("fail", async () => {
    const program = Channel.fail("uh oh").runCollect();

    const result = await program.unsafeRunPromiseExit();

    assert.isTrue(result.untraced() == Exit.fail("uh oh"));
  });
});
