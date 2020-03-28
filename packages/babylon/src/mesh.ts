import { effect as T } from "@matechs/effect";
import * as BAB from "babylonjs";
import { withSceneM } from "./scene";

// WIP
/* istanbul ignore file */

export const createMesh = <URI extends string | symbol>(URI: URI) => <M extends BAB.Mesh>(
  f: (_: BAB.Scene) => M
) => withSceneM(URI)((s) => T.sync(() => f(s)));
