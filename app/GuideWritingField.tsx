"use client";
import { useEffect, useRef, useId } from "react";
import { guideInline, guideTextBlocks, type GuideInline, type GuideTone } from "@/lib/guides";
import { GUIDE_EMOJIS, guideEmojiLabel } from "@/lib/guide-emojis";
export type GuideWritingCommand =
  | { kind: "bold" | "heading" | "list"; id: number }
  | { kind: "tone"; tone: GuideTone; id: number }
  | { kind: "emoji"; name: string; id: number };
/** Text colours the colour dots apply. The browser writes them as <font color>; they are stored as {tone}…{/tone}. */
export const GUIDE_INK: Record<GuideTone, string> = { default: "#e6dfcd", gold: "#e5c375", orange: "#f1a14b", green: "#9ac47c" };
function emojiNode(name: string) {
  const img = document.createElement("img");
  img.src = GUIDE_EMOJIS[name];
  img.alt = `:${name}:`;
  img.title = guideEmojiLabel(name);
  img.className = "guide-emoji";
  img.dataset.emoji = name;
  img.contentEditable = "false";
  return img;
}
function toneNode(tone: string) {
  const span = document.createElement("span");
  span.dataset.tone = tone;
  span.className = "guide-ink ink-" + tone;
  return span;
}
function toneOf(color: string): GuideTone | null {
  const rgb = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/),
    hex = rgb ? "#" + rgb.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, "0")).join("") : color.trim().toLowerCase();
  return (Object.entries(GUIDE_INK).find(([, ink]) => ink === hex)?.[0] as GuideTone | undefined) ?? null;
}
/** A colour mark from our own spans, or from what the browser's colour command wrote. */
function inkOf(el: HTMLElement): GuideTone | null {
  if (el.dataset?.tone && Object.hasOwn(GUIDE_INK, el.dataset.tone)) return el.dataset.tone as GuideTone;
  const raw = el.tagName === "FONT" ? el.getAttribute("color") : el.style?.color;
  return raw ? toneOf(raw) : null;
}
function fill(target: Node, nodes: GuideInline[]) {
  for (const n of nodes) {
    if (typeof n === "string") target.appendChild(document.createTextNode(n));
    else if (n.kind === "emoji") target.appendChild(emojiNode(n.name));
    else {
      const el = n.kind === "bold" ? document.createElement("strong") : toneNode(n.tone);
      fill(el, n.children);
      target.appendChild(el);
    }
  }
}
/** A small document editor: stores only our plain-text formatting vocabulary, never HTML. */
export function GuideWritingField({
  label,
  value,
  onChange,
  maxLength = 16000,
  rows = 14,
  placeholder,
  disabled = false,
  compact = false,
  command,
  tone = "default",
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  maxLength?: number;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
  command?: GuideWritingCommand;
  /** The section's own colour; text coloured back to the default inside a coloured section keeps a {default} mark. */
  tone?: GuideTone;
}) {
  const labelId = useId();
  const ref = useRef<HTMLDivElement>(null);
  // The last selection inside this field, so toolbar menus can act on it after taking focus.
  const lastRange = useRef<Range | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || document.activeElement === root) return;
    root.replaceChildren();
    for (const block of guideTextBlocks(value)) {
      const el = document.createElement(
        block.kind === "heading" ? "h4" : block.kind === "list" ? "ul" : "p",
      );
      if (block.kind === "list")
        for (const item of block.items ?? []) {
          const li = document.createElement("li");
          fill(li, guideInline(item));
          el.appendChild(li);
        }
      else fill(el, guideInline(block.text));
      root.appendChild(el);
    }
  }, [value]);
  useEffect(() => {
    const remember = () => {
      const selection = window.getSelection();
      if (selection?.rangeCount && ref.current?.contains(selection.getRangeAt(0).commonAncestorContainer))
        lastRange.current = selection.getRangeAt(0).cloneRange();
    };
    document.addEventListener("selectionchange", remember);
    return () => document.removeEventListener("selectionchange", remember);
  }, []);
  /** Colour marks are kept only where they change the colour the text would have anyway. */
  function serialise(node: Node, inherited: GuideTone = tone): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    const el = node as HTMLElement;
    if (el.dataset?.emoji && Object.hasOwn(GUIDE_EMOJIS, el.dataset.emoji)) return `:${el.dataset.emoji}:`;
    const ink = inkOf(el),
      content = Array.from(el.childNodes).map((child) => serialise(child, ink ?? inherited)).join("");
    if (ink && ink !== inherited && content) return `{${ink}}${content}{/${ink}}`;
    switch (el.tagName) {
      case "STRONG":
      case "B":
        return content ? "**" + content + "**" : "";
      case "H4":
      case "H2":
        return "\n## " + content + "\n";
      case "LI":
        return "\n- " + content;
      case "P":
      case "DIV":
      case "UL":
        return content + "\n";
      case "BR":
        return "\n";
      default:
        return content;
    }
  }
  function sync() {
    if (ref.current)
      onChange(
        Array.from(ref.current.childNodes)
          .map((node) => serialise(node))
          .join("")
          .trim(),
      );
  }
  /** The selection to act on: the live one if it is in this field, else the last one, else the end of the text. */
  function selectionRange(root: HTMLElement) {
    const selection = window.getSelection();
    let range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!range || !root.contains(range.commonAncestorContainer)) range = lastRange.current;
    if (!range || !root.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(root.lastChild ?? root);
      range.collapse(false);
    }
    root.focus();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return range;
  }
  function format(kind: "heading" | "bold" | "list") {
    const root = ref.current,
      selection = window.getSelection();
    if (!root) return;
    const range = selectionRange(root);
    const text =
      range.toString() ||
      (kind === "heading"
        ? "Section heading"
        : kind === "list"
          ? "List item"
          : "Important text");
    const el = document.createElement(
      kind === "heading" ? "h4" : kind === "list" ? "ul" : "strong",
    );
    if (kind === "list") {
      const li = document.createElement("li");
      li.textContent = text;
      el.appendChild(li);
    } else el.textContent = text;
    range.deleteContents();
    range.insertNode(el);
    range.selectNodeContents(el);
    selection?.removeAllRanges();
    selection?.addRange(range);
    sync();
  }
  /** Colours the selected text; the browser splits and nests the marks, which serialise back to {tone} tags. */
  function colour(next: GuideTone) {
    const root = ref.current;
    if (!root) return;
    const range = selectionRange(root);
    if (range.collapsed) return;
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand("foreColor", false, GUIDE_INK[next]);
    // Keep one representation in the DOM: the same spans the saved text renders as.
    for (const el of Array.from(root.querySelectorAll<HTMLElement>("font,[style]"))) {
      if (el.tagName !== "FONT" && el.tagName !== "SPAN") {
        el.removeAttribute("style");
        continue;
      }
      const ink = inkOf(el),
        span: HTMLElement | DocumentFragment = ink ? toneNode(ink) : document.createDocumentFragment();
      for (const child of Array.from(el.childNodes)) span.appendChild(child);
      el.replaceWith(span);
    }
    sync();
  }
  function emoji(name: string) {
    const root = ref.current,
      selection = window.getSelection();
    if (!root || !Object.hasOwn(GUIDE_EMOJIS, name)) return;
    const range = selectionRange(root);
    range.deleteContents();
    const img = emojiNode(name);
    // An empty field has no paragraph yet: give the emoji one so it saves as its own line.
    if (!root.firstChild || range.startContainer === root) {
      const p = document.createElement("p");
      p.appendChild(img);
      range.insertNode(p);
    } else range.insertNode(img);
    range.setStartAfter(img);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
    sync();
  }
  function paste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const text = event.clipboardData
        .getData("text/plain")
        .slice(0, Math.max(0, maxLength - value.length)),
      selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!ref.current?.contains(range.commonAncestorContainer)) return;
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    sync();
  }
  useEffect(() => {
    if (!command || disabled) return;
    if (command.kind === "tone") colour(command.tone);
    else if (command.kind === "emoji") emoji(command.name);
    else format(command.kind);
  }, [command?.id]);
  return (
    <div className={"guide-writing"+(compact?" compact-writing":"")}>
      <div className="guide-writing-bar">
        <label id={labelId}>{label}</label>
        <div>
          {(["heading", "bold", "list"] as const).map((kind) => (
            <button
              type="button"
              disabled={disabled}
              key={kind}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => format(kind)}
            >
              {kind === "heading"
                ? "Heading"
                : kind === "bold"
                  ? "Bold"
                  : "• List"}
            </button>
          ))}
        </div>
      </div>
      <div
        id={"guide-" + label.replace(/\s+/g, "-")}
        ref={ref}
        className="guide-document-text"
        role="textbox"
        aria-multiline="true"
        aria-labelledby={labelId}
        contentEditable={!disabled}
        aria-disabled={disabled}
        aria-invalid={value.length > maxLength}
        suppressContentEditableWarning
        onInput={sync}
        onPaste={paste}
        onDrop={(e) => e.preventDefault()}
        data-placeholder={placeholder}
        style={{ minHeight: rows * 22 }}
      />
      <small data-near={value.length > maxLength * 0.9 || undefined}>
        {value.length.toLocaleString()} / {maxLength.toLocaleString()}{value.length > maxLength ? " · Shorten this section before saving." : ""}
      </small>
    </div>
  );
}
