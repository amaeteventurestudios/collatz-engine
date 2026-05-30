import type { GuardrailRule, AIDraftRow } from "./types";

// ─── Static guardrail rules ────────────────────────────────────────────────────

export const SYSTEM_GUARDRAILS: Omit<GuardrailRule, "passed" | "detail">[] = [
  {
    id: "no_solution_claims",
    label: "No Solution Claims",
    description: "Content must not claim to prove or solve the Collatz Conjecture.",
    enforcement: "enforced",
  },
  {
    id: "human_review_required",
    label: "Human Review Required",
    description: "No content can be published without explicit human approval.",
    enforcement: "enforced",
  },
  {
    id: "verified_data_only",
    label: "Verified Data Only",
    description: "All statistics and claims must come from verified engine computation data.",
    enforcement: "enforced",
  },
  {
    id: "source_data_attached",
    label: "Source Data Attached",
    description: "Drafts must reference their source data before approval.",
    enforcement: "configured",
  },
  {
    id: "disclaimers_required",
    label: "Disclaimers Included",
    description: "Public-facing content must include a disclaimer about computational vs. mathematical proof.",
    enforcement: "configured",
  },
  {
    id: "no_unsupported_claims",
    label: "No Unsupported Mathematical Claims",
    description: "Content must not make mathematical claims beyond what verified computation supports.",
    enforcement: "enforced",
  },
  {
    id: "audit_trail",
    label: "Audit Trail Enabled",
    description: "All creation, approval, and export events are logged with timestamps.",
    enforcement: "enforced",
  },
  {
    id: "image_no_proof",
    label: "Images Must Not Imply Proof",
    description: "Generated images must not contain text or imagery suggesting the conjecture is solved.",
    enforcement: "configured",
  },
  {
    id: "approval_before_publish",
    label: "Approval Required to Publish",
    description: "Only drafts with status 'approved' may be published or exported publicly.",
    enforcement: "enforced",
  },
];

// ─── Runtime checks ────────────────────────────────────────────────────────────

const PROOF_CLAIM_PHRASES = [
  "proves the conjecture",
  "conjecture is proved",
  "conjecture is proven",
  "conjecture solved",
  "solved the collatz",
  "proof of collatz",
  "collatz conjecture is true",
  "we have proven",
  "we have proved",
  "mathematical proof",
  "definitive proof",
  "conclusive proof",
];

const DISCLAIMER_PHRASES = [
  // Standard disclosure text inserted by Content Radar drafts
  "does not claim to prove",
  "no proof claim",
  "not claiming to prove",
  "generated automatically",
  // Legacy / manually written disclaimer phrases
  "computational observation",
  "not a proof",
  "consistent with",
  "computationally verified",
  "all trajectories reached 1",
];

export interface GuardrailCheckResult {
  passed: boolean;
  rules: GuardrailRule[];
  failedCount: number;
  summary: string;
}

export function checkDraftGuardrails(draft: Partial<AIDraftRow>): GuardrailCheckResult {
  const text = [
    draft.title ?? "",
    draft.body_markdown ?? "",
    draft.body_plain_text ?? "",
  ].join(" ").toLowerCase();

  const rules: GuardrailRule[] = SYSTEM_GUARDRAILS.map((rule) => {
    let passed = true;
    let detail = "";

    if (rule.id === "no_solution_claims") {
      const found = PROOF_CLAIM_PHRASES.find((p) => text.includes(p));
      passed = !found;
      if (found) detail = `Flagged phrase: "${found}"`;
    } else if (rule.id === "human_review_required") {
      passed = true; // Always enforced — workflow ensures this
      detail = "Enforced by approval workflow.";
    } else if (rule.id === "source_data_attached") {
      passed = draft.source_data != null && Object.keys(draft.source_data).length > 0;
      if (!passed) detail = "No source data attached to this draft.";
    } else if (rule.id === "disclaimers_required") {
      const hasDisclaimer = DISCLAIMER_PHRASES.some((p) => text.includes(p));
      passed = hasDisclaimer || !draft.body_markdown; // only check if body exists
      if (!passed) detail = "No disclaimer phrase detected in content.";
    } else if (rule.id === "no_unsupported_claims") {
      const found = PROOF_CLAIM_PHRASES.find((p) => text.includes(p));
      passed = !found;
      if (found) detail = `Unsupported claim detected: "${found}"`;
    } else if (rule.id === "approval_before_publish") {
      passed = draft.status !== "published" || draft.approved_at != null;
      if (!passed) detail = "Draft is marked published but was never approved.";
    } else {
      // Rules enforced by system design — always pass in check
      passed = true;
      detail = `${rule.enforcement.charAt(0).toUpperCase() + rule.enforcement.slice(1)} by system.`;
    }

    return { ...rule, passed, detail: detail || undefined };
  });

  const failedCount = rules.filter((r) => !r.passed).length;
  const summary = failedCount === 0
    ? "All guardrail checks passed."
    : `${failedCount} guardrail check${failedCount > 1 ? "s" : ""} failed.`;

  return { passed: failedCount === 0, rules, failedCount, summary };
}
