import { defineHandler, HTTPError } from "nitro";
import { proxyRequest } from "nitro/h3";
import { ofetch } from "ofetch/node";

type RepoMeta = { default_branch: string; size: number };

export default defineHandler(async (event) => {
  const owner = event.url.searchParams.get("owner")?.trim();
  if (!owner) throw HTTPError.status(400, "Missing owner");
  const repo = event.url.searchParams.get("repo")?.trim();
  if (!repo) throw HTTPError.status(400, "Missing repo");
  let repoMeta: RepoMeta;
  try {
    repoMeta = await ofetch(`https://api.github.com/repos/${owner}/${repo}`);
  } catch {
    throw HTTPError.status(400, "Repo not found");
  }
  if (repoMeta.size > 10000) throw HTTPError.status(400, "Repo too large");
  const target = `https://github.com/${owner}/${repo}/archive/refs/heads/${repoMeta.default_branch}.zip`;
  return proxyRequest(event, target);
});
