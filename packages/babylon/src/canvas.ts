import { effect as T } from "@matechs/effect";
import { Lazy } from "fp-ts/lib/function";

// WIP
/* istanbul ignore file */

export const CanvasURI = "@matechs/babylon/CanvasURI";

export interface CanvasService {
  accessCanvas: T.UIO<HTMLElement>;
}

export interface Canvas<URI extends string | symbol> {
  [CanvasURI]: {
    [k in URI]: CanvasService;
  };
}

export const accessCanvas = <URI extends string | symbol>(URI: URI) =>
  T.accessM((_: Canvas<URI>) => _[CanvasURI][URI].accessCanvas);

export const provideCanvas = <URI extends string | symbol>(URI: URI) => (_: Lazy<HTMLElement>) =>
  T.provideSW<Canvas<URI>>()(T.accessEnvironment<{}>())((env) => ({
    ...env,
    [CanvasURI]: {
      ...env[CanvasURI],
      [URI]: {
        accessCanvas: T.sync(_)
      }
    }
  }));
