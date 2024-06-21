import { statSync } from 'node:fs';
import path from 'node:path'

export const NORANEKO_CONTENT_BASE_URL = new URL("chrome://noraneko/content/");
export const NORANEKO_CONTENT_BASE_PATH = "./dist/noraneko/content";

export const DEPS_DIR = path.join(NORANEKO_CONTENT_BASE_PATH, "deps");
export const DEPS_DIR_URL = new URL("deps", NORANEKO_CONTENT_BASE_URL.href);

export const SRC_DIR = path.join(NORANEKO_CONTENT_BASE_PATH, "src");
export const SRC_DIR_URL = new URL("src", NORANEKO_CONTENT_BASE_URL.href);

export const CWD = process.cwd();

export const existsFile = (fp: string) => {
  try {
    const stat = statSync(fp);
    return stat.isFile();
  } catch {
    return false;
  }
};
