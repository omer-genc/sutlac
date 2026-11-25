import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { ApiError, api, type Config, type Doc, type DocMeta, type FieldValue, type FullDoc } from "./client";

export const keys = {
  docs: ["docs"] as const,
  config: ["config"] as const,
  doc: (path: string) => ["doc", path] as const,
};

export const useDocs = () => useQuery({ queryKey: keys.docs, queryFn: api.docs });
export const useConfig = () => useQuery({ queryKey: keys.config, queryFn: api.config });
export const useDoc = (path: string | null) =>
  useQuery({ queryKey: keys.doc(path ?? ""), queryFn: () => api.doc(path!), enabled: !!path });

/** Sunucunun döndüğü güncel belgeyi liste ve detay cache'ine yazar. */
function store(qc: QueryClient, doc: Doc) {
  qc.setQueryData<DocMeta[]>(keys.docs, (list) => list?.map((d) => (d.path === doc.path ? { ...d, ...doc } : d)));
  qc.setQueryData<FullDoc>(keys.doc(doc.path), (cur) => (cur ? { ...cur, ...doc } : cur));
}

const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : String(e));

/**
 * docs/ altında bir dosya değişince (görüntüleyici, editör ya da Claude) sunucu SSE ile
 * haber verir; liste ve açık belgeler yeniden çekilir.
 */
export function useLiveReload() {
  const qc = useQueryClient();
  useEffect(() => {
    const ev = new EventSource("/api/events");
    ev.onmessage = () => qc.invalidateQueries();
    return () => ev.close();
  }, [qc]);
}

type Patch = { fields?: Record<string, FieldValue>; title?: string; body?: string; baseBody?: string };

export function usePatchDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ([path, p]: [string, Patch]) => api.patch(path, p),
    // Alan değişimi iyimser: board kartı ve panel hemen güncellenir.
    onMutate: async ([path, p]) => {
      if (!p.fields) return;
      await qc.cancelQueries({ queryKey: keys.docs });
      const prev = qc.getQueryData<DocMeta[]>(keys.docs);
      const f = p.fields;
      qc.setQueryData<DocMeta[]>(keys.docs, (list) =>
        list?.map((d) =>
          d.path !== path
            ? d
            : {
                ...d,
                ...(typeof f.status === "string" ? { status: f.status } : {}),
                ...(typeof f.priority === "string" ? { priority: f.priority } : {}),
                ...(Array.isArray(f.tags) ? { tags: f.tags } : {}),
              },
        ),
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.docs, ctx.prev);
      // Gövde çakışması editörün kendisinde gösterilir.
      if (!(e instanceof ApiError && e.status === 409)) fail(e);
    },
    onSuccess: (doc) => store(qc, doc),
  });
}

export function useWriteRaw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ([path, content, mtime]: [string, string, number]) => api.writeRaw(path, content, mtime),
    onSuccess: (doc) => {
      store(qc, doc);
      qc.invalidateQueries({ queryKey: keys.doc(doc.path) });
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.docs }),
    onError: fail,
  });
}

export function useStartSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.startSprint,
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: keys.docs });
      toast.success(`Sprint ${s.num} başladı`);
    },
    onError: fail,
  });
}

export function useFinishSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.finishSprint,
    onSuccess: (s) => {
      qc.invalidateQueries();
      toast.success(`Sprint ${s.num} kapandı${s.carried.length ? `; ${s.carried.length} iş backlog'a döndü` : ""}`);
    },
    onError: fail,
  });
}

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ([folder, title]: [string, string]) => api.createPage(folder, title),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.docs }),
    onError: fail,
  });
}

export function useSaveConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (c: Config) => api.saveConfig(c),
    onSuccess: (c) => {
      qc.setQueryData(keys.config, c);
      toast.success("Ayarlar kaydedildi");
    },
    onError: fail,
  });
}

type CommentRef = { index: number; at: string };

export function useCommentMutations(path: string) {
  const qc = useQueryClient();
  const done = (doc: Doc) => {
    store(qc, doc);
    qc.invalidateQueries({ queryKey: keys.doc(path) });
  };
  return {
    add: useMutation({ mutationFn: (body: string) => api.addComment(path, body), onSuccess: done, onError: fail }),
    edit: useMutation({ mutationFn: ([ref, body]: [CommentRef, string]) => api.editComment(path, ref, body), onSuccess: done, onError: fail }),
    remove: useMutation({ mutationFn: (ref: CommentRef) => api.deleteComment(path, ref), onSuccess: done, onError: fail }),
  };
}
