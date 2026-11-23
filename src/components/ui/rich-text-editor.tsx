"use client";

import { useEffect, useRef } from "react";
import {
  Bold,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const CLINICAL_TEMPLATE = `<h3>Surgical Approach</h3><p></p><h3>Operation Steps</h3><ul><li></li></ul><h3>Intraoperative Observations</h3><p></p><h3>Complications / Remarks</h3><p></p>`;

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Document surgical approach, steps, intraoperative observations, and any complications...",
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastExternalValue = useRef<string>(value);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value !== lastExternalValue.current && el.innerHTML !== value) {
      el.innerHTML = value;
      lastExternalValue.current = value;
    }
  }, [value]);

  useEffect(() => {
    const el = editorRef.current;
    if (el && value && el.innerHTML === "") {
      el.innerHTML = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(command: string, arg?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastExternalValue.current = html;
      onChange(html);
    }
  }

  function insertTemplate() {
    if (!editorRef.current) return;
    const existing = editorRef.current.innerHTML.trim();
    const next = existing ? `${existing}${CLINICAL_TEMPLATE}` : CLINICAL_TEMPLATE;
    editorRef.current.innerHTML = next;
    lastExternalValue.current = next;
    onChange(next);
    editorRef.current.focus();
  }

  return (
    <div
      className={cn(
        "rounded-md border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-blue-600 dark:border-slate-700 dark:bg-slate-950",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => exec("bold")}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 cursor-pointer"
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec("italic")}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 cursor-pointer"
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec("formatBlock", "<h3>")}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 cursor-pointer"
          title="Section heading"
        >
          <Heading3 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec("insertUnorderedList")}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 cursor-pointer"
          title="Bullet list"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec("insertOrderedList")}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 cursor-pointer"
          title="Numbered list"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>

        <div className="ms-auto">
          <button
            type="button"
            onClick={insertTemplate}
            className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
          >
            <Stethoscope className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
            Insert operative template
          </button>
        </div>
      </div>

      <div className="relative">
        {!value && (
          <div className="pointer-events-none absolute inset-x-3 top-2.5 text-sm text-slate-400 dark:text-slate-500">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => {
            const html = e.currentTarget.innerHTML;
            lastExternalValue.current = html;
            onChange(html);
          }}
          className="min-h-[180px] max-h-[420px] overflow-y-auto px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-900 dark:[&_h3]:text-slate-100 [&_h3]:mt-3 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:list-decimal [&_ol]:ps-5 [&_p]:mb-1.5"
        />
      </div>
    </div>
  );
}
