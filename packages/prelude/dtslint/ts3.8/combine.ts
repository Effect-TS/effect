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
combineProviders().with(providerA).with(providerC).with(providerD).done();

// $ExpectType Provider<E, A & C & D & B, "errB", unknown>
combineProviders().with(providerA).with(providerC).with(providerD).with(providerB).done();

// $ExpectType Provider<unknown, A & C & D & B & E, "errB", unknown>
combineProviders()
  .with(providerA)
  .with(providerC)
  .with(providerD)
  .with(providerB)
  .with(providerE)
  .done();
