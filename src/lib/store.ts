import FleetDarkTheme from "$assets/fleet-dark.json" with { type: "json" };
import FleetLightTheme from "$assets/fleet-light.json" with { type: "json" };
import { createStore } from "@ilha/store";
import { FileTree } from "@pierre/trees";
import { Nodepod, NodepodTerminal } from "@scelar/nodepod";
import { init, Workspace } from "modern-monaco";

import { getPaths, nodepodMonacoFs, watchPaths } from "./fs";
import { WTermAdapter } from "./term";
import { renderTreeContextMenu, type ContextMenuItem } from "./ui";

// ─── Constants ───────────────────────────────────────────────────────────────

const WORKDIR = "/home/user";
const ENTRY_FILE = `${WORKDIR}/index.ts`;

const BASE_FILES = {
  [ENTRY_FILE]: 'console.log("Hello from the browser!");',
};

// ─── Types ───────────────────────────────────────────────────────────────────

export type StoreState = ReturnType<typeof store.getState>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getParentDir(path: string): string {
  const normalized = path.replace(/\/$/, "");
  const lastSlash = normalized.lastIndexOf("/");
  return lastSlash > 0 ? normalized.slice(0, lastSlash) : normalized;
}

function getTargetDir(item: { path: string; kind: string }): string {
  return item.kind === "directory" ? item.path.replace(/\/$/, "") : getParentDir(item.path);
}

// ─── Tree Actions ─────────────────────────────────────────────────────────────

function createTreeActions(state: StoreState) {
  return function getContextMenuItems(item: { path: string; kind: string }): ContextMenuItem[] {
    const { workspace, fileTree } = state;

    const createEntry = (name: string, isDirectory = false) => {
      const dir = getTargetDir(item);
      const path = `${dir}/${name}${isDirectory ? "/" : ""}`;

      if (isDirectory) {
        workspace?.fs.createDirectory(path);
      } else {
        workspace?.fs.writeFile(path, "");
      }

      fileTree?.add(path);
      fileTree?.startRenaming(path, { removeIfCanceled: true });
    };

    return [
      {
        label: "Open",
        fileOnly: true,
        onClick: () => workspace?.openTextDocument(item.path),
      },
      {
        label: "Rename",
        onClick: () => fileTree?.startRenaming(item.path),
      },
      {
        label: "Delete",
        onClick: () => fileTree?.remove(item.path),
      },
      {
        label: "New File",
        onClick: () => createEntry("new-file.js"),
      },
      {
        label: "New Folder",
        onClick: () => createEntry("new-folder", true),
      },
    ];
  };
}

// ─── Factory Functions ────────────────────────────────────────────────────────

async function createNodepod(): Promise<Nodepod> {
  const nodepod = await Nodepod.boot({
    files: BASE_FILES,
    workdir: WORKDIR,
  });

  await nodepod.packages.install("bun", "latest");

  return nodepod;
}

function createWorkspace(nodepod: Nodepod): Workspace {
  return new Workspace({
    initialFiles: BASE_FILES,
    entryFile: ENTRY_FILE,
    customFS: nodepodMonacoFs(nodepod),
  });
}

async function createFileTree(state: StoreState): Promise<FileTree> {
  const paths = await getPaths(state.nodepod!);
  const getContextMenuItems = createTreeActions(state);

  return new FileTree({
    paths,
    search: true,
    renaming: true,
    initialExpandedPaths: [WORKDIR],
    composition: {
      contextMenu: {
        enabled: true,
        triggerMode: "both",
        buttonVisibility: "when-needed",
        render(item, context) {
          return renderTreeContextMenu({
            isFile: item.kind === "file",
            context,
            items: getContextMenuItems(item),
          });
        },
      },
    },
  });
}

// ─── Store ────────────────────────────────────────────────────────────────────

let appCleanup: (() => void) | undefined;

export const store = createStore(
  {
    nodepod: undefined as Nodepod | undefined,
    term: undefined as NodepodTerminal | undefined,
    workspace: undefined as Workspace | undefined,
    fileTree: undefined as FileTree | undefined,
    monaco: undefined as Awaited<ReturnType<typeof init>> | undefined,
    initialized: false,
  },
  (set, get) => ({
    async initApp() {
      const state = get();

      if (state.initialized) {
        return {
          nodepod: state.nodepod!,
          term: state.term!,
          workspace: state.workspace!,
          fileTree: state.fileTree!,
        };
      }

      const nodepod = await createNodepod();
      const workspace = createWorkspace(nodepod);
      set({ nodepod, workspace });

      const fileTree = await createFileTree(get());
      const term = get().nodepod!.createTerminal({ Terminal: WTermAdapter });

      const unsubSelection = fileTree.subscribe(() => {
        const [path] = fileTree.getSelectedPaths();
        if (!path || path.endsWith("/")) return;
        get().workspace!.openTextDocument(path);
      });

      const unwatch = watchPaths(get().nodepod!, fileTree);

      const monaco = await init({
        workspace: get().workspace!,
        themes: [FleetDarkTheme as any, FleetLightTheme as any],
      });

      const isDark = document.documentElement.classList.contains("dark");

      monaco.editor.create(document.getElementById("editor")!, {
        fontFamily: "Geist Mono Variable",
        fontSize: 14,
        theme: isDark ? "fleet-dark" : "fleet-light",
      });

      get().workspace!.openTextDocument(ENTRY_FILE);

      appCleanup = () => {
        unsubSelection();
        unwatch();
      };

      set({ term, fileTree, monaco, initialized: true });

      return { term, fileTree };
    },

    cleanup() {
      appCleanup?.();
      appCleanup = undefined;

      set({
        nodepod: undefined,
        term: undefined,
        workspace: undefined,
        fileTree: undefined,
        initialized: false,
      });
    },
  }),
);
