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
  const [channel, setChannel] = useState("Social");
  const [assetType, setAssetType] = useState("Meta ad");
  const [objective, setObjective] = useState("");
  const [audience, setAudience] = useState("");
  const [offer, setOffer] = useState("");
  const [headline, setHeadline] = useState("");
  const [supportingCopy, setSupportingCopy] = useState("");
  const [cta, setCta] = useState("");
  const [creativeDirection, setCreativeDirection] = useState("");
  const [description, setDescription] = useState("");
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
        channel,
        assetType,
        brief: {
          objective: objective.trim(),
          audience: audience.trim(),
          offer: offer.trim(),
          headline: headline.trim(),
          supportingCopy: supportingCopy.trim(),
          cta: cta.trim(),
          creativeDirection: creativeDirection.trim(),
          channel,
          assetType,
          description: description.trim(),
        },
        selectedReferenceIds: [],
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
      <form className="form new-creative-form" onSubmit={submit}>
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
        <div className="brief-divider"><span>Creative brief</span><small>Optional · helps build a starting concept</small></div>
        <div className="form__row">
          <label className="field"><span>Channel</span><select value={channel} onChange={(event) => setChannel(event.target.value)}><option>Social</option><option>Display</option><option>Email</option><option>Print</option></select></label>
          <label className="field"><span>Asset type</span><select value={assetType} onChange={(event) => setAssetType(event.target.value)}><option>Meta ad</option><option>Display ad</option><option>Email banner</option><option>Poster</option><option>Flyer</option><option>Resident communication</option><option>Sales collateral</option></select></label>
        </div>
        <div className="form__row"><label className="field"><span>Objective</span><input value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Drive resident enrollment" /></label><label className="field"><span>Audience</span><input value={audience} onChange={(event) => setAudience(event.target.value)} placeholder="Apartment residents" /></label></div>
        <div className="form__row"><label className="field"><span>Offer</span><input value={offer} onChange={(event) => setOffer(event.target.value)} placeholder="Predictable monthly laundry costs" /></label><label className="field"><span>Headline</span><input value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="Laundry, simplified." /></label></div>
        <div className="form__row"><label className="field"><span>Supporting copy</span><input value={supportingCopy} onChange={(event) => setSupportingCopy(event.target.value)} placeholder="Short benefit statement" /></label><label className="field"><span>CTA</span><input value={cta} onChange={(event) => setCta(event.target.value)} placeholder="Explore Laundry Pass" /></label></div>
        <label className="field"><span>Creative direction</span><input value={creativeDirection} onChange={(event) => setCreativeDirection(event.target.value)} placeholder="Playful, resident-facing, clean and modern" /></label>
        <label className="field"><span>Describe what you want</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Create a playful resident-facing concept focused on convenience and predictable laundry costs." /></label>
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
