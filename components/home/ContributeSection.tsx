"use client";

import { FormEvent, useRef, useState } from "react";
import {
  Bug,
  Code2,
  Lightbulb,
  MessageSquare,
  Send,
  Telescope,
} from "lucide-react";
import { SupportEngine } from "@/components/home/SupportEngine";
import { PanelHelp } from "@/components/ui/PanelHelp";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xeelnkqj";

const submissionTypes = [
  "Observation",
  "Idea",
  "Issue report",
  "Collaboration",
  "Other",
] as const;

type SubmissionType = (typeof submissionTypes)[number];

const getInvolvedLinks = [
  {
    label: "View on GitHub",
    icon: Code2,
    href: "https://github.com/amaeteventurestudios/collatz-engine",
  },
  { label: "Submit an observation", icon: Telescope, type: "Observation" as SubmissionType },
  { label: "Share an idea", icon: Lightbulb, type: "Idea" as SubmissionType },
  { label: "Report an issue", icon: Bug, type: "Issue report" as SubmissionType },
];

interface ContactFormState {
  name: string;
  email: string;
  submissionType: SubmissionType;
  subject: string;
  message: string;
  reference: string;
}

const defaultFormState: ContactFormState = {
  name: "",
  email: "",
  submissionType: "Observation",
  subject: "",
  message: "",
  reference: "",
};

export function ContributeSection() {
  const formRef = useRef<HTMLFormElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [form, setForm] = useState<ContactFormState>(defaultFormState);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function focusForm(type: SubmissionType) {
    setForm((current) => ({ ...current, submissionType: type }));
    setStatus("idle");
    setError(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => messageRef.current?.focus(), 250);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.email || !form.submissionType || !form.message) {
      setStatus("error");
      setError("Email, submission type, and message are required.");
      return;
    }

    setStatus("submitting");
    setError(null);

    try {
      const body = new FormData();
      body.set("project", "The Collatz Engine");
      body.set("name", form.name);
      body.set("email", form.email);
      body.set("submission_type", form.submissionType);
      body.set("subject", form.subject);
      body.set("message", form.message);
      body.set("reference", form.reference);

      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body,
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error("Form submission failed");
      }

      setStatus("success");
      setForm(defaultFormState);
    } catch {
      setStatus("error");
      setError("Message could not be sent right now. Please try again later.");
    }
  }

  return (
    <section id="contribute" className="scroll-mt-20 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 sm:text-3xl">
              Get Involved
            </h2>
            <PanelHelp
              title="Get Involved"
              description="Use this section to submit observations, report issues, suggest improvements, or contact the project."
              align="center"
            />
          </div>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Submit an observation, report an issue, share an idea, or contact the project directly.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
              <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                About This Project
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                The Collatz Engine is an independent public autonomous mathematics exploration
                system created by Amaete Umanah. It catalogs behavior, shares verified
                computational results, and does not claim to prove the Collatz Conjecture.
              </p>
              <a
                href="#about"
                className="mt-4 inline-flex text-xs font-medium text-teal-600 transition-colors hover:text-teal-500 dark:text-teal-400 dark:hover:text-teal-300"
              >
                Learn more about this project
              </a>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
              <p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Quick Actions
              </p>
              <ul className="space-y-2">
                {getInvolvedLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.label}>
                      {"href" in item ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 rounded-md border border-transparent px-3 py-3 text-sm text-slate-600 transition-colors hover:border-slate-300 hover:bg-white hover:text-teal-700 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-teal-300"
                        >
                          <Icon className="h-4 w-4 text-slate-400" />
                          {item.label}
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => focusForm(item.type)}
                          className="flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-3 text-left text-sm text-slate-600 transition-colors hover:border-slate-300 hover:bg-white hover:text-teal-700 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-teal-300"
                        >
                          <Icon className="h-4 w-4 text-slate-400" />
                          {item.label}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <SupportEngine />
          </div>

          <div className="rounded-lg border border-teal-500/30 bg-slate-950 p-5 shadow-sm shadow-teal-950/20 sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-teal-500/40 bg-teal-500/10">
                <MessageSquare className="h-4 w-4 text-teal-300" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-50">Contact / Contribute</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  Use this form to submit an observation, report an issue, suggest an improvement,
                  or contact the project.
                </p>
              </div>
            </div>

            {status === "success" && (
              <div className="mb-5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-300">Message sent.</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  Thank you for contributing to The Collatz Engine. Your submission has been received.
                </p>
              </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="project" value="The Collatz Engine" />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Name
                  <input
                    name="name"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                    className="mt-1.5 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400"
                    placeholder="Your name"
                  />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Email *
                  <input
                    required
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, email: event.target.value }))
                    }
                    className="mt-1.5 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400"
                    placeholder="you@example.com"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Submission Type *
                  <select
                    required
                    name="submission_type"
                    value={form.submissionType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        submissionType: event.target.value as SubmissionType,
                      }))
                    }
                    className="mt-1.5 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors focus:border-teal-400"
                  >
                    {submissionTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Subject
                  <input
                    name="subject"
                    value={form.subject}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, subject: event.target.value }))
                    }
                    className="mt-1.5 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400"
                    placeholder="Short summary"
                  />
                </label>
              </div>

              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Message *
                <textarea
                  ref={messageRef}
                  required
                  name="message"
                  value={form.message}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, message: event.target.value }))
                  }
                  className="mt-1.5 min-h-36 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400"
                  placeholder="Share an observation, idea, issue report, or collaboration note."
                />
              </label>

              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Optional URL / Reference
                <input
                  name="reference"
                  value={form.reference}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, reference: event.target.value }))
                  }
                  className="mt-1.5 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400"
                  placeholder="Link to data, issue, or context"
                />
              </label>

              {status === "error" && error && (
                <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-relaxed text-slate-500">
                  Submissions are used to improve the public computational record and dashboard.
                </p>
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {status === "submitting" ? "Sending..." : "Send Message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
