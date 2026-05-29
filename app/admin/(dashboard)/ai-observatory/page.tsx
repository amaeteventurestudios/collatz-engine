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
} from "@/lib/ai-observatory/admin-store";
import { isEncryptionConfigured } from "@/lib/ai-observatory/encryption";
import { PROVIDER_CAPABILITIES } from "@/lib/ai-observatory/types";
import { getEngineAdminState, getWorkerLockState } from "@/lib/admin/metrics";
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
  ]);

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
      engineStatus={engineResult.data?.status ?? "unknown"}
      workerLockStatus={workerLockResult.data?.status ?? "unknown"}
      providerCapabilities={PROVIDER_CAPABILITIES}
    />
  );
}
