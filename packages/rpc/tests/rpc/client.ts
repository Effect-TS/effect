import { clientHelpers, reinterpretRemotely } from "../../src";
import { moduleADef } from "./interface";

export const clientModuleA = reinterpretRemotely(
  moduleADef,
  "http://127.0.0.1:3000"
);

export const {
  moduleA: { notFailing, failing }
} = clientHelpers(moduleADef);
