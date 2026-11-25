import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { Config, DocMeta, FullDoc } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { CommentList } from "./CommentList";
import { BodyEditor, DocActions, SourceEditor, TaskProps, TitleField } from "./DocParts";

// inci-doc TaskDialog düzeni: solda başlık + içerik + yorumlar, sağda özellikler.

export function TaskDialog({
  doc,
  cfg,
  sprints,
  onClose,
  onOpenDoc,
  onOpenSprint,
  onStep,
}: {
  doc: FullDoc | undefined;
  cfg: Config;
  sprints: DocMeta[];
  onClose: () => void;
  onOpenDoc: (path: string) => void;
  onOpenSprint: (num: number) => void;
  onStep: (dir: 1 | -1) => void;
}) {
  const [source, setSource] = useState(false);
  useEffect(() => setSource(false), [doc?.path]);

  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[88vh] w-[calc(100%-2rem)] max-w-[1500px] flex-col gap-0 p-0 sm:max-w-[1500px]">
        {doc && (
          <>
            <DialogHeader className="shrink-0 flex-row items-center gap-1 px-4 py-2 pr-14 text-xs text-muted-foreground">
              <DialogTitle className="sr-only">{doc.title}</DialogTitle>
              <DocActions doc={doc} source={source} onSource={() => setSource((s) => !s)} />
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground" title="Previous (k)" onClick={() => onStep(-1)}>
                <CaretUp />
              </Button>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground" title="Next (j)" onClick={() => onStep(1)}>
                <CaretDown />
              </Button>
            </DialogHeader>
            {source ? (
              <SourceEditor key={doc.path} doc={doc} onDone={() => setSource(false)} />
            ) : (
              // İki panel; lg altında tek sütuna iner ve kaydırma dış kapsayıcıya geçer.
              <div key={doc.path} className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
                <div className="flex min-w-0 flex-1 flex-col px-8 pt-4 pb-10 sm:px-10 lg:overflow-y-auto">
                  <TitleField doc={doc} />
                  <Separator className="my-4" />
                  <BodyEditor doc={doc} onOpenDoc={onOpenDoc} />
                  <Separator className="my-6" />
                  <CommentList path={doc.path} comments={doc.commentList} onOpenDoc={onOpenDoc} />
                </div>
                <div className="flex w-full shrink-0 flex-col gap-6 border-t p-5 lg:min-h-0 lg:w-[340px] lg:overflow-y-auto lg:border-t-0 lg:border-l">
                  <div className="flex flex-col">
                    <TaskProps doc={doc} cfg={cfg} sprints={sprints} onOpenSprint={onOpenSprint} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
