import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";

const production = !process.env.ROLLUP_WATCH;

export default {
    input: "src/index.ts",
    output: {
        sourcemap: true,
        format: "es",
        dir: "dist",
    },
    plugins: [
        typescript(),
        production && terser(),
    ],
};
