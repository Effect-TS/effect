import * as BAB from "babylonjs";
import { effect as T } from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";
import { accessScene } from "./scene";
import { sequenceS } from "fp-ts/lib/Apply";
import { accessCanvas } from "./canvas";

// WIP
/* istanbul ignore file */

export const CameraURI = "@matechs/babylon/CameraURI";

export interface CameraService {
  accessCamera: T.UIO<BAB.Camera>;
}

export interface Camera<URI extends string | symbol> {
  [CameraURI]: {
    [k in URI]: CameraService;
  };
}

export const accessCamera = <URI extends string | symbol>(URI: URI) =>
  T.accessM((_: Camera<URI>) => _[CameraURI][URI].accessCamera);

export const provideCamera = <SceneURI extends string | symbol>(SceneURI: SceneURI) => <
  URI extends string | symbol
>(
  URI: URI
) => (f: (_: BAB.Scene) => BAB.Camera) =>
  T.provideSW<Camera<URI>>()(
    sequenceS(T.effect)({
      scene: accessScene(SceneURI),
      env: T.accessEnvironment<{}>()
    })
  )(({ scene, env }) => ({
    ...env,
    [CameraURI]: {
      ...env[CameraURI],
      [URI]: {
        accessCamera: T.sync(() => f(scene))
      }
    }
  }));

export const attachControl = <URI extends string | symbol>(URI: URI) => <
  CanvasURI extends string | symbol
>(
  CanvasURI: CanvasURI,
  noPreventDefault?: boolean
) =>
  pipe(
    sequenceS(T.effect)({
      camera: accessCamera(URI),
      canvas: accessCanvas(CanvasURI)
    }),
    T.chain(({ camera, canvas }) =>
      T.sync(() => {
        camera.attachControl(canvas, noPreventDefault);
      })
    )
  );
