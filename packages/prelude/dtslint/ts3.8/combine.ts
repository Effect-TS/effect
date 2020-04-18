import { T, MIO, combineProviders } from "../../src";

interface A {
  a: {};
}

interface B {
  b: {};
}

interface C {
  c: {};
}

interface D {
  d: {};
}

interface E {
  e: {};
}

declare const providerA: T.Provider<B, A>;
declare const providerC: T.Provider<D & E, C>;
declare const providerB: T.Provider<unknown, B, "errB", unknown>;
declare const providerD: T.Provider<E, D, never>;
declare const providerE: T.Provider<unknown, E>;
declare const providerF: T.Provider<unknown, E, unknown>;

// $ExpectType Provider<B & E, A & C & D, never, never>
combineProviders().with(providerA).with(providerC).with(providerD).asEffect();

// $ExpectType Provider<E, A & C & D & B, "errB", unknown>
combineProviders().with(providerA).with(providerC).with(providerD).with(providerB).asEffect();

// $ExpectType Provider<unknown, A & C & D & B & E, "errB", unknown>
combineProviders()
  .with(providerA)
  .with(providerC)
  .with(providerD)
  .with(providerB)
  .with(providerE)
  .asEffect();

declare const provider2A: MIO.Provider<B, A>;
declare const provider2C: MIO.Provider<D & E, C>;
declare const provider2B: MIO.Provider<unknown, B, "errB">;
declare const provider2D: MIO.Provider<E, D>;

// $ExpectType Provider<E, A & C & D & B, "errB">
combineProviders().with(provider2A).with(provider2C).with(provider2D).with(provider2B).asMIO();

// $ExpectType Provider<E, A & C & D & B, "errB">
combineProviders().with(provider2A).with(providerC).with(provider2D).with(provider2B).asMIO();

// $ExpectType Provider<E, A & C & D & B, "errB", unknown>
combineProviders().with(provider2A).with(providerC).with(provider2D).with(provider2B).asEffect();
