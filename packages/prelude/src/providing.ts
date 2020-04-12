import { eff as EFF } from "@matechs/effect";
import { Any } from "./definitions";
import { RT } from "./manipulations";

export type Providing<K extends Any, R1, RP = unknown, SP = never, EP = never> = K extends Any<
  infer R & R1,
  infer E,
  infer A
>
  ? unknown extends ReturnType<K["_S"]> | SP
    ? RT<EFF.AsyncEff<R & RP, E | EP, A>>
    : RT<EFF.SyncEff<R & RP, E | EP, A>>
  : never;

export interface Provider<Req, Mod, SP, EP> {
  <K extends Any>(e: K): Providing<K, Mod, Req, SP, EP>;
}
