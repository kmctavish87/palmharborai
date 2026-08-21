"use client";

import { useState } from "react";
import { ArrowUp, Bot, Sparkles } from "lucide-react";

import { QUICK_ACTIONS } from "@/lib/constants";
import type { Revision } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";
import { IconButton } from "@/components/ui";

export function ChatPanel({
  revisions,
  disabled,
  busy,
  onSubmit,
  providerMode,
  hasSource,
}: {
  revisions: Revision[];
  disabled?: boolean;
  busy: boolean;
  onSubmit: (instruction: string) => Promise<void>;
  providerMode: "mock" | "openai";
  hasSource: boolean;
}) {
  const [instruction, setInstruction] = useState("");

  async function submit(value = instruction) {
    const clean = value.trim();
    if (!clean || disabled || busy) return;
    setInstruction("");
    await onSubmit(clean);
  }

  return (
    <section className="chat-panel">
      <div className="chat-panel__heading">
        <div className="ai-avatar"><Sparkles size={16} /></div>
        <div><h3>Creative assistant</h3><p><span /> {providerMode === "openai" ? "OpenAI mode" : "Local mode"} · ready</p></div>
      </div>
      <div className="chat-scroll">
        <div className="chat-message chat-message--assistant">
          <div className="chat-message__author"><Bot size={13} /> Studio assistant</div>
          <p>{hasSource ? "I’m working from the current version. Tell me what to change or which format you need." : "I’ll use the saved brief to build a starting concept, or you can upload an approved source."}</p>
        </div>
        {revisions.map((revision) => (
          <div className="chat-exchange" key={revision.id}>
            <div className="chat-message chat-message--user"><p>{revision.instruction}</p></div>
            <div className="chat-message chat-message--assistant">
              <div className="chat-message__author"><Bot size={13} /> Studio assistant <span>{formatRelativeDate(revision.createdAt)}</span></div>
              <p>{revision.aiAction}</p>
              {revision.resultingVersionIds.length ? <small>{revision.resultingVersionIds.length} new {revision.resultingVersionIds.length === 1 ? "version" : "versions"}</small> : null}
            </div>
          </div>
        ))}
        {busy ? (
          <div className="chat-message chat-message--assistant chat-message--thinking"><span /><span /><span /></div>
        ) : null}
      </div>
      <div className="quick-actions">
        {QUICK_ACTIONS.map((action) => (
          <button key={action} disabled={disabled || busy} onClick={() => void submit(action)}>{action}</button>
        ))}
      </div>
      <div className="composer">
        <textarea
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder={hasSource ? "Describe a revision…" : "Describe a starting concept…"}
          disabled={disabled}
          rows={3}
        />
        <div className="composer__footer">
          <span>Enter to send · Shift+Enter for line break</span>
          <IconButton label="Send instruction" className="composer__send" disabled={!instruction.trim() || disabled || busy} onClick={() => void submit()}>
            <ArrowUp size={16} />
          </IconButton>
        </div>
      </div>
      <p className="chat-disclaimer">{providerMode === "openai" ? "Only explicit requests and selected references are sent to the configured provider." : "Local production mode uses no paid model calls."} No asset is used for model training by this app.</p>
    </section>
  );
}
