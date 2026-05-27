"use client";

import { FormEvent, useState } from "react";
import { Modal } from "@/components/ui/Modal";

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
    icon: "⌥",
    href: "https://github.com/amaeteventurestudios/collatz-engine",
  },
  { label: "Submit an observation", icon: "✦", type: "Observation" as SubmissionType },
  { label: "Share an idea", icon: "◈", type: "Idea" as SubmissionType },
  { label: "Report an issue", icon: "⚑", type: "Issue report" as SubmissionType },
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
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ContactFormState>(defaultFormState);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function openForm(type: SubmissionType) {
    setForm((current) => ({ ...current, submissionType: type }));
    setStatus("idle");
    setError(null);
    setFormOpen(true);
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 sm:text-3xl">
            Get Involved
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Support, share, and contribute to public mathematical exploration
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              About This Project
            </p>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              The Collatz Engine is an independent public exploration project created by Amaete
              Umanah. We do not claim to have solved the conjecture. We build tools, catalog
              behavior, and share findings to support mathematical exploration.
            </p>
            <a
              href="#about"
              className="mt-3 block text-xs font-medium text-teal-600 transition-colors hover:text-teal-500 dark:text-teal-400 dark:hover:text-teal-300"
            >
              Learn more about this project →
            </a>
            <div className="mt-4 flex items-center gap-1.5">
              <span className="live-dot" />
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Created by Amaete Umanah
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Get Involved
            </p>
            <ul className="space-y-1">
              {getInvolvedLinks.map((item) => (
                <li key={item.label}>
                  {"href" in item ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-lg px-1 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-200/60 hover:text-teal-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-teal-400"
                    >
                      <span className="w-4 text-center text-base leading-none text-slate-400">
                        {item.icon}
                      </span>
                      {item.label}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openForm(item.type)}
                      className="flex w-full items-center gap-3 rounded-lg px-1 py-2.5 text-left text-sm text-slate-600 transition-colors hover:bg-slate-200/60 hover:text-teal-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-teal-400"
                    >
                      <span className="w-4 text-center text-base leading-none text-slate-400">
                        {item.icon}
                      </span>
                      {item.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Support This Project
            </p>
            <p className="mb-5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Running the engine, storing data, and keeping the lights on costs money. If you find
              this project valuable, please consider supporting it.
            </p>
            <a
              href="#"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-3 text-sm font-bold text-yellow-900 shadow-sm transition-colors hover:bg-yellow-300 sm:w-auto"
            >
              Support on Ko-fi
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-6 border-t border-slate-200 pt-8 dark:border-slate-800 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Contact
            </p>
            <button
              type="button"
              onClick={() => openForm("Other")}
              className="mt-1.5 text-sm font-medium text-teal-600 transition-colors hover:text-teal-500 dark:text-teal-400 dark:hover:text-teal-300"
            >
              Send a message through the Get Involved form
            </button>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              Observations, ideas, issue reports, and collaboration notes are welcome.
            </p>
          </div>
          <a
            href="https://github.com/amaeteventurestudios/collatz-engine"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-slate-400 transition-colors hover:text-teal-600 dark:text-slate-500 dark:hover:text-teal-400"
          >
            GitHub
          </a>
        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Get Involved"
        maxWidth="max-w-2xl"
      >
        {status === "success" ? (
          <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-5">
            <p className="text-sm font-semibold text-teal-300">Message sent.</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Thank you for contributing to The Collatz Engine. Your submission has been received.
            </p>
            <button
              type="button"
              onClick={() => {
                setStatus("idle");
                setFormOpen(false);
              }}
              className="mt-5 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-400"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="project" value="The Collatz Engine" />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Name
                <input
                  name="name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400"
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
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400"
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
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors focus:border-teal-400"
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
                  onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400"
                  placeholder="Short summary"
                />
              </label>
            </div>

            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Message *
              <textarea
                required
                name="message"
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                className="mt-1.5 min-h-32 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400"
                placeholder="Share an observation, idea, issue report, or collaboration note."
              />
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Optional URL or Reference
              <input
                name="reference"
                value={form.reference}
                onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400"
                placeholder="Link to data, issue, or context"
              />
            </label>

            {status === "error" && error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
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
                className="rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "submitting" ? "Sending..." : "Send Message"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </section>
  );
}
