import { defineConfig } from "vite";
import imagenesPlugin from "./vite-imagenes.js";

export default defineConfig({

  root: "src",

  build: {
    // outDir: "../public/build",
    outDir: "../dist",
    emptyOutDir: true,

    sourcemap: true,

    rollupOptions: {

      // input: {
      //   main: path.resolve(__dirname, "src/js/main.js"),
      //   // admin: path.resolve(__dirname, "src/js/admin.js"),
      //   // login: path.resolve(__dirname, "src/js/login.js")
      // },

      output: {
        entryFileNames: "js/[name].min.js",
        chunkFileNames: "js/[name].min.js",

        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? "";

          if (name.endsWith(".css")) {
            return "css/[name].min.css";
          }

          return "assets/[name].[ext]";
        }
      }

    }
  },

  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: `
        @use "env" as * with (
          $dev: ${process.env.NODE_ENV !== "production"}
        );
      `,
        loadPaths: ["./src/scss"]
      }
    }
  },

  plugins: [
    imagenesPlugin(),
  ]

});
