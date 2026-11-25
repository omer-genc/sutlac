import {
  Code,
  ColumnsPlusRight,
  ListBullets,
  ListChecks,
  ListNumbers,
  Quotes,
  RowsPlusBottom,
  Table as TableIcon,
  TextB,
  TextHOne,
  TextHTwo,
  TextItalic,
  TextStrikethrough,
  Trash,
} from "@phosphor-icons/react";
import type { Editor } from "@tiptap/core";
import type { EditorView } from "@tiptap/pm/view";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { useConfig } from "@/api/queries";
import { Button } from "@/components/ui/button";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, imageLink } from "@/images";
import { cn } from "@/lib/utils";
import { markdownExtensions } from "./extensions";
import { TaskRefs } from "./TaskRefs";
import { preservingMarkdown, snapshot, type Snapshot } from "./preserve";

// inci-doc'taki MarkdownSection (src/components/markdown/MarkdownEditor.tsx) uyarlaması.
// Farklar: #ref/@mention önerileri yerine iş numarası çipleri (TaskRefs), resimler
// `docs/images/`'e yüklenip göreli yolla bağlanır (bkz. src/images.ts), göreli .md linkleri ⌘/Ctrl-tık ile içeride açılır,
// kayıtta dokunulmayan bloklar dosyadaki metinleriyle korunur (preserve.ts).

function MenuButton({
  active,
  onClick,
  children,
  label,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  label: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      // Editör seçimi kaybolmasın diye mousedown'ı yutuyoruz.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={label}
      className={cn("text-muted-foreground", active && "bg-muted text-foreground")}
    >
      {children}
      <span className="sr-only">{label}</span>
    </Button>
  );
}

function EditorBubbleMenu({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      taskList: e.isActive("taskList"),
      quote: e.isActive("blockquote"),
      table: e.isActive("table"),
    }),
  });
  const chain = () => editor.chain().focus();
  return (
    <BubbleMenu editor={editor} className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-md">
      <MenuButton active={state.bold} label="Bold" onClick={() => chain().toggleBold().run()}>
        <TextB />
      </MenuButton>
      <MenuButton active={state.italic} label="Italic" onClick={() => chain().toggleItalic().run()}>
        <TextItalic />
      </MenuButton>
      <MenuButton active={state.strike} label="Strikethrough" onClick={() => chain().toggleStrike().run()}>
        <TextStrikethrough />
      </MenuButton>
      <MenuButton active={state.code} label="Code" onClick={() => chain().toggleCode().run()}>
        <Code />
      </MenuButton>
      <MenuButton active={state.h1} label="Heading 1" onClick={() => chain().toggleHeading({ level: 1 }).run()}>
        <TextHOne />
      </MenuButton>
      <MenuButton active={state.h2} label="Heading 2" onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        <TextHTwo />
      </MenuButton>
      <MenuButton active={state.bullet} label="Bullet list" onClick={() => chain().toggleBulletList().run()}>
        <ListBullets />
      </MenuButton>
      <MenuButton active={state.ordered} label="Numbered list" onClick={() => chain().toggleOrderedList().run()}>
        <ListNumbers />
      </MenuButton>
      <MenuButton active={state.taskList} label="To-do list" onClick={() => chain().toggleTaskList().run()}>
        <ListChecks />
      </MenuButton>
      <MenuButton active={state.quote} label="Quote" onClick={() => chain().toggleBlockquote().run()}>
        <Quotes />
      </MenuButton>
      {state.table ? (
        <>
          <div className="mx-0.5 h-5 w-px bg-border" />
          <MenuButton active={false} label="Add column" onClick={() => chain().addColumnAfter().run()}>
            <ColumnsPlusRight />
          </MenuButton>
          <MenuButton active={false} label="Add row" onClick={() => chain().addRowAfter().run()}>
            <RowsPlusBottom />
          </MenuButton>
          <MenuButton active={false} label="Delete table" onClick={() => chain().deleteTable().run()}>
            <Trash />
          </MenuButton>
        </>
      ) : (
        <MenuButton
          active={false}
          label="Insert table"
          onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          <TableIcon />
        </MenuButton>
      )}
    </BubbleMenu>
  );
}

/** Göreli `.md` linkini docs/ yoluna çevirir: `../decisions/0007-x.md` → `decisions/0007-x`. */
export function resolveDocLink(href: string, basePath: string): string | null {
  if (/^[a-z]+:/i.test(href) || href.startsWith("#")) return null;
  const m = href.match(/^([^#?]+)\.md(?:[#?].*)?$/);
  if (!m) return null;
  const parts = basePath.split("/").slice(0, -1);
  for (const seg of m[1]!.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg && seg !== ".") parts.push(seg);
  }
  return parts.join("/");
}

/** Yapıştırılan/bırakılan dosyalardan resim olanlar; resim yoksa boş. */
function imageFiles(list: FileList | null | undefined): File[] {
  return [...(list ?? [])].filter((f) => f.type in IMAGE_TYPES);
}

/**
 * Resimleri sırayla yükler ve `pos`'a (yoksa o anki imlece) yerleştirir. Yükleme sürerken
 * belge değişebilir; konum belge boyuna kırpılır.
 */
async function insertImages(view: EditorView, files: File[], docPath: string, pos?: number) {
  for (const file of files) {
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(`${file.name}: images can be at most ${MAX_IMAGE_BYTES / 1024 / 1024} MB`);
      continue;
    }
    try {
      const { name } = await api.uploadImage(file);
      if (view.isDestroyed) return;
      const node = view.state.schema.nodes.image!.create({ src: imageLink(docPath, name), alt: "" });
      const { tr } = view.state;
      if (pos == null) tr.replaceSelectionWith(node, false);
      else {
        const at = Math.min(pos, tr.doc.content.size);
        tr.insert(at, node);
        pos = at + node.nodeSize;
      }
      view.dispatch(tr.scrollIntoView());
    } catch (e) {
      toast.error(`Could not add image: ${e instanceof Error ? e.message : e}`);
    }
  }
}

export function MarkdownSection({
  value,
  onSave,
  onChange,
  onOpenDoc,
  basePath = "",
  editable = true,
  placeholder = "Start writing, select text to format…",
  editorClassName = "prose min-h-40 max-w-none text-sm focus:outline-none",
}: {
  value: string;
  onSave: (content: string) => void;
  /** Her tuş vuruşunda (debounce'suz) güncel markdown'ı bildirir; onSave'e ek. */
  onChange?: (content: string) => void;
  /** İş çipine (`KES-12`) ya da içerideki bir .md linkine tıklanınca */
  onOpenDoc: (path: string) => void;
  /** Göreli linklerin çözüldüğü belge yolu (`tasks/KES-1`) */
  basePath?: string;
  /** false: salt okunur render (yorum gösterimi gibi); autosave çalışmaz. */
  editable?: boolean;
  placeholder?: string;
  /** Editör gövdesinin sınıfı; kısa alanlarda min yüksekliği düşürmek için. */
  editorClassName?: string;
}) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastSaved = useRef(value);
  const draftRef = useRef(value);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const openRef = useRef({ onOpenDoc, basePath });
  openRef.current = { onOpenDoc, basePath };

  // Yüklenen gövdenin blok haritası; kayıtta değişmeyen bloklar buradan aynen yazılır.
  const snap = useRef<Snapshot | null>(null);
  const prefix = useConfig().data?.prefix ?? "";

  const extensions = useMemo(
    () => [
      ...markdownExtensions(() => openRef.current.basePath),
      Placeholder.configure({ placeholder }),
      TaskRefs.configure({ prefix, onOpen: (path) => openRef.current.onOpenDoc(path) }),
    ],
    // Extension'lar editör ömrü boyunca sabittir; değişkenler ref üzerinden okunur.
    [],
  );

  const editor = useEditor({
    extensions,
    content: value,
    editable,
    onUpdate: ({ editor: e, transaction }) => {
      // Yalnız belgeyi gerçekten değiştiren işlem kaydedilir. Tiptap `setEditable` çağrısında
      // da (içerik aynıyken) update yayar; bunu kayıt sanmak, bir dosyayı sadece açmanın onu
      // yeniden biçimlendirmesine yol açıyordu.
      if (!transaction.docChanged) return;
      const md = preservingMarkdown(e, snap.current);
      draftRef.current = md;
      onChangeRef.current?.(md);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (md !== lastSaved.current) {
          lastSaved.current = md;
          onSaveRef.current(md);
        }
      }, 800);
    },
    editorProps: {
      attributes: { class: editorClassName },
      // Resim yapıştırma/bırakma: dosya docs/images/'e id adıyla yazılır, belgeye göreli yol girer.
      handlePaste: (view, event) => {
        const files = imageFiles(event.clipboardData?.files);
        if (!view.editable || !files.length) return false;
        void insertImages(view, files, openRef.current.basePath);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        const files = imageFiles(event.dataTransfer?.files);
        if (moved || !view.editable || !files.length) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        void insertImages(view, files, openRef.current.basePath, pos);
        return true;
      },
      // Link: salt okunurda tık, düzenlenebilirde ⌘/Ctrl-tık açar (düz tık imleci koyar).
      handleClick: (view, _pos, event) => {
        const a = (event.target as HTMLElement).closest("a");
        const href = a?.getAttribute("href");
        if (!href || (view.editable && !event.metaKey && !event.ctrlKey)) return false;
        const doc = resolveDocLink(href, openRef.current.basePath);
        if (doc) openRef.current.onOpenDoc(doc);
        else if (href.startsWith("#/")) openRef.current.onOpenDoc(href.slice(2));
        else window.open(href, "_blank", "noopener");
        return true;
      },
    },
  });

  // Blok haritası, editör kurulur kurulmaz ve her türlü güncellemeden önce çıkarılır.
  useEffect(() => {
    if (editor && !snap.current) snap.current = snapshot(editor, lastSaved.current);
  }, [editor]);

  // editable prop'u sonradan değişebilir (yorumun görüntüleme ↔ düzenleme modu). İkinci
  // argüman false: içerik değişmediği için update yayılmaz.
  useEffect(() => {
    editor?.setEditable(editable, false);
  }, [editor, editable]);

  // Dışarıdan gelen gerçek değişimde (başka belge, dosyanın dışarıda değişmesi) içeriği
  // değiştir. Autosave sonrası sunucudan dönen aynı içerik lastSaved ile eşleşir; erken
  // return imlecin kaybolmasını engeller.
  useEffect(() => {
    if (!editor || value === lastSaved.current) return;
    // Bekleyen bir debounce varsa (önceki taslak için), belge değişiminden sonra
    // ateşlenip yeni içeriği ezmesin diye önce iptal ediyoruz.
    clearTimeout(timer.current);
    lastSaved.current = value;
    draftRef.current = value;
    // emitUpdate: false şart — bu dışarıdan gelen bir içerik, kullanıcı değişikliği
    // değil; true bırakılırsa yeniden serileştirilmiş içerik otomatik kaydedilir.
    editor.commands.setContent(value, { emitUpdate: false });
    snap.current = snapshot(editor, value);
  }, [value, editor]);

  // Unmount anında bekleyen taslağı senkron flush et (debounce henüz ateşlenmemişse
  // kaydedilmemiş değişiklik kaybolmasın).
  useEffect(() => {
    return () => {
      clearTimeout(timer.current);
      if (draftRef.current !== lastSaved.current) {
        lastSaved.current = draftRef.current;
        onSaveRef.current(draftRef.current);
      }
    };
  }, []);

  return (
    <>
      {editor && editable && <EditorBubbleMenu editor={editor} />}
      <EditorContent editor={editor} />
    </>
  );
}
