interface Foo {
  d: number
}

const Foo = Tag<Foo>()

const program = Do(($) => {
  const a = $(Effect.sync(1))
  const b = $(Effect.sync(2))
  const cf = $(Effect.sync(3).fork)
  const c = $(cf.join)
  const foo = $(Effect.service(Foo))
  return a + b + c + foo.d
})

const FooLive = Layer.succeed(Foo, () => ({ d: 4 }))

console.log(program.provideSomeLayer(FooLive).unsafeRunSync())
