import { Editor } from "$lib/components/editor";
import "@spectrum-web-components/split-view/sp-split-view.js";
import { FileTree } from "$lib/components/file-tree";
import { Terminal } from "$lib/components/terminal";
import { Topbar } from "$lib/components/topbar";
import { store } from "$lib/store";
import { initTheme } from "$lib/ui";
import ilha, { html } from "ilha";

export default ilha
  .onMount(({ host }) => {
    const treeHost = host.querySelector("#tree") as HTMLElement | null;
    const terminalHost = host.querySelector("#terminal") as HTMLElement | null;
    if (!treeHost || !terminalHost) return;
    function toggleSidebar() {
      const split = host.querySelector("#sidebar-split") as HTMLElement;
      const splitterPos = split.getAttribute("splitter-pos");
      const splitWidth = split.getBoundingClientRect().width;
      const isOpen = splitterPos !== "0";
      const newSize = isOpen ? 0 : splitWidth * 0.25;
      split.setAttribute("splitter-pos", newSize.toString());
    }
    function toggleTerminal() {
      const split = host.querySelector("#editor-terminal-split") as HTMLElement;
      const splitterPos = split.getAttribute("splitter-pos");
      const splitHeight = split.getBoundingClientRect().height;
      const isOpen = splitterPos !== splitHeight.toString();
      const newSize = isOpen ? splitHeight : splitHeight * 0.75;
      split.setAttribute("splitter-pos", newSize.toString());
      if (isOpen) {
        requestAnimationFrame(() => {
          const terminalElement = host.querySelector("#terminal") as HTMLElement;
          store.getState().term?.fit();
          terminalElement.scrollTo(0, terminalElement.scrollHeight);
        });
      }
    }
    document.addEventListener("areia:toggle-sidebar", toggleSidebar);
    document.addEventListener("areia:toggle-terminal", toggleTerminal);
    store
      .getState()
      .initApp()
      .then(({ term, fileTree }) => {
        term.attach(terminalHost);
        term.clear();
        fileTree.render({ containerWrapper: treeHost });
      });
    void initTheme();
    return () => {
      document.removeEventListener("areia:toggle-sidebar", toggleSidebar);
      document.removeEventListener("areia:toggle-terminal", toggleTerminal);
      store.getState().cleanup();
    };
  })
  .render(
    () => html`
      <div class="flex h-screen flex-col gap-1">
        ${Topbar()}
        <sp-split-view
          id="sidebar-split"
          resizable
          collapsible
          class="h-full"
          primary-min="50"
          secondary-min="50"
          primary-size="25%"
        >
          <div class="rounded-xl border">${FileTree()}</div>
          <sp-split-view
            id="editor-terminal-split"
            vertical
            resizable
            collapsible
            primary-min="50"
            secondary-min="50"
            primary-size="75%"
            class="ml-1"
          >
            <div class="rounded-xl border">${Editor()}</div>
            <div
              class="relative mt-1 h-full max-h-full overflow-hidden rounded-xl border bg-neutral-50 dark:bg-neutral-900"
            >
              ${Terminal()}
            </div>
          </sp-split-view>
        </sp-split-view>
      </div>
    `,
  );
