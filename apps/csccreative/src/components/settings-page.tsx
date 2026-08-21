"use client";

import { Bot, LockKeyhole, UserCog } from "lucide-react";

import { LibraryPageHeader } from "@/components/library-page-header";
import type { AppSettings } from "@/lib/types";

export function SettingsPage({ settings, onSave }: { settings: AppSettings; onSave: (settings: AppSettings) => Promise<void> }) {
  function update(changes: Partial<AppSettings>) {
    void onSave({ ...settings, ...changes });
  }
  return (
    <main className="library-page settings-page">
      <LibraryPageHeader eyebrow="Workspace controls" title="Settings" description="Choose the prototype role and how image requests are processed." />
      <div className="settings-grid">
        <section className="settings-card"><div className="settings-card__icon"><UserCog size={20} /></div><div><h2>Experience role</h2><p>Preview the full designer workspace or the approved self-service experience.</p><div className="segmented-control"><button className={settings.role === "designer" ? "is-active" : ""} onClick={() => update({ role: "designer" })}>Designer</button><button className={settings.role === "standard" ? "is-active" : ""} onClick={() => update({ role: "standard" })}>Standard user</button></div></div></section>
        <section className="settings-card">
          <div className="settings-card__icon"><Bot size={20} /></div>
          <div>
            <h2>Image provider</h2>
            <p>Mock mode is free and local. OpenAI mode uses the server-side key configured on palmharborai.com.</p>
            <div className="segmented-control"><button className={settings.providerMode === "mock" ? "is-active" : ""} onClick={() => update({ providerMode: "mock" })}>Mock</button><button className={settings.providerMode === "openai" ? "is-active" : ""} onClick={() => update({ providerMode: "openai" })}>OpenAI</button></div>
            <label className="field settings-quality"><span>Generation quality</span><select value={settings.imageQuality} onChange={(event) => update({ imageQuality: event.target.value as AppSettings["imageQuality"] })}><option value="low">Low · fastest</option><option value="medium">Medium · balanced</option><option value="high">High · detailed</option></select></label>
            <label className="field settings-quality"><span>Workspace access code</span><input type="password" value={settings.accessCode ?? ""} autoComplete="off" placeholder="Required when protected on the server" onChange={(event) => update({ accessCode: event.target.value })} /></label>
            <label className="toggle-row"><input type="checkbox" checked={settings.autoFallback} onChange={(event) => update({ autoFallback: event.target.checked })} /><span><strong>Fallback to local production mode</strong><small>Keep working if the AI endpoint is unavailable.</small></span></label>
          </div>
        </section>
        <section className="settings-card settings-card--wide"><div className="settings-card__icon"><LockKeyhole size={20} /></div><div><h2>Privacy and ownership</h2><p>Project files stay in this browser. Corporate logos and personal references remain separate. OpenAI requests are only sent when OpenAI mode is selected, and credentials never enter the browser.</p><div className="privacy-facts"><span>✓ No public gallery</span><span>✓ No automatic model training</span><span>✓ Originals retained</span><span>✓ Explicit reference selection</span></div></div></section>
      </div>
    </main>
  );
}
