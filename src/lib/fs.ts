import type { FileTree } from "@pierre/trees";
import type { Nodepod } from "@scelar/nodepod";
import type { FileSystem } from "modern-monaco";

function fromFileUrl(filename: string): string {
  return filename.startsWith("file://") ? filename.slice(7) : filename;
}

export function nodepodMonacoFs(nodepod: Nodepod): FileSystem {
  return {
    async copy(source, target) {
      const sourceContent = await nodepod.fs.readFile(fromFileUrl(source));
      return nodepod.fs.writeFile(fromFileUrl(target), sourceContent);
    },
    async createDirectory(dir) {
      return nodepod.fs.mkdir(fromFileUrl(dir));
    },
    async delete(filename, options) {
      return nodepod.fs.rmdir(fromFileUrl(filename), options);
    },
    // @ts-expect-error type is fine
    async readDirectory(filename) {
      return nodepod.fs.readdir(fromFileUrl(filename));
    },
    // @ts-expect-error it's gonna be Uint8Array
    async readFile(filename) {
      return nodepod.fs.readFile(fromFileUrl(filename));
    },
    async readTextFile(filename) {
      return nodepod.fs.readFile(fromFileUrl(filename), "utf8");
    },
    async rename(oldPath, newPath) {
      return nodepod.fs.rename(fromFileUrl(oldPath), fromFileUrl(newPath));
    },
    async stat(filename) {
      const result = await nodepod.fs.stat(fromFileUrl(filename));
      return {
        type: result.isFile ? 1 : 2,
        ctime: result.mtime,
        mtime: result.mtime,
        size: result.size,
        version: 0,
      };
    },
    async writeFile(filename, content) {
      return nodepod.fs.writeFile(fromFileUrl(filename), content);
    },
    // @ts-expect-error type is fine
    watch(filename, options, handle) {
      // @ts-expect-error type is fine
      const watch = nodepod.fs.watch(fromFileUrl(filename), options, handle);
      return watch.close;
    },
  };
}

export async function getPaths(nodepod: Nodepod) {
  const list = await Promise.all(
    nodepod
      .snapshot()
      .entries.map((e) => e.path)
      .map(async (path) => {
        const stat = await nodepod.fs.stat(path);
        return { path, isDirectory: stat.isDirectory };
      }),
  );
  return list.filter((p) => p.path.startsWith("/home/user") && !p.isDirectory).map((p) => p.path);
}

export function watchPaths(nodepod: Nodepod, fileTree: FileTree) {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const watcher = nodepod.fs.watch("/", { recursive: true }, (event: string) => {
    if (event !== "rename") return;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const paths = await getPaths(nodepod);
      fileTree.resetPaths(paths);
    }, 50);
  });

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    watcher.close();
  };
}
