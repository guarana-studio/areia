import { store } from "$lib/store";
import { BlobReader, BlobWriter, ZipReader } from "@zip.js/zip.js";
import ilha, { html } from "ilha";
import { ofetch } from "ofetch";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

type Entry = {
  path: string;
  kind: "file" | "directory";
  data?: string;
};

export const FileTree = ilha
  .on("[data-action=snapshot]@click", async () => {
    const snapshot = store.getState().nodepod?.snapshot();
    console.log(snapshot);
  })
  .on("[data-action=fetch-repo]@click", async () => {
    const repoBlob = await ofetch("/api/clone?owner=ilhajs&repo=ilha");
    const blobReader = new BlobReader(repoBlob);
    const zipReader = new ZipReader(blobReader);
    const entries = await zipReader.getEntries();
    let base64Entries: Entry[] = [];
    for (const entry of entries) {
      if (entry.directory) {
        const directory = entry.filename.substring(0, entry.filename.length - 1);
        base64Entries.push({
          path: directory,
          kind: "directory",
        });
      } else {
        const arrayBuffer = await entry.arrayBuffer();
        base64Entries.push({
          path: entry.filename,
          kind: "file",
          data: arrayBufferToBase64(arrayBuffer),
        });
      }
    }
    console.log(base64Entries);
  })
  .render(
    () => html`
      <div class="flex h-full flex-col bg-neutral-50 dark:bg-neutral-900">
        <div class="flex flex-col gap-1 px-4 py-2">
          <button class="btn-sm-outline w-full" data-action="snapshot">Snapshot</button>
          <button class="btn-sm-outline w-full" data-action="fetch-repo">Pull repo</button>
        </div>
        <div id="tree" class="flex-1"></div>
      </div>
    `,
  );
