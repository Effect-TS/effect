import { effect as T, freeEnv as F } from "@matechs/effect";
import { Option } from "fp-ts/lib/Option";

// environment entries
export const placeholderJsonEnv: unique symbol = Symbol();

// simple todo interface
export interface Todo {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

export const placeholderJsonM = F.define({
  [placeholderJsonEnv]: {
    getTodo: F.fn<(n: number) => T.IO<string, Option<Todo>>>()
  }
});

export type PlaceholderJson = F.TypeOf<typeof placeholderJsonM>;
