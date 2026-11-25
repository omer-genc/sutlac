import { DotsThree, PaperPlaneTilt, PencilSimple, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { useCommentMutations } from "@/api/queries";
import type { Comment } from "@/api/client";
import { MarkdownSection } from "@/components/markdown/MarkdownEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// inci-doc'taki CommentList uyarlaması. Yorumlar dosyanın sonundaki `## Yorumlar`
// bölümünde durur (bkz. src/body.ts); yorumun kimliği zamanıdır, yazan tutulmaz.

const BODY_CLASS = "prose min-h-0 max-w-none text-sm focus:outline-none";
const COMPOSER_CLASS = "prose min-h-16 max-w-none text-sm focus:outline-none";

function CommentItem({
  comment,
  path,
  onSave,
  onDelete,
  onOpenDoc,
}: {
  comment: Comment;
  path: string;
  onSave: (content: string) => void;
  onDelete: () => void;
  onOpenDoc: (path: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const startEdit = () => {
    setDraft(comment.body);
    setEditing(true);
  };
  const save = () => {
    const content = draft.trim();
    if (content && content !== comment.body) onSave(content);
    setEditing(false);
  };

  return (
    <div className="flex gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{comment.at}</span>
          {!editing && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm" className="ml-auto text-muted-foreground" />
                }
              >
                <DotsThree weight="bold" />
                <span className="sr-only">Comment menu</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={startEdit}>
                  <PencilSimple /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirmDelete(true)}>
                  <Trash /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <MarkdownSection
          // key: düzenleme iptal edilince editör baştan kurulup taslağı atar.
          key={`${comment.at}:${editing}:${comment.body}`}
          value={comment.body}
          editable={editing}
          editorClassName={editing ? COMPOSER_CLASS : BODY_CLASS}
          onChange={setDraft}
          // Kaydetme açıkça Kaydet ile yapılır; autosave devre dışı.
          onSave={() => {}}
          onOpenDoc={onOpenDoc}
          basePath={path}
        />
        {editing && (
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={save} disabled={!draft.trim()}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
            <AlertDialogDescription>This comment will be removed from the file.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function CommentList({
  path,
  comments,
  onOpenDoc,
}: {
  path: string;
  comments: Comment[];
  onOpenDoc: (path: string) => void;
}) {
  const { add, edit, remove } = useCommentMutations(path);
  const [draft, setDraft] = useState("");
  // Gönderdikten sonra editörü sıfırlamak için remount anahtarı.
  const [composerKey, setComposerKey] = useState(0);

  const submit = () => {
    const content = draft.trim();
    if (!content) return;
    add.mutate(content, {
      onSuccess: () => {
        setDraft("");
        setComposerKey((k) => k + 1);
      },
    });
  };

  return (
    // Yorumlar ana sütunun akışında: kendi kaydırma bölgesi yok, sol sütun kayar.
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-medium text-muted-foreground">
        Comments{comments.length > 0 && ` (${comments.length})`}
      </h3>

      {comments.length > 0 && (
        <div className="flex flex-col gap-4">
          {comments.map((c, i) => {
            const ref = { index: i, at: c.at };
            return (
              <CommentItem
                key={`${i}:${c.at}`}
                comment={c}
                path={path}
                onSave={(content) => edit.mutate([ref, content])}
                onDelete={() => remove.mutate(ref)}
                onOpenDoc={onOpenDoc}
              />
            );
          })}
        </div>
      )}

      <div className="flex gap-3">
        <div className="min-w-0 flex-1 rounded-lg border px-3 py-2">
          <MarkdownSection
            key={composerKey}
            value=""
            placeholder="Write a comment…"
            editorClassName={COMPOSER_CLASS}
            onChange={setDraft}
            onSave={() => {}}
            onOpenDoc={onOpenDoc}
            basePath={path}
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <Button size="sm" onClick={submit} disabled={!draft.trim() || add.isPending}>
              <PaperPlaneTilt /> Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
