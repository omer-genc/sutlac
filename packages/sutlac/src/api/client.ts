import type { Comment } from "../body";
import type { Config, Status } from "../config";
import type { Doc, DocMeta } from "../docs";
import type { FieldValue } from "../edit";

export type { Comment, Config, Doc, DocMeta, FieldValue, Status };
export type FullDoc = Doc & { file: string; raw: string };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json", "x-sutlac": "1" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error || res.statusText, res.status);
  return data as T;
}

/** `tasks/KES-1` → `/api/doc/tasks/KES-1` (parçalar ayrı ayrı kodlanır). */
const enc = (path: string) => path.split("/").map(encodeURIComponent).join("/");

/** Resmi yükler, `docs/images/` altındaki adını döner (bkz. src/images.ts). */
async function uploadImage(file: Blob): Promise<{ name: string }> {
  const res = await fetch("/api/images", {
    method: "POST",
    headers: { "content-type": file.type, "x-sutlac": "1" },
    body: file,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error || res.statusText, res.status);
  return data as { name: string };
}

export const api = {
  uploadImage,
  docs: () => request<DocMeta[]>("GET", "/api/docs"),
  doc: (path: string) => request<FullDoc>("GET", `/api/doc/${enc(path)}`),
  config: () => request<Config>("GET", "/api/config"),
  saveConfig: (c: Config) => request<Config>("PUT", "/api/config", c),
  patch: (path: string, p: { fields?: Record<string, FieldValue>; title?: string; body?: string; baseBody?: string }) =>
    request<Doc>("PATCH", `/api/doc/${enc(path)}`, p),
  writeRaw: (path: string, content: string, mtime: number) => request<Doc>("PUT", `/api/doc/${enc(path)}`, { content, mtime }),
  createTask: (t: {
    title: string;
    status: string;
    tags: string[];
    priority: string;
    sprint: number | null;
    body: string;
    fields: Record<string, string>;
  }) => request<Doc>("POST", "/api/tasks", t),
  startSprint: (s: { name: string; end: string }) => request<Doc>("POST", "/api/sprints", s),
  finishSprint: () => request<Doc>("POST", "/api/sprints/finish", {}),
  createPage: (folder: string, title: string) => request<Doc>("POST", "/api/pages", { folder, title }),
  addComment: (path: string, body: string) => request<Doc>("POST", `/api/comments/${enc(path)}`, { body }),
  editComment: (path: string, ref: { index: number; at: string }, body: string) =>
    request<Doc>("PUT", `/api/comments/${enc(path)}`, { ...ref, body }),
  deleteComment: (path: string, ref: { index: number; at: string }) =>
    request<Doc>("DELETE", `/api/comments/${enc(path)}`, ref),
};
