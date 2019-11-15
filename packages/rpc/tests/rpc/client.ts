import { clientHelpers, reinterpretRemotely } from "../../src";
import { moduleA } from "./server";

export const clientModuleA = reinterpretRemotely(moduleA, "http://127.0.0.1:3000");

export const {
  moduleA: { notFailing, failing }
} = clientHelpers(moduleA);
