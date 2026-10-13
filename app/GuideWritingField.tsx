"use client";
import { useEffect, useRef, useId, useState } from "react";
import { guideInline, guideTextBlocks, type GuideInline, type GuideTone } from "@/lib/guides";
import { GUIDE_EMOJIS, guideEmojiLabel } from "@/lib/guide-emojis";
import { guideReference, searchGuideReferences } from "@/lib/guide-references";
export type GuideWritingCommand =
  | { kind: "bold" | "heading" | "list"; id: number }
  | { kind: "tone"; tone: GuideTone; id: number }
  | { kind: "emoji"; name: string; id: number }
  | { kind: "ref"; name: string; suffix?: string; id: number };
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
/** A [[game term]] as one uneditable chip; it saves back as [[Name]]. */
function refNode(name: string, suffix = "") {
  const r = guideReference(name);
  const span = document.createElement("span");
  span.className = "guide-ref ref-" + r.kind;
  span.dataset.ref = r.name;
  if (suffix) span.dataset.suffix = suffix;
  span.contentEditable = "false";
  if (r.icon) {
    const img = document.createElement("img");
    img.src = r.icon;
    img.alt = "";
    span.appendChild(img);
  }
  span.appendChild(document.createTextNode(r.name + suffix));
  return span;
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
    else if (n.kind === "ref") target.appendChild(refNode(n.name, n.suffix));
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
  // Typing @ opens a search at the cursor: the text from @ to the cursor is the query.
  const [mention, setMention] = useState<{ node: Text; start: number; end: number; query: string; x: number; y: number; pick: number } | null>(null);
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
    if (!mention) return;
    const close = () => setMention(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [mention]);
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
    if (el.dataset?.ref) return `[[${el.dataset.ref}]]${el.dataset.suffix ?? ""}`;
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
    if (Object.hasOwn(GUIDE_EMOJIS, name)) insertNode(emojiNode(name));
  }
  function insertNode(img: HTMLElement, at?: Range) {
    const root = ref.current,
      selection = window.getSelection();
    if (!root) return;
    const range = at ?? selectionRange(root);
    range.deleteContents();
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
  /** The term chip just before a node, skipping empty text the editor leaves behind. */
  function chipBefore(node: Node | null | undefined, self = false): HTMLElement | null {
    let at: Node | null | undefined = self ? node : node?.previousSibling;
    while (at && at.nodeType === Node.TEXT_NODE && !(at as Text).length) at = at.previousSibling;
    return at && (at as HTMLElement).dataset?.ref ? (at as HTMLElement) : null;
  }
  /** Letters typed straight after a term join it: Shark then "s" reads Sharks and saves as [[Shark]]s. */
  function joinSuffix() {
    const selection = window.getSelection(),
      node = selection?.anchorNode;
    if (!node || node.nodeType !== Node.TEXT_NODE || !selection?.isCollapsed) return;
    const chip = chipBefore(node);
    if (!chip) return;
    const text = (node as Text).data,
      typed = text.slice(0, selection.anchorOffset).match(/^[a-z']+$/)?.[0],
      suffix = (chip.dataset.suffix ?? "") + (typed ?? "");
    if (!typed || /^[a-z']/.test(text.slice(typed.length)) || suffix.length > 3) return;
    chip.dataset.suffix = suffix;
    chip.lastChild!.textContent = chip.dataset.ref + suffix;
    (node as Text).deleteData(0, typed.length);
    const range = document.createRange();
    if ((node as Text).length) range.setStart(node, 0);
    else {
      range.setStartAfter(chip);
      node.parentNode?.removeChild(node);
    }
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  /** Backspace right after a term's added letters removes one letter, not the whole term. */
  function trimSuffix(event: React.KeyboardEvent<HTMLDivElement>) {
    const selection = window.getSelection();
    if (!selection?.isCollapsed || !selection.anchorNode) return false;
    const { anchorNode: node, anchorOffset: offset } = selection;
    const chip = node.nodeType === Node.TEXT_NODE ? (offset === 0 ? chipBefore(node) : null) : offset > 0 ? chipBefore(node.childNodes[offset - 1], true) : null;
    if (!chip?.dataset.suffix) return false;
    event.preventDefault();
    const suffix = chip.dataset.suffix.slice(0, -1);
    if (suffix) chip.dataset.suffix = suffix;
    else delete chip.dataset.suffix;
    chip.lastChild!.textContent = chip.dataset.ref + suffix;
    sync();
    return true;
  }
  function findMention() {
    const selection = window.getSelection(),
      node = selection?.anchorNode,
      root = ref.current;
    if (!root || !node || node.nodeType !== Node.TEXT_NODE || !selection?.isCollapsed || !root.contains(node)) return setMention(null);
    const before = (node as Text).data.slice(0, selection.anchorOffset),
      m = before.match(/(?:^|\s)@([^\s@]{0,30})$/);
    if (!m) return setMention(null);
    const range = selection.getRangeAt(0).cloneRange(),
      box = range.getClientRects()[0] ?? (node.parentElement as HTMLElement).getBoundingClientRect();
    // Fixed to the window so no section edge clips it; kept on screen near the right edge.
    setMention((prior) => ({ node: node as Text, start: selection.anchorOffset - m[1].length - 1, end: selection.anchorOffset, query: m[1], x: Math.min(box.left, window.innerWidth - 290), y: box.bottom + 6, pick: prior?.query === m[1] ? prior.pick : 0 }));
  }
  const mentionResults = mention ? searchGuideReferences(mention.query, 8) : [];
  function chooseMention(name: string) {
    if (!mention) return;
    const range = document.createRange();
    range.setStart(mention.node, Math.max(0, mention.start));
    range.setEnd(mention.node, Math.min(mention.node.length, mention.end));
    setMention(null);
    ref.current?.focus();
    insertNode(refNode(name), range);
  }
  function keys(event: React.KeyboardEvent<HTMLDivElement>) {
    if (mention) {
      const count = mentionResults.length;
      if (event.key === "Escape") { event.preventDefault(); setMention(null); return; }
      if (count && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        setMention({ ...mention, pick: (mention.pick + (event.key === "ArrowDown" ? 1 : count - 1)) % count });
        return;
      }
      if (count && (event.key === "Enter" || event.key === "Tab")) { event.preventDefault(); chooseMention(mentionResults[mention.pick]?.name ?? mentionResults[0].name); return; }
    }
    if (event.key === "Backspace") trimSuffix(event);
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
    else if (command.kind === "ref") insertNode(refNode(command.name, command.suffix));
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
        onInput={() => { joinSuffix(); sync(); findMention(); }}
        onKeyDown={keys}
        onBlur={() => setMention(null)}
        onPaste={paste}
        onDrop={(e) => e.preventDefault()}
        data-placeholder={placeholder}
        style={{ minHeight: rows * 22 }}
      />
      {mention && <div className="guide-mention" role="listbox" aria-label="Insert a game term" style={{ left: mention.x, top: mention.y }} onMouseDown={(e) => e.preventDefault()}>
        {mentionResults.length ? mentionResults.map((r, i) => <button type="button" role="option" aria-selected={i === mention.pick} key={r.kind + r.name} onClick={() => chooseMention(r.name)}>{r.icon ? <img src={r.icon} alt="" /> : <span className="guide-term-blank" />}<span>{r.name}<small>{r.kind}</small></span></button>)
          : <p className="fine">{mention.query ? "No matches." : "Type an item, prayer, spell, skill or quest."}</p>}
      </div>}
      <small data-near={value.length > maxLength * 0.9 || undefined}>
        {value.length.toLocaleString()} / {maxLength.toLocaleString()}{value.length > maxLength ? " · Shorten this section before saving." : ""}
      </small>
    </div>
  );
}
