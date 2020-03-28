import { provideEngine, accessEngine } from "./engine";
import { provideScene, accessScene } from "./scene";
import { accessCamera, provideCamera, attachControl } from "./camera";
import { accessCanvas, provideCanvas } from "./canvas";
import { createLight } from "./light";
import { createMesh } from "./mesh";

// WIP
/* istanbul ignore file */

const engine = {
  provideEngine,
  accessEngine
};

const scene = <URI extends string | symbol>(URI: URI) => ({
  provide: provideScene(URI),
  access: accessScene(URI),
  camera: <CameraURI extends string | symbol>(CameraURI: CameraURI) => ({
    provide: provideCamera(URI)(CameraURI),
    access: accessCamera(CameraURI),
    attachControl: attachControl(CameraURI)
  }),
  light: {
    create: createLight(URI)
  },
  mesh: {
    create: createMesh(URI)
  }
});

const canvas = <URI extends string | symbol>(URI: URI) => ({
  provide: provideCanvas(URI),
  access: accessCanvas(URI),
  URI
});

export { engine, scene, canvas };

export { NullEngine } from "babylonjs";
