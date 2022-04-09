describe.concurrent("Fiber", () => {
  describe.concurrent("join on interrupted Fiber", () => {
    it("is inner interruption", async () => {
      const fiberId = FiberId(0, 123, TraceElement.empty);
      const program = Fiber.interruptAs(fiberId).join();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(
        result.isFailure() &&
          result.cause.isInterruptType() &&
          (result.cause.fiberId == fiberId)
      );
    });
  });
});
