const path = require("path");
const slsw = require("serverless-webpack");

module.exports = {
  mode: slsw.lib.webpack.isLocal ? "development" : "production",
  entry: slsw.lib.entries,
  devtool: "source-map",
  resolve: {
    extensions: [".js", ".jsx", ".json", ".ts", ".tsx"],
  },
  output: {
    libraryTarget: "commonjs",
    path: path.join(__dirname, ".webpack"),
    filename: "[name].js",
  },
  target: "node",
  module: {
    rules: [
      {
        test: /\.ts/,
        loader: "esbuild-loader",
        options: {
          loader: "ts",
          target: "es2019",
        },
      },
      {
        test: /\.html/,
        loader: "esbuild-loader",
        options: {
          loader: "text",
        },
      },
    ],
  },
  ignoreWarnings: [
    {
      module: /node_modules\/express\/lib\/view\.js/,
      message: /the request of a dependency is an expression/,
    },
  ],
};
