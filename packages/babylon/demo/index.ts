import * as B from "../src";
import { effect as T } from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";
import { Vector3, HemisphericLight, PointLight, MeshBuilder, ArcRotateCamera } from "babylonjs";
import { Do } from "fp-ts-contrib/lib/Do";
import { S } from "./scenes";
import { C } from "./cameras";
import { Lazy } from "fp-ts/lib/function";

// WIP
/* istanbul ignore file */

const program = Do(T.effect)
  .bindL("light_1", () =>
    S.main.light.create((s) => new HemisphericLight("light_1", new Vector3(1, 1, 0), s))
  )
  .bindL("light_2", () =>
    S.main.light.create((s) => new PointLight("light_2", new Vector3(1, 1, 0), s))
  )
  .bindL("sphere", ({}) =>
    S.main.mesh.create((s) => MeshBuilder.CreateSphere("sphere", { diameter: 2 }, s))
  )
  .bind("scene", S.main.access)
  .bind("engine", B.engine.accessEngine)
  .doL((s) =>
    T.sync(() => {
      s.engine.runRenderLoop(() => {
        s.scene.render();
      });
    })
  )
  .return(() => {});

const main_canvas = B.canvas("main_canvas");

export const main = pipe(
  program,
  T.chainTap(() => C.main.attachControl(main_canvas.URI)),
  C.main.provide(
    (s) => new ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 2, Vector3.Zero(), s)
  ),
  S.main.provide(),
  B.engine.provideEngine(new B.NullEngine())
);

export const run = (_: Lazy<HTMLElement>) => pipe(main, main_canvas.provide(_), T.runToPromise);
