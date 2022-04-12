export const numbers = Effect(0) + Effect(1) + Effect(2);
export const numbersPar = Effect(0) & Effect(1) & Effect(2);

export const isPositive = (n: number) => n > 0 ? Either("positive") : Either.left("negative");

export const isPositiveEff = (n: number) => n > 0 ? Effect("positive") : Effect.fail("negative");

export interface Foo {
  readonly foo: string;
}

export const FooTag = Service.Tag<Foo>();

export interface Bar {
  readonly bar: string;
}

export const BarTag = Service.Tag<Bar>();

export const switched = (n: number) => {
  switch (n) {
    case 0:
      return Effect(0 as const);
    case 1:
      return Effect.fail(1 as const);
    case 2:
      return Effect(2 as const);
    case 3:
      return Effect.fail(3 as const);
    case 4:
      return Effect.environmentWithEffect((env: Env<Has<Bar>>) => Effect.die(env.get(BarTag).bar));
    default:
      return Effect.environmentWithEffect((env: Env<Has<Foo>>) => Effect.die(env.get(FooTag).foo));
  }
};

export const message = isPositive(10);
export const messageLeft = message.left.value;

if (message.isLeft()) {
  console.log(message.left);
}

export const program = (numbers + numbersPar).flatMap(
  ({ tuple: [a, b, c, d, e, f] }) =>
    Effect.log(`yay: ${a}`) >
      Effect.logInfo(`ok: ${b}`) >
      Effect.logWarning(`maybe: ${c}`) >
      Effect.log(`yay: ${d}`) >
      Effect.logInfo(`ok: ${e}`) >
      Effect.logWarning(`maybe: ${f}`)
);

export const executeOrDie = Effect.fail("error") | program;

program.apply(LogLevel(LogLevel.Error)).unsafeRunPromise();

export const useHashMap = HashMap(Tuple("foo", "map-foo"), Tuple("bar", "map-bar")) +
  HashMap(Tuple("baz", "map-baz"), Tuple("tap", "map-tap"));

export const accessHashMap = useHashMap["foo"].value;
