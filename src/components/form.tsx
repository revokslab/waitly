"use client";

import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useSearchParams } from "next/navigation";

interface FormProps {
  onSuccessChange?: (success: boolean) => void;
}

export default function WaitlistForm({ onSuccessChange }: FormProps) {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");

  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [shareLink, setShareLink] = useState<string>("");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      if (!formData.email || !isValidEmail(formData.email)) {
        toast.error("Please enter a valid email address");
        return;
      }
      setStep(2);
      return;
    }

    try {
      setLoading(true);

      const payload = {
        firstname: formData.name || formData.email.split("@")[0],
        email: formData.email,
        referredBy: refCode || undefined,
      };

      const mailRes = await fetch("/api/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!mailRes.ok) {
        const err = mailRes.status === 429 ? "Rate limited" : "Email failed";
        throw new Error(err);
      }

      const notionRes = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!notionRes.ok) {
        const errData = await notionRes.json();
        if (notionRes.status === 409) {
          toast.error(errData.error || "You're already on the waitlist!");
          return;
        }
        const err = notionRes.status === 429 ? "Rate limited" : "Notion failed";
        throw new Error(err);
      }

      const { code } = await notionRes.json();
      const link = `${window.location.origin}/?ref=${code}`;
      setShareLink(link);

      toast.success("You're on the waitlist!");
      setSuccess(true);
      onSuccessChange?.(true);

      setTimeout(() => {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"],
        });
      }, 150);

      setFormData({ email: "", name: "" });
    } catch (error: any) {
      const msg =
        error.message === "Rate limited"
          ? "Too many attempts. Try again later."
          : "Something went wrong. Try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({ email: "", name: "" });
    setSuccess(false);
    setShareLink("");
    onSuccessChange?.(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success("Link copied!");
  };

  return (
    <div className="w-full relative">
      {success ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <p className="text-lg font-medium">
            Share your link to skip the line!
          </p>
          <div className="flex items-center gap-2 max-w-sm mx-auto">
            <input
              value={shareLink}
              readOnly
              className="flex-1 px-3 py-2 border rounded-lg text-black text-sm bg-gray-50"
            />
            <button
              onClick={copyLink}
              className="px-4 py-2 bg-[#e5ff00] text-black rounded-lg font-medium hover:bg-opacity-90"
            >
              Copy
            </button>
          </div>
          <button
            onClick={resetForm}
            className="text-sm text-gray-600 underline"
          >
            Join with another email
          </button>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="relative">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex relative"
              >
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className="flex-grow bg-background border border-border text-foreground px-4 py-3 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#e5ff00] focus:ring-offset-2"
                  disabled={loading}
                  required
                />
                <button
                  type="submit"
                  className="absolute right-0 top-0 bottom-0 bg-[#e5ff00] text-black px-5 py-2 m-2 rounded-[12px] font-semibold hover:bg-opacity-90 disabled:opacity-50"
                  disabled={loading}
                >
                  Continue
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="name"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3来说"
              >
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Name (optional)"
                  className="w-full bg-background border border-border text-foreground px-4 py-3 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#e5ff00] focus:ring-offset-2"
                  disabled={loading}
                />
                <button
                  type="submit"
                  className="w-full bg-[#e5ff00] text-black py-3 rounded-[12px] font-semibold hover:bg-opacity-90 disabled:opacity-50 flex items-center justify-center"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Joining...
                    </>
                  ) : (
                    "Join Waitlist"
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      )}
    </div>
  );
}