function fib(n: number): Effect<never, never, number> {
  if (n < 2) {
    return Effect.sync(1)
  }
  return Effect.suspendSucceed(fib(n - 1)).zipWith(
    Effect.suspendSucceed(fib(n - 2)),
    (a, b) => a + b
  )
}

console.time("FIB10")
fib(10).unsafeRunPromise().then(() => console.timeEnd("FIB10"))
