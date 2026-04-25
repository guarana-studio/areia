import { FileTree } from "@pierre/trees";
import { Nodepod, NodepodTerminal } from "@scelar/nodepod";
import { BashShell } from "@wterm/just-bash";
import ilha, { html } from "ilha";
import { lazy, Workspace } from "modern-monaco";

import { getPaths, nodepodMonacoFs, watchPaths } from "../lib/fs";
import { WTermAdapter } from "../lib/term";
import { renderTreeContextMenu, type ContextMenuItem } from "../lib/ui";

const WORKDIR = "/home/user";
const PROJECT_DIR = `${WORKDIR}/Developer`;
const ENTRY_FILE = `${PROJECT_DIR}/index.ts`;

const BASE_FILES = {
  [ENTRY_FILE]: 'console.log("Hello from the browser!")',
  [`${PROJECT_DIR}/foo.ts`]: 'console.log("bar!")',
};

function getParentDir(path: string) {
  const normalized = path.replace(/\/$/, "");
  const lastSlash = normalized.lastIndexOf("/");
  return lastSlash > 0 ? normalized.slice(0, lastSlash) : normalized;
}

function getTargetDir(item: { path: string; kind: string }) {
  return item.kind === "directory" ? item.path.replace(/\/$/, "") : getParentDir(item.path);
}

function createTreeActions(state: {
  workspace: () => Workspace | undefined;
  fileTree: () => FileTree | undefined;
}) {
  return function getContextMenuItems(item: { path: string; kind: string }): ContextMenuItem[] {
    const workspace = state.workspace();
    const fileTree = state.fileTree();

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

async function createNodepod() {
  const nodepod = await Nodepod.boot({
    files: BASE_FILES,
    workdir: WORKDIR,
  });

  await nodepod.packages.install("bun", "latest");

  return nodepod;
}

function createWorkspace(nodepod: Nodepod) {
  return new Workspace({
    initialFiles: BASE_FILES,
    entryFile: ENTRY_FILE,
    customFS: nodepodMonacoFs(nodepod),
  });
}

async function createFileTree(
  nodepod: Nodepod,
  state: {
    workspace: () => Workspace | undefined;
    fileTree: () => FileTree | undefined;
  },
) {
  const paths = await getPaths(nodepod);
  const getContextMenuItems = createTreeActions(state);

  return new FileTree({
    paths,
    search: true,
    renaming: true,
    initialExpandedPaths: [PROJECT_DIR],
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

function bindTreeSelection(fileTree: FileTree, workspace: Workspace) {
  fileTree.subscribe(() => {
    const [path] = fileTree.getSelectedPaths();
    if (!path || path.endsWith("/")) return;
    workspace.openTextDocument(path);
  });
}

export default ilha
  .state("nodepod", undefined as Nodepod | undefined)
  .state("shell", undefined as BashShell | undefined)
  .state("term", undefined as NodepodTerminal | undefined)
  .state("workspace", undefined as Workspace | undefined)
  .state("fileTree", undefined as FileTree | undefined)
  .onMount(({ state, host }) => {
    const treeHost = host.querySelector("#tree") as HTMLElement | null;
    const terminalHost = host.querySelector("#terminal") as HTMLElement | null;
    let unwatchFileTree: (() => void) | undefined;

    async function init() {
      if (!treeHost || !terminalHost) return;

      const nodepod = await createNodepod();
      state.nodepod(nodepod);

      const term = nodepod.createTerminal({ Terminal: WTermAdapter });
      term.attach(terminalHost);
      term.clear();
      state.term(term);

      const workspace = createWorkspace(nodepod);
      state.workspace(workspace);

      const fileTree = await createFileTree(nodepod, {
        workspace: state.workspace,
        fileTree: state.fileTree,
      });
      state.fileTree(fileTree);

      fileTree.render({ containerWrapper: treeHost });
      bindTreeSelection(fileTree, workspace);
      unwatchFileTree = watchPaths(nodepod, fileTree);

      lazy({
        workspace,
        themes: ["catppuccin-latte", "catppuccin-mocha"],
      });
    }

    void init();

    return () => {
      unwatchFileTree?.();
    };
  })
  .render(
    () => html`
      <div class="flex h-screen">
        <div id="tree" class="flex-1"></div>

        <div class="flex flex-[3] flex-col">
          <monaco-editor
            class="flex-[4]"
            fontFamily="Geist Mono Variable"
            fontSize="14"
          ></monaco-editor>

          <div id="terminal" class="theme-light flex-1"></div>
        </div>
      </div>
    `,
  );
