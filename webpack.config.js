/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

const config = {
	entry: "./src/index.ts",
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: "ts-loader",
				exclude: /node_modules/,
			},
			{
				test: /\.html/,
				type: "asset/resource",
			},
			{
				test: /\.s[ac]ss$/i,
				use: [
					// Creates `style` nodes from JS strings
					"style-loader",
					// Translates CSS into CommonJS
					"css-loader",
					// Compiles Sass to CSS
					"sass-loader",
				],
			},
		],
	},
	resolve: {
		extensions: [".ts", ".scss", ".css"],
	},
	output: {
		filename: "main.js",
		path: path.resolve(__dirname, "dist"),
	},
	plugins: [
		new CopyPlugin({
			patterns: [{ from: "./src/include", to: "./" }],
		}),
	],
};
module.exports = (env, argv) => {
	if (argv.mode === "development") {
		config.devtool = "source-map";
	}

	if (argv.mode === "production") {
	}

	return config;
};
