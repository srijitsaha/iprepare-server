import fs from "fs/promises";
import path from "path";

const ROOT_DIR = "data/questions/programming/languages";

async function generateJSON(rootDir) {
  const result = {};

  const languages = await fs.readdir(rootDir, { withFileTypes: true });

  for (const language of languages) {
    if (!language.isDirectory()) continue;

    result[language.name] = {};

    const languagePath = path.join(rootDir, language.name);

    const categories = await fs.readdir(languagePath, {
      withFileTypes: true,
    });

    for (const category of categories) {
      if (!category.isDirectory()) continue;

      const categoryPath = path.join(languagePath, category.name);

      const files = await fs.readdir(categoryPath, {
        withFileTypes: true,
      });

      result[language.name][category.name] = files
        .filter((file) => file.isFile())
        .map((file) => file.name.replace(/^\d+\.\s*/, ""))
        .sort();
    }
  }

  return result;
}

generateJSON(ROOT_DIR).then((data) =>
  console.log(JSON.stringify(data, null, 2))
)