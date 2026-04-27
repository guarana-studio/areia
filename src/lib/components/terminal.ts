import ilha, { html } from "ilha";

export const Terminal = ilha.render(
  () => html` <div id="terminal" class="theme-light dark:theme-dark h-full max-h-full"></div> `,
);
