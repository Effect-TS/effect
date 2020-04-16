import { Effect as T, flowP } from "../../src";

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
declare const providerB: T.Provider<unknown, B, "errB">;
declare const providerD: T.Provider<E, D, "errD">;
declare const providerE: T.Provider<unknown, E>;

// $ExpectType Provider<B & E, A & C & D, "errD">
flowP(providerA).flow(providerC).flow(providerD).done();

// $ExpectType Provider<E, A & C & D & B, "errB" | "errD">
flowP(providerA).flow(providerC).flow(providerD).flow(providerB).done();

// $ExpectType Provider<unknown, A & C & D & B & E, "errB" | "errD">
flowP(providerA).flow(providerC).flow(providerD).flow(providerB).flow(providerE).done();
