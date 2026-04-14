import fs from "fs";
import path from "path";
import sharp from "sharp";

// 🔹 Recorrer carpetas
function getFiles(dir, extensions) {
  let results = [];

  const list = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of list) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      results = results.concat(getFiles(fullPath, extensions));
    } else {
      if (extensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

export default function imagenesPlugin() {
  let outDir;
  let rootDir;
  let pictureMap = {};

  const sizes = [400, 800, 1200];

  return {
    name: "vite-imagenes",
    apply: "build",

    configResolved(config) {
      rootDir = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
    },

    // 🔥 PROCESAR IMÁGENES ANTES DEL BUILD
    async buildStart() {
      const srcDir = path.join(rootDir, "img");
      const buildDir = path.join(outDir, "assets");

      pictureMap = {};

      const images = getFiles(srcDir, [".jpg", ".jpeg", ".png", ".svg"]);

      const tasks = images.map(async (file) => {
        const relativePath = path.relative(srcDir, path.dirname(file));
        const outputDir = path.join(buildDir, relativePath);

        fs.mkdirSync(outputDir, { recursive: true });

        const baseName = path.basename(file, path.extname(file));
        const extName = path.extname(file).toLowerCase();

        const key = baseName;

        // 🔹 SVG
        if (extName === ".svg") {
          const outputFile = path.join(outputDir, `${baseName}${extName}`);
          fs.copyFileSync(file, outputFile);

          pictureMap[key] = {
            type: "svg",
            src: `${relativePath}/${baseName}.svg`
          };

          return;
        }

        const options = { quality: 80 };
        const promises = [];

        for (const size of sizes) {
          const webp = path.join(outputDir, `${baseName}-${size}.webp`);
          const avif = path.join(outputDir, `${baseName}-${size}.avif`);

          if (!fs.existsSync(webp)) {
            promises.push(
              sharp(file)
                .resize({ width: size })
                .webp(options)
                .toFile(webp)
            );
          }

          if (!fs.existsSync(avif)) {
            promises.push(
              sharp(file)
                .resize({ width: size })
                .avif(options)
                .toFile(avif)
            );
          }
        }

        await Promise.all(promises);

        pictureMap[key] = {
          avif: sizes.map(size => `${relativePath}/${baseName}-${size}.avif ${size}w`),
          webp: sizes.map(size => `${relativePath}/${baseName}-${size}.webp ${size}w`),
          fallback: `${relativePath}/${baseName}-800.jpg`
        };
      });

      await Promise.all(tasks);

      // 🔥 Guardar JSON (opcional)
      fs.mkdirSync(path.join(outDir, "assets"), { recursive: true });

      fs.writeFileSync(
        path.join(outDir, "assets", "imagenes.json"),
        JSON.stringify(pictureMap, null, 2)
      );

      console.log("🔥 Imágenes procesadas + JSON generado");
    },

    // 🔥 MODIFICAR HTML EN EL PIPELINE DE VITE
    transformIndexHtml(html) {
      return html.replace(
        /<img\s+[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/g,
        (match, src, alt) => {

          if (!src.includes("img/")) return match;

          const baseName = path.basename(src, path.extname(src));
          const data = pictureMap[baseName];

          if (!data || data.type === "svg") return match;

          const avif = data.avif.join(", ");
          const webp = data.webp.join(", ");

          return `
<picture>
  <source type="image/avif" srcset="${avif}">
  <source type="image/webp" srcset="${webp}">
  <img src="${data.fallback}" alt="${alt}" loading="lazy">
</picture>`;
        }
      );
    }
  };
}
