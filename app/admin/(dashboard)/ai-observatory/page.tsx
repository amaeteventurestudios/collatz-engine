import {
  getAIObservatoryStats,
  getAIProviders,
  getAISetupState,
  getAINotes,
  getAllDrafts,
  getBrandVoiceProfiles,
  getImagePresets,
  getModelSettings,
  getPromptTemplates,
  getPublishingProfiles,
  getObservatorySettings,
  getRecentActivityEvents,
} from "@/lib/ai-observatory/admin-store";
import { isEncryptionConfigured } from "@/lib/ai-observatory/encryption";
import { PROVIDER_CAPABILITIES, DEFAULT_OBSERVATORY_SETTINGS } from "@/lib/ai-observatory/types";
import { getEngineAdminState, getWorkerLockState } from "@/lib/admin/metrics";
import { generateTopicSuggestions } from "@/lib/ai-observatory/content-radar";
import { AIObservatoryDesk } from "./AIObservatoryDesk";

export const dynamic = "force-dynamic";

export default async function AIObservatoryPage() {
  const [
    stats,
    drafts,
    notes,
    providers,
    modelSettings,
    brandVoices,
    templates,
    imagePresets,
    publishingProfiles,
    setupState,
    engineResult,
    workerLockResult,
    observatorySettings,
    recentActivity,
  ] = await Promise.all([
    getAIObservatoryStats(),
    getAllDrafts(100),
    getAINotes(80),
    getAIProviders(),
    getModelSettings(),
    getBrandVoiceProfiles(),
    getPromptTemplates(),
    getImagePresets(),
    getPublishingProfiles(),
    getAISetupState(),
    getEngineAdminState(),
    getWorkerLockState(),
    getObservatorySettings(),
    getRecentActivityEvents(25),
  ]);

  const engineState = engineResult.data ?? null;

  // Compute Content Radar topic suggestions server-side from real engine data.
  const topicSuggestions = generateTopicSuggestions(engineState, drafts, notes);

  // Fall back to defaults when the settings row has not been created yet.
  const settings = observatorySettings ?? {
    id: "",
    ...DEFAULT_OBSERVATORY_SETTINGS,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <AIObservatoryDesk
      stats={stats}
      drafts={drafts}
      notes={notes}
      providers={providers}
      modelSettings={modelSettings}
      brandVoices={brandVoices}
      templates={templates}
      imagePresets={imagePresets}
      publishingProfiles={publishingProfiles}
      encryptionReady={isEncryptionConfigured()}
      tablesReady={setupState.tablesReady}
      engineStatus={engineState?.status ?? "unknown"}
      workerLockStatus={workerLockResult.data?.status ?? "unknown"}
      providerCapabilities={PROVIDER_CAPABILITIES}
      engineState={engineState}
      observatorySettings={settings}
      topicSuggestions={topicSuggestions}
      recentActivity={recentActivity}
    />
  );
}
