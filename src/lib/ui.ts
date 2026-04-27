import { context } from "ilha";
import type { IconNode } from "lucide";

export const currentTheme = context("current-theme", "light");

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

export function lucideIcon(iconNode: IconNode) {
  const children = iconNode
    .map(([tag, attrs]) => {
      const attrString = Object.entries(attrs)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}="${String(value)}"`)
        .join(" ");

      return `<${tag} ${attrString}></${tag}>`;
    })
    .join("");

  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" aria-hidden="true">
      ${children}
    </svg>
  `;
}

export function initTheme() {
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const getStoredMode = (): "light" | "dark" | "system" | null => {
    try {
      const value = localStorage.getItem("themeMode");
      return value === "light" || value === "dark" || value === "system" ? value : null;
    } catch {
      return null;
    }
  };

  const setStoredMode = (mode: "light" | "dark" | "system") => {
    try {
      localStorage.setItem("themeMode", mode);
    } catch {}
  };

  const applyResolved = (dark: boolean) => {
    root.classList.toggle("dark", dark);
    currentTheme(dark ? "dark" : "light");
  };

  const applyMode = (mode: "light" | "dark" | "system") => {
    if (mode === "system") {
      applyResolved(media.matches);
    } else {
      applyResolved(mode === "dark");
    }
    setStoredMode(mode);
  };

  const resolveInitialMode = (): "light" | "dark" | "system" => {
    return getStoredMode() ?? "system";
  };

  let mode = resolveInitialMode();
  applyMode(mode);

  const handleSystemChange = (event: MediaQueryListEvent) => {
    if (mode === "system") {
      applyResolved(event.matches);
    }
  };

  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", handleSystemChange);
  } else {
    media.addListener(handleSystemChange);
  }

  document.addEventListener("basecoat:theme", (event) => {
    const next = (event as CustomEvent).detail?.mode as "light" | "dark" | "system" | undefined;

    if (next === "light" || next === "dark" || next === "system") {
      mode = next;
      applyMode(mode);
      return;
    }

    mode = mode === "dark" ? "light" : mode === "light" ? "system" : "dark";

    applyMode(mode);
  });
}
