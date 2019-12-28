// babel.config.js
module.exports = {
  presets: [
    ["@babel/preset-env", { targets: { node: "current" } }],
    "@babel/preset-typescript"
  ],
  plugins: [
    "@babel/plugin-proposal-optional-chaining",
    "babel-plugin-transform-typescript-metadata",
    "@babel/plugin-proposal-nullish-coalescing-operator",
    ["@babel/plugin-proposal-decorators", { legacy: true }],
    ["@babel/plugin-proposal-class-properties", { loose: true }]
  ]
};
