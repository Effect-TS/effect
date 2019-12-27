import { effect as T, derived as D } from "@matechs/effect";
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

export const placeholderJsonM = D.generic({
  [placeholderJsonEnv]: {
    getTodo: D.fn<(n: number) => T.IO<string, Option<Todo>>>()
  }
});

export type PlaceholderJson = D.TypeOf<typeof placeholderJsonM>;
