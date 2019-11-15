import { clientHelpers, reinterpretRemotely } from "../../src";
import { moduleA } from "./server";

export const clientModuleA = reinterpretRemotely(moduleA, "url");

export const {
  moduleA: { notFailing, failing }
} = clientHelpers(moduleA);
