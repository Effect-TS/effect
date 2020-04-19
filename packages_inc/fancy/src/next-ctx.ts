import { NextPageContext } from "next";

// alpha
/* istanbul ignore file */

export const nextContextURI = "@matechs/fancy/nextContextURI";

export interface NextContext {
  [nextContextURI]: {
    ctx: NextPageContext;
  };
}
