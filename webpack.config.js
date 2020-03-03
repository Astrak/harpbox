const path = require("path");
const merge = require("webpack-merge");
const dir = path.resolve(__dirname);

const mainConfig = {
    context: dir,
    mode: "development",
    output: { filename: "[name].bundle.js" },
    externals: { three: "THREE" },
    resolve: {
        extensions: [".webpack.js", ".web.ts", ".ts", ".tsx", ".web.js", ".js"],
    },
    module: { rules: [{ test: /\.tsx?$/, loader: "ts-loader" }] },
    devServer: { contentBase: dir, publicPath: "/dist/", open: true },
};

const workerConfiguration = merge(mainConfig, {
    entry: { "harp-worker": "./src/harp-worker.ts" },
});
const appConfiguration = merge(mainConfig, {
    entry: { "my-harp": "./src/app.ts" },
});

module.exports = [appConfiguration, workerConfiguration];
