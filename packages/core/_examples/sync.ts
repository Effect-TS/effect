interface Foo {
  d: number
}

const Foo = Tag<Foo>()

const program = Do(($) => {
  const a = $(Effect.succeed(1))
  const b = $(Effect.succeed(2))
  const cf = $(Effect.succeed(3).fork)
  const c = $(cf.join)
  const foo = $(Effect.service(Foo))
  return a + b + c + foo.d
})

const FooLive = Layer.sync(Foo, () => ({ d: 4 }))

console.log(program.provideSomeLayer(FooLive).unsafeRunSync())
