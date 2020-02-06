import { NextPageContext } from "next";

export const nextContextURI = Symbol();

export interface NextContext {
  [nextContextURI]: {
    ctx: NextPageContext;
  };
}
