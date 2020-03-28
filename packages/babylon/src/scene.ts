import * as BAB from "babylonjs";
import { effect as T } from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";
import { accessEngine } from "./engine";
import { sequenceS } from "fp-ts/lib/Apply";

// WIP
/* istanbul ignore file */

export const SceneURI = "@matechs/babylon/SceneURI";

export interface SceneService {
  accessScene: T.UIO<BAB.Scene>;
}

export interface Scene<URI extends string | symbol> {
  [SceneURI]: {
    [k in URI]: SceneService;
  };
}

export const accessScene = <URI extends string | symbol>(URI: URI) =>
  T.accessM((_: Scene<URI>) => _[SceneURI][URI].accessScene);

export const provideScene = <URI extends string | symbol>(URI: URI) => (_?: BAB.SceneOptions) =>
  T.provideSW<Scene<URI>>()(
    sequenceS(T.effect)({
      engine: accessEngine,
      env: T.accessEnvironment<{}>()
    })
  )(({ engine, env }) => ({
    ...env,
    [SceneURI]: {
      ...env[SceneURI],
      [URI]: {
        accessScene: T.sync(() => new BAB.Scene(engine, _))
      }
    }
  }));

export const withSceneM = <URI extends string | symbol>(URI: URI) => <R, E, A>(
  f: (_: BAB.Scene) => T.Effect<R, E, A>
) => pipe(accessScene(URI), T.chain(f));
