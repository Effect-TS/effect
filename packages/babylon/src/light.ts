import { effect as T } from "@matechs/effect";
import * as BAB from "babylonjs";
import { withSceneM } from "./scene";

// WIP
/* istanbul ignore file */

export const createLight = <URI extends string | symbol>(URI: URI) => <L extends BAB.Light>(
  f: (_: BAB.Scene) => L
) => withSceneM(URI)((s) => T.sync(() => f(s)));
