"use client";

import { useState } from "react";
import { PanelHelp } from "@/components/ui/PanelHelp";
import type {
  AIProvider,
  AIModelSetting,
  AIBrandVoiceProfile,
  AIPromptTemplate,
  AIImagePreset,
  AIPublishingProfile,
  ProviderName,
  ProviderCapabilities,
} from "@/lib/ai-observatory/types";
import { DEFAULT_BRAND_VOICE } from "@/lib/ai-observatory/types";
import { SYSTEM_GUARDRAILS } from "@/lib/ai-observatory/guardrails";
import {
  saveProviderKeyAction,
  deleteProviderKeyAction,
  testProviderAction,
  saveModelSettingAction,
  saveBrandVoiceAction,
  savePromptTemplateAction,
} from "./actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "providers" | "models" | "voice" | "templates" | "presets" | "profiles" | "guardrails" | "usage";

interface Props {
  providers: AIProvider[];
  modelSettings: AIModelSetting[];
  brandVoices: AIBrandVoiceProfile[];
  templates: AIPromptTemplate[];
  imagePresets: AIImagePreset[];
  publishingProfiles: AIPublishingProfile[];
  encryptionReady: boolean;
  defaultBrandVoice: typeof DEFAULT_BRAND_VOICE;
  providerCapabilities: Record<ProviderName, ProviderCapabilities>;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
        active
          ? "bg-teal-500/20 border border-teal-500/40 text-teal-300"
          : "border border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
      }`}
    >
      {label}
    </button>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-800 bg-slate-900 p-5 ${className}`}>{children}</div>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{children}</p>;
}

function Input({ name, defaultValue, placeholder, type = "text", className = "" }: {
  name: string; defaultValue?: string; placeholder?: string; type?: string; className?: string;
}) {
  return (
    <input
      name={name}
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className={`w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-slate-300 placeholder-slate-600 outline-none focus:border-teal-600 ${className}`}
    />
  );
}

function Textarea({ name, defaultValue, placeholder, rows = 4 }: {
  name: string; defaultValue?: string; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      name={name}
      rows={rows}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-slate-300 placeholder-slate-600 outline-none focus:border-teal-600 resize-y"
    />
  );
}

function StatusMsg({ result }: { result: { ok: boolean; error?: string; message?: string } | null }) {
  if (!result) return null;
  return (
    <p className={`mt-2 text-[10px] ${result.ok ? "text-green-400" : "text-red-400"}`}>
      {result.ok ? "✓ " : "✗ "}{result.error ?? result.message ?? (result.ok ? "Saved." : "Failed.")}
    </p>
  );
}

// ── Provider Panel ────────────────────────────────────────────────────────────

const ALL_PROVIDERS: { name: ProviderName; label: string; emoji: string }[] = [
  { name: "openai",     label: "OpenAI",             emoji: "◈" },
  { name: "anthropic",  label: "Anthropic / Claude", emoji: "◎" },
  { name: "openrouter", label: "OpenRouter",          emoji: "◷" },
  { name: "gemini",     label: "Google Gemini",       emoji: "◆" },
];

function ProviderCard({
  providerMeta,
  dbProvider,
  encryptionReady,
  capabilities,
}: {
  providerMeta: { name: ProviderName; label: string; emoji: string };
  dbProvider: AIProvider | undefined;
  encryptionReady: boolean;
  capabilities: ProviderCapabilities;
}) {
  const [saveResult, setSaveResult] = useState<{ ok: boolean; error?: string; masked?: string } | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);

  const isConfigured = !!(dbProvider?.api_key_masked);
  const isEnabled = dbProvider?.enabled ?? false;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg text-teal-400">{providerMeta.emoji}</span>
          <div>
            <p className="text-sm font-bold text-slate-200">{providerMeta.label}</p>
            <div className="flex gap-2 mt-0.5">
              {capabilities.text && <span className="rounded bg-teal-500/10 px-1 py-0.5 text-[9px] text-teal-400">Text</span>}
              {capabilities.images && <span className="rounded bg-purple-500/10 px-1 py-0.5 text-[9px] text-purple-400">Images</span>}
              {capabilities.embeddings && <span className="rounded bg-blue-500/10 px-1 py-0.5 text-[9px] text-blue-400">Embeddings</span>}
            </div>
          </div>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
          isEnabled && isConfigured
            ? "border-green-700 bg-green-950/20 text-green-400"
            : isConfigured
              ? "border-yellow-700 bg-yellow-950/20 text-yellow-400"
              : "border-slate-700 bg-slate-800 text-slate-500"
        }`}>
          {isEnabled && isConfigured ? "Active" : isConfigured ? "Configured" : "Not configured"}
        </span>
      </div>

      {isConfigured ? (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
          <span className="font-mono text-[11px] text-slate-400">{dbProvider?.api_key_masked ?? "sk-...****"}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowKeyInput(true)}
              className="text-[10px] text-teal-400 hover:underline"
            >
              Replace
            </button>
            <form action={async (fd) => {
              fd.append("provider_name", providerMeta.name);
              await deleteProviderKeyAction(fd);
              setSaveResult({ ok: true, error: undefined });
            }}>
              <button type="submit" className="text-[10px] text-red-400 hover:underline">Delete</button>
            </form>
          </div>
        </div>
      ) : null}

      {(!isConfigured || showKeyInput) && (
        <>
          {!encryptionReady ? (
            <div className="mb-3 rounded-lg border border-orange-900/30 bg-orange-950/10 px-3 py-2">
              <p className="text-[10px] text-orange-400">Set <span className="font-mono">AI_SETTINGS_ENCRYPTION_KEY</span> to enable key storage.</p>
            </div>
          ) : (
            <form
              action={async (fd) => {
                fd.append("provider_name", providerMeta.name);
                fd.append("display_name", providerMeta.label);
                fd.append("enabled", "true");
                setSaving(true);
                const result = await saveProviderKeyAction(fd);
                setSaveResult(result);
                setSaving(false);
                if (result.ok) setShowKeyInput(false);
              }}
              className="mb-3 flex gap-2"
            >
              <input
                name="api_key"
                type="password"
                placeholder={`${providerMeta.label} API key`}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-slate-300 placeholder-slate-600 outline-none focus:border-teal-600"
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg border border-teal-700 bg-teal-950/20 px-3 py-2 text-[11px] font-semibold text-teal-400 hover:bg-teal-950 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </form>
          )}
        </>
      )}

      {saveResult && <StatusMsg result={saveResult} />}

      {isConfigured && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
          <form action={async (fd) => {
            fd.append("provider_name", providerMeta.name);
            setTesting(true);
            const result = await testProviderAction(fd);
            setTestResult(result);
            setTesting(false);
          }}>
            <button
              type="submit"
              disabled={testing}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-[10px] font-medium text-slate-400 hover:border-teal-700 hover:text-teal-400 transition-colors disabled:opacity-50"
            >
              {testing ? "Testing…" : "Test Connection"}
            </button>
          </form>
          {dbProvider?.last_tested_at && (
            <span className="text-[9px] text-slate-600">
              Last tested: {new Date(dbProvider.last_tested_at).toLocaleDateString("en-US")} —{" "}
              <span className={dbProvider.last_test_status === "ok" ? "text-green-400" : "text-red-400"}>
                {dbProvider.last_test_status}
              </span>
            </span>
          )}
          {testResult && <StatusMsg result={testResult} />}
        </div>
      )}
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AIStudioClient({
  providers,
  modelSettings,
  brandVoices,
  templates,
  imagePresets,
  publishingProfiles,
  encryptionReady,
  defaultBrandVoice,
  providerCapabilities,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("providers");
  const [saveResult, setSaveResult] = useState<{ ok: boolean; error?: string } | null>(null);

  const TABS: { id: Tab; label: string }[] = [
    { id: "providers",  label: "Providers"         },
    { id: "models",     label: "Models"            },
    { id: "voice",      label: "Writing Voice"     },
    { id: "templates",  label: "Prompt Templates"  },
    { id: "presets",    label: "Image Presets"     },
    { id: "profiles",   label: "Publishing Profiles" },
    { id: "guardrails", label: "Guardrails"        },
    { id: "usage",      label: "Usage / Cost"      },
  ];

  const defaultVoice = brandVoices.find((v) => v.is_default) ?? null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-800 p-3">
        {TABS.map((tab) => (
          <TabBtn key={tab.id} label={tab.label} active={activeTab === tab.id} onClick={() => { setActiveTab(tab.id); setSaveResult(null); }} />
        ))}
      </div>

      <div className="p-5">

        {/* ── Providers ───────────────────────────────────────────────────── */}
        {activeTab === "providers" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm font-semibold text-slate-300">AI Providers</p>
              <PanelHelp
                title="AI Providers"
                description="Configure API keys for text and image generation providers."
                operatorNote="Keys are encrypted at rest using AI_SETTINGS_ENCRYPTION_KEY. They are never returned to the browser in full."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {ALL_PROVIDERS.map((p) => (
                <ProviderCard
                  key={p.name}
                  providerMeta={p}
                  dbProvider={providers.find((dp) => dp.provider_name === p.name)}
                  encryptionReady={encryptionReady}
                  capabilities={providerCapabilities[p.name]}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Models ──────────────────────────────────────────────────────── */}
        {activeTab === "models" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm font-semibold text-slate-300">Model Settings by Task</p>
              <PanelHelp
                title="Model Settings"
                description="Choose which AI model handles each task type. Different tasks may benefit from different models."
              />
            </div>
            {[
              { type: "notes",     label: "AI Notes" },
              { type: "drafts",    label: "Blog / Report Drafts" },
              { type: "reports",   label: "Full Reports" },
              { type: "social",    label: "Social Posts" },
              { type: "images",    label: "Image Generation" },
              { type: "summaries", label: "Summaries" },
              { type: "headlines", label: "Headlines" },
            ].map(({ type, label }) => {
              const setting = modelSettings.find((m) => m.task_type === type);
              return (
                <form
                  key={type}
                  action={async (fd) => {
                    fd.append("task_type", type);
                    const r = await saveModelSettingAction(fd);
                    setSaveResult(r);
                  }}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="flex flex-wrap items-start gap-4">
                    <p className="w-32 shrink-0 pt-1 text-[11px] font-semibold text-slate-300">{label}</p>
                    <div className="flex flex-1 flex-wrap gap-3">
                      <div className="flex-1 min-w-28">
                        <FieldLabel>Provider</FieldLabel>
                        <select
                          name="provider_name"
                          defaultValue={setting?.provider_name ?? "anthropic"}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-slate-300 outline-none focus:border-teal-600"
                        >
                          <option value="anthropic">Anthropic</option>
                          <option value="openai">OpenAI</option>
                          <option value="openrouter">OpenRouter</option>
                          <option value="gemini">Gemini</option>
                        </select>
                      </div>
                      <div className="flex-1 min-w-40">
                        <FieldLabel>Model name</FieldLabel>
                        <Input name="model_name" defaultValue={setting?.model_name ?? ""} placeholder="e.g. claude-opus-4-8" />
                      </div>
                      <div className="w-24">
                        <FieldLabel>Temperature</FieldLabel>
                        <Input name="temperature" defaultValue={String(setting?.temperature ?? 0.5)} type="number" />
                      </div>
                      <div className="w-24">
                        <FieldLabel>Max tokens</FieldLabel>
                        <Input name="max_tokens" defaultValue={String(setting?.max_tokens ?? 2048)} type="number" />
                      </div>
                    </div>
                    <button type="submit" className="rounded-lg border border-teal-700 bg-teal-950/20 px-3 py-2 text-[11px] font-semibold text-teal-400 hover:bg-teal-950 transition-colors">
                      Save
                    </button>
                  </div>
                </form>
              );
            })}
            {saveResult && <StatusMsg result={saveResult} />}
          </div>
        )}

        {/* ── Writing Voice ────────────────────────────────────────────────── */}
        {activeTab === "voice" && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm font-semibold text-slate-300">Brand Voice Profile</p>
              <PanelHelp
                title="Writing Voice"
                description="Defines the style, tone, and constraints for all AI-generated content."
                details="The default voice is serious, research-grade, and transparent. It never claims the conjecture is proved."
              />
            </div>
            <form action={async (fd) => {
              if (defaultVoice?.id) fd.append("id", defaultVoice.id);
              const r = await saveBrandVoiceAction(fd);
              setSaveResult(r);
            }}>
              <div className="space-y-4">
                <div>
                  <FieldLabel>Profile Name</FieldLabel>
                  <Input name="name" defaultValue={defaultVoice?.name ?? defaultBrandVoice.name} />
                </div>
                <div>
                  <FieldLabel>Voice Summary (short)</FieldLabel>
                  <Input name="voice_summary" defaultValue={defaultVoice?.voice_summary ?? defaultBrandVoice.voice_summary} placeholder="One-line style summary" />
                </div>
                <div>
                  <FieldLabel>Long-form Instructions</FieldLabel>
                  <Textarea name="long_form_instructions" rows={5} defaultValue={defaultVoice?.long_form_instructions ?? defaultBrandVoice.long_form_instructions} />
                </div>
                <div>
                  <FieldLabel>Social Post Instructions</FieldLabel>
                  <Textarea name="social_instructions" rows={3} defaultValue={defaultVoice?.social_instructions ?? defaultBrandVoice.social_instructions} />
                </div>
                <div>
                  <FieldLabel>Image Style Instructions</FieldLabel>
                  <Textarea name="image_style_instructions" rows={3} defaultValue={defaultVoice?.image_style_instructions ?? defaultBrandVoice.image_style_instructions} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Preferred Phrases (one per line)</FieldLabel>
                    <Textarea name="preferred_phrases" rows={4} defaultValue={(defaultVoice?.preferred_phrases ?? defaultBrandVoice.preferred_phrases).join("\n")} />
                  </div>
                  <div>
                    <FieldLabel>Phrases to Avoid (one per line)</FieldLabel>
                    <Textarea name="phrases_to_avoid" rows={4} defaultValue={(defaultVoice?.phrases_to_avoid ?? defaultBrandVoice.phrases_to_avoid).join("\n")} />
                  </div>
                </div>
                <div>
                  <FieldLabel>Formatting Rules</FieldLabel>
                  <Textarea name="formatting_rules" rows={3} defaultValue={defaultVoice?.formatting_rules ?? defaultBrandVoice.formatting_rules} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Good Examples</FieldLabel>
                    <Textarea name="good_examples" rows={4} defaultValue={defaultVoice?.good_examples ?? defaultBrandVoice.good_examples} />
                  </div>
                  <div>
                    <FieldLabel>Bad Examples</FieldLabel>
                    <Textarea name="bad_examples" rows={4} defaultValue={defaultVoice?.bad_examples ?? defaultBrandVoice.bad_examples} />
                  </div>
                </div>
                <button type="submit" className="rounded-lg border border-teal-700 bg-teal-950/20 px-4 py-2 text-[11px] font-semibold text-teal-400 hover:bg-teal-950 transition-colors">
                  Save Brand Voice
                </button>
                {saveResult && <StatusMsg result={saveResult} />}
              </div>
            </form>
          </div>
        )}

        {/* ── Prompt Templates ─────────────────────────────────────────────── */}
        {activeTab === "templates" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm font-semibold text-slate-300">Prompt Templates</p>
              <PanelHelp
                title="Prompt Templates"
                description="Editable templates used for each content type. Variables like {source_data} and {brand_voice} are filled in at generation time."
              />
            </div>
            {templates.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-8 text-center">
                <p className="text-[11px] text-slate-500">
                  No templates found. Run the migration SQL then seed defaults, or create templates manually.
                </p>
              </div>
            ) : (
              templates.map((tmpl) => (
                <form
                  key={tmpl.id}
                  action={async (fd) => {
                    fd.append("id", tmpl.id);
                    const r = await savePromptTemplateAction(fd);
                    setSaveResult(r);
                  }}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                  <input type="hidden" name="template_type" value={tmpl.template_type} />
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[9px] font-mono text-slate-400">{tmpl.template_type}</span>
                    <p className="text-[11px] font-semibold text-slate-300">{tmpl.name}</p>
                    <label className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-500">
                      <input type="checkbox" name="enabled" defaultChecked={tmpl.enabled} value="true" />
                      Enabled
                    </label>
                  </div>
                  <div className="mb-3">
                    <FieldLabel>Description</FieldLabel>
                    <Input name="description" defaultValue={tmpl.description} />
                  </div>
                  <div className="mb-3">
                    <FieldLabel>Template Body</FieldLabel>
                    <Textarea name="template_body" rows={6} defaultValue={tmpl.template_body} />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <FieldLabel>Required Variables (comma-separated)</FieldLabel>
                      <Input name="required_variables" defaultValue={tmpl.required_variables.join(", ")} placeholder="source_data, brand_voice" />
                    </div>
                    <button type="submit" className="mt-4 rounded-lg border border-teal-700 bg-teal-950/20 px-3 py-2 text-[11px] font-semibold text-teal-400 hover:bg-teal-950 transition-colors">
                      Save
                    </button>
                  </div>
                </form>
              ))
            )}
            {saveResult && <StatusMsg result={saveResult} />}
          </div>
        )}

        {/* ── Image Presets ─────────────────────────────────────────────────── */}
        {activeTab === "presets" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm font-semibold text-slate-300">Image Presets</p>
              <PanelHelp
                title="Image Presets"
                description="Platform-specific image dimensions and style prompts. The system automatically selects the correct preset for each publishing profile."
                details="Dimensions are selected automatically when generating images for a specific publishing target."
              />
            </div>
            {imagePresets.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-8 text-center">
                <p className="text-[11px] text-slate-500">No image presets found. Run the migration SQL to seed defaults.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-800">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/50">
                      {["Name", "Target", "Dimensions", "Aspect Ratio", "Required", "Text Overlay"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-wider text-slate-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {imagePresets.map((preset) => (
                      <tr key={preset.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-slate-200">{preset.name}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-400">{preset.target}</td>
                        <td className="px-4 py-2.5 tabular-nums text-slate-400">{preset.width} × {preset.height}</td>
                        <td className="px-4 py-2.5 text-slate-400">{preset.aspect_ratio}</td>
                        <td className="px-4 py-2.5">
                          <span className={preset.required ? "text-green-400" : "text-slate-600"}>{preset.required ? "Required" : "Optional"}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={preset.allow_text_overlay ? "text-teal-400" : "text-slate-600"}>{preset.allow_text_overlay ? "Yes" : "No"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-[10px] text-slate-600">Platform dimensions are seeded from defaults. Edit individual presets to adjust style prompts.</p>
          </div>
        )}

        {/* ── Publishing Profiles ──────────────────────────────────────────── */}
        {activeTab === "profiles" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm font-semibold text-slate-300">Publishing Profiles</p>
              <PanelHelp
                title="Publishing Profiles"
                description="Define how each content type is formatted and where it goes. Profiles map content types to output format, image preset, word count, and CTA."
              />
            </div>
            {publishingProfiles.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-8 text-center">
                <p className="text-[11px] text-slate-500">No profiles found. Run the migration SQL to seed defaults.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full min-w-[700px] text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/50">
                      {["Name", "Target", "Content Type", "Format", "Words", "Image", "Approval"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-wider text-slate-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {publishingProfiles.map((profile) => (
                      <tr key={profile.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-slate-200">{profile.name}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-400">{profile.target}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-400">{profile.content_type}</td>
                        <td className="px-4 py-2.5 text-slate-400">{profile.output_format}</td>
                        <td className="px-4 py-2.5 tabular-nums text-slate-500">{profile.min_words}–{profile.max_words}</td>
                        <td className="px-4 py-2.5">
                          <span className={profile.requires_image ? "text-teal-400" : "text-slate-600"}>{profile.requires_image ? "Required" : "Optional"}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-green-400">Required</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Guardrails ───────────────────────────────────────────────────── */}
        {activeTab === "guardrails" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm font-semibold text-slate-300">Guardrail Rules</p>
              <PanelHelp
                title="Guardrails"
                description="Safety rules that prevent false claims, require human approval, and ensure content comes from verified data."
                details="Enforced = always active in code. Configured = controlled by settings. Manual = operator responsibility. Planned = future."
              />
            </div>
            <div className="space-y-2">
              {SYSTEM_GUARDRAILS.map((g) => {
                const badgeClass =
                  g.enforcement === "enforced"
                    ? "bg-green-500/15 text-green-400 border-green-500/20"
                    : g.enforcement === "configured"
                      ? "bg-teal-500/15 text-teal-400 border-teal-500/20"
                      : "bg-slate-700/50 text-slate-500 border-slate-700";
                return (
                  <div key={g.id} className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                    <span className="mt-0.5 text-green-400">✓</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-200">{g.label}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">{g.description}</p>
                    </div>
                    <span className={`shrink-0 rounded border px-2 py-0.5 text-[9px] font-semibold uppercase ${badgeClass}`}>
                      {g.enforcement}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Usage / Cost ─────────────────────────────────────────────────── */}
        {activeTab === "usage" && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm font-semibold text-slate-300">Usage & Cost</p>
              <PanelHelp
                title="Usage & Cost"
                description="Tracks AI generation usage and estimated costs per provider and task type."
                operatorNote="Usage tracking begins when provider generation is enabled and generation events are logged."
              />
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 py-14 text-center">
              <span className="text-3xl text-slate-700">◷</span>
              <p className="mt-3 text-sm font-semibold text-slate-500">Usage tracking begins when generation is enabled</p>
              <p className="mt-1.5 max-w-sm text-[11px] leading-relaxed text-slate-600">
                Once AI provider generation is active and the ai_usage_events table is populated, usage summaries, token counts, and estimated costs will appear here.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
