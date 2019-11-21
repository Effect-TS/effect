import * as T from "../src";
import { pipe } from "fp-ts/lib/pipeable";

T.right(1); // $ExpectType Effect<unknown, never, number>

interface EnvA {
  envA: {
    foo: string;
  };
}

interface EnvB {
  envB: {
    foo: string;
  };
}

const fa = T.accessM(({ envA }: EnvA) => T.right(envA.foo));
const fb = T.accessM(({ envB }: EnvB) => T.right(envB.foo));

const program = T.effectMonad.chain(fa, _ => fb); // $ExpectType Effect<EnvA & EnvB, never, string>

const fae = T.accessM(({ envA }: EnvA) => T.left(envA.foo));

T.effectMonad.chain(fae, _ => fb); // $ExpectType Effect<EnvA & EnvB, string, string>

T.provide<EnvA>({} as EnvA)(program); // $ExpectType Effect<EnvB, never, string>

const module = pipe(T.noEnv, T.mergeEnv({} as EnvB), T.mergeEnv({} as EnvA)); // $ExpectType EnvA & EnvB

T.provide(module)(program); // $ExpectType Effect<unknown, never, string>
