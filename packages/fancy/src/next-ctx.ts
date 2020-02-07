import { NextPageContext } from "next";

// alpha
/* istanbul ignore file */

export const nextContextURI = Symbol();

export interface NextContext {
  [nextContextURI]: {
    ctx: NextPageContext;
  };
}
