export type ContextMenuItem = {
  label: string;
  onClick: () => void;
  fileOnly?: boolean;
};

export function renderTreeContextMenu({
  isFile,
  context,
  items,
}: {
  isFile: boolean;
  context: any;
  items: ContextMenuItem[];
}) {
  const menu = document.createElement("div");
  menu.className = "dropdown-menu";
  menu.dataset.fileTreeContextMenuRoot = "true";
  menu.style.position = "fixed";
  menu.style.left = `${context.anchorRect.left}px`;
  menu.style.top = `${context.anchorRect.top}px`;

  const popover = document.createElement("div");
  popover.setAttribute("data-popover", "");
  popover.setAttribute("aria-hidden", "false");

  const list = document.createElement("div");
  list.setAttribute("role", "menu");
  list.id = "ctx-menu";

  const addItem = (label: string, onClick: () => void) => {
    const el = document.createElement("div");
    el.setAttribute("role", "menuitem");
    el.textContent = label;
    el.addEventListener("click", () => {
      onClick();
      context.close();
    });
    list.appendChild(el);
  };

  for (const item of items) {
    if (item.fileOnly && !isFile) continue;
    addItem(item.label, item.onClick);
  }

  popover.appendChild(list);
  menu.appendChild(popover);

  return menu;
}
