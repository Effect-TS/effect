import { effect as T } from "@matechs/effect";
import { Option } from "fp-ts/lib/Option";
import { fn } from "@matechs/effect/lib/interpreter";
import { remote } from "../src";

// environment entries
export const placeholderJsonEnv: unique symbol = Symbol();

// simple todo interface
export interface Todo {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

export const placeholderJsonM = remote({
  [placeholderJsonEnv]: {
    getTodo: fn<(n: number) => T.IO<string, Option<Todo>>>()
  }
});

export type PlaceholderJson = typeof placeholderJsonM;
