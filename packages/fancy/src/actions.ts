// alpha
/* istanbul ignore file */

export const actionsURI: unique symbol = Symbol();

export interface Actions {
  [actionsURI]: {
    actions: any[];
  };
}

export const hasActions = (u: unknown): u is Actions =>
  typeof u === "object" && u !== null && actionsURI in u;
