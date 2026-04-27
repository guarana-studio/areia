import ilha, { html, raw } from "ilha";
import { Cog, Container, PanelBottom, PanelLeft } from "lucide";

import { lucideIcon } from "../ui";

export const Topbar = ilha
  .on("[data-action=toggle-theme]@click", () => {
    document.dispatchEvent(new CustomEvent("basecoat:theme"));
  })
  .on("[data-action=toggle-sidebar]@click", () => {
    document.dispatchEvent(new CustomEvent("areia:toggle-sidebar"));
  })
  .on("[data-action=toggle-terminal]@click", () => {
    document.dispatchEvent(new CustomEvent("areia:toggle-terminal"));
  })
  .render(
    () => html`
      <div
        class="flex items-center justify-between rounded-lg border bg-neutral-50 px-4 py-1 dark:bg-neutral-900"
      >
        <div class="flex items-center">
          <button class="btn-sm-ghost">AREIA</button>
          <button class="btn-sm-outline font-mono">
            ${raw(lucideIcon(Container))}
            <span>ilhajs/ilha</span>
          </button>
        </div>
        <div class="flex items-center">
          <button class="btn-sm-icon-ghost" data-action="toggle-sidebar">
            ${raw(lucideIcon(PanelLeft))}
          </button>
          <button class="btn-sm-icon-ghost" data-action="toggle-terminal">
            ${raw(lucideIcon(PanelBottom))}
          </button>
          <button class="btn-sm-icon-ghost" data-action="settings">${raw(lucideIcon(Cog))}</button>
        </div>
      </div>
    `,
  );
