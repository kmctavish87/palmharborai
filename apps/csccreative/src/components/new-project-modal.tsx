"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { BRANDS } from "@/lib/constants";
import type { CreativeProject } from "@/lib/types";
import { createId } from "@/lib/utils";
import { Button, Modal } from "@/components/ui";

export function NewProjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (project: CreativeProject) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState<string>(BRANDS[0]);
  const [campaign, setCampaign] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(undefined);
    const now = new Date().toISOString();
    try {
      await onCreate({
        id: createId("project"),
        name: name.trim(),
        brand,
        campaign: campaign.trim(),
        createdAt: now,
        modifiedAt: now,
        versions: [],
        revisions: [],
        outputDimensions: { width: 1080, height: 1080 },
        recentCustomDimensions: [],
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Project creation failed.");
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Create a creative project"
      subtitle="Keep the source, revisions, and production formats together."
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
        <label className="field field--wide">
          <span>Project name</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Laundry Pass fall launch"
          />
        </label>
        <div className="form__row">
          <label className="field">
            <span>Brand</span>
            <select value={brand} onChange={(event) => setBrand(event.target.value)}>
              {BRANDS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Campaign</span>
            <input
              value={campaign}
              onChange={(event) => setCampaign(event.target.value)}
              placeholder="Optional campaign"
            />
          </label>
        </div>
        {error ? <p className="form__error">{error}</p> : null}
        <div className="modal__footer">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={<ArrowRight size={16} />}
            busy={busy}
            disabled={!name.trim()}
          >
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
