"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  Button,
  Label,
  Input,
  FormPageSkeleton,
  formatRupee,
  ApiError,
  useDebounce,
  CheckIcon,
  DocumentTextIcon,
} from "@repo/ui";
import { loansApi, type LoanQuoteResult } from "@/lib/api/loans";
import { documentsApi } from "@/lib/api/documents";
import { borrowerApi } from "@/lib/api/borrower";

const MIN_PRINCIPAL = 50000;
const MAX_PRINCIPAL = 500000;
const MIN_TENURE = 30;
const MAX_TENURE = 365;
const STEP_PRINCIPAL = 5000;

export default function ApplyPage() {
  const router = useRouter();

  // Eligibility check
  const [breState, setBreState] = useState<
    "loading" | "passed" | "failed" | "no_profile"
  >("loading");

  // Calculator state
  const [principalRupees, setPrincipalRupees] = useState(100000);
  const [tenureDays, setTenureDays] = useState(90);
  const [quote, setQuote] = useState<LoanQuoteResult | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Debounce slider inputs to avoid hammering the quote API
  const debouncedPrincipal = useDebounce(principalRupees, 400);
  const debouncedTenure = useDebounce(tenureDays, 400);

  // Check BRE eligibility on mount
  useEffect(() => {
    borrowerApi
      .getProfile()
      .then((res) => {
        if (!res.profile) {
          setBreState("no_profile");
          return;
        }
        setBreState(res.profile.bre?.passed ? "passed" : "failed");
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setBreState("no_profile");
        } else {
          setBreState("failed");
        }
      });
  }, []);

  // Fetch quote when inputs change
  const fetchQuote = useCallback(async () => {
    setQuoteLoading(true);
    try {
      const q = await loansApi.quote(debouncedPrincipal, debouncedTenure);
      setQuote(q);
    } catch {
      // Ignore quote errors silently
    } finally {
      setQuoteLoading(false);
    }
  }, [debouncedPrincipal, debouncedTenure]);

  useEffect(() => {
    void fetchQuote();
  }, [fetchQuote]);

  // Upload salary slip
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setUploadError(null);
    setDocumentId(null);
    setUploading(true);
    try {
      const res = await documentsApi.upload(f, "SALARY_SLIP");
      setDocumentId(res.document.id);
    } catch (err) {
      if (err instanceof ApiError) {
        setUploadError(err.message);
      } else {
        setUploadError("Upload failed. Please try again.");
      }
    } finally {
      setUploading(false);
    }
  }

  // Submit application
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!documentId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await loansApi.apply({
        principalRupees,
        tenureDays,
        salarySlipDocumentId: documentId,
      });
      router.push("/loans");
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError("Submission failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (breState === "loading") return <FormPageSkeleton />;

  return (
    <div>
      <PageHeader
        eyebrow="Loan Application"
        title="Apply for a Loan"
        subtitle="Use the interactive calculator to choose your terms, then attach your salary slip."
      />

      {breState === "no_profile" && (
        <div className="p-6 rounded-2xl border border-amber-200 bg-amber-50/70 text-amber-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Profile Incomplete</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Please complete your KYC profile details before applying for a
              loan.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/profile")}
          >
            Go to Profile →
          </Button>
        </div>
      )}

      {breState === "failed" && (
        <div className="p-6 rounded-2xl border border-rose-200 bg-rose-50/70 text-rose-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">
              Eligibility Criteria Not Met
            </p>
            <p className="text-xs text-rose-700 mt-0.5">
              Your profile does not currently satisfy the minimum loan criteria.
              Please update your profile to re-evaluate.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/profile")}
          >
            Update Profile →
          </Button>
        </div>
      )}

      {breState === "passed" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* ── Calculator Panel */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-slate-900">
              Loan Calculator
            </h2>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="mb-0">Principal Amount</Label>
                <span className="text-base font-extrabold text-indigo-600">
                  {formatRupee(principalRupees * 100)}
                </span>
              </div>
              <input
                type="range"
                id="principal-slider"
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                min={MIN_PRINCIPAL}
                max={MAX_PRINCIPAL}
                step={STEP_PRINCIPAL}
                value={principalRupees}
                onChange={(e) => setPrincipalRupees(Number(e.target.value))}
              />
              <div className="flex justify-between text-[11px] font-medium text-slate-400 mt-1">
                <span>{formatRupee(MIN_PRINCIPAL * 100)}</span>
                <span>{formatRupee(MAX_PRINCIPAL * 100)}</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="mb-0">Tenure Duration</Label>
                <span className="text-base font-extrabold text-indigo-600">
                  {tenureDays} days
                </span>
              </div>
              <input
                type="range"
                id="tenure-slider"
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                min={MIN_TENURE}
                max={MAX_TENURE}
                step={5}
                value={tenureDays}
                onChange={(e) => setTenureDays(Number(e.target.value))}
              />
              <div className="flex justify-between text-[11px] font-medium text-slate-400 mt-1">
                <span>{MIN_TENURE} days</span>
                <span>{MAX_TENURE} days</span>
              </div>
            </div>

            {/* Quote result */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 space-y-3">
              {quoteLoading ? (
                <p className="text-xs text-indigo-600 font-medium animate-pulse text-center py-2">
                  Calculating quote…
                </p>
              ) : quote ? (
                <>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Principal</span>
                    <span className="font-semibold text-slate-800">
                      {formatRupee(quote.principalPaise)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Interest (12% per annum)</span>
                    <span className="font-semibold text-slate-800">
                      {formatRupee(quote.interestPaise)}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-indigo-200/60 flex justify-between font-bold text-sm text-indigo-900">
                    <span>Total Repayment</span>
                    <span className="text-base text-indigo-600">
                      {formatRupee(quote.totalRepaymentPaise)}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* ── Application Form */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6"
          >
            <h2 className="text-base font-bold text-slate-900">
              Application Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="principalInput" required>
                  Principal (₹)
                </Label>
                <Input
                  id="principalInput"
                  type="number"
                  value={principalRupees}
                  onChange={(e) => {
                    const v = Math.min(
                      MAX_PRINCIPAL,
                      Math.max(MIN_PRINCIPAL, Number(e.target.value)),
                    );
                    setPrincipalRupees(v);
                  }}
                  min={MIN_PRINCIPAL}
                  max={MAX_PRINCIPAL}
                />
              </div>
              <div>
                <Label htmlFor="tenureInput" required>
                  Tenure (days)
                </Label>
                <Input
                  id="tenureInput"
                  type="number"
                  value={tenureDays}
                  onChange={(e) => {
                    const v = Math.min(
                      MAX_TENURE,
                      Math.max(MIN_TENURE, Number(e.target.value)),
                    );
                    setTenureDays(v);
                  }}
                  min={MIN_TENURE}
                  max={MAX_TENURE}
                />
              </div>
            </div>

            {/* Salary slip upload */}
            <div>
              <Label htmlFor="salarySlip" required>
                Salary Slip Document
              </Label>
              <p className="text-xs text-slate-400 mb-2">
                Supported formats: PDF, JPEG, PNG (Max 5 MB)
              </p>
              <div className="relative rounded-xl border-2 border-dashed border-slate-300/80 hover:border-indigo-400 bg-slate-50/50 p-6 text-center cursor-pointer transition-colors">
                <input
                  id="salarySlip"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="text-sm font-medium text-slate-700">
                  {file ? (
                    <span className="inline-flex items-center gap-1.5 text-indigo-600 font-semibold">
                      <DocumentTextIcon className="w-4 h-4 text-indigo-500" />
                      <span>
                        {file.name} ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    </span>
                  ) : (
                    <span>Click or drag file here to upload</span>
                  )}
                </div>
              </div>

              {uploading && (
                <p className="mt-2 text-xs font-medium text-indigo-600 animate-pulse">
                  Uploading document…
                </p>
              )}
              {documentId && !uploadError && (
                <p className="mt-2 text-xs font-semibold text-emerald-600 inline-flex items-center gap-1.5">
                  <CheckIcon className="w-4 h-4 text-emerald-500" />
                  <span>Salary slip uploaded successfully</span>
                </p>
              )}
              {uploadError && (
                <p className="mt-2 text-xs font-semibold text-rose-600">
                  {uploadError}
                </p>
              )}
            </div>

            {submitError && (
              <p className="p-3 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl">
                {submitError}
              </p>
            )}

            <Button
              type="submit"
              fullWidth
              loading={submitting}
              disabled={!documentId || uploading}
              id="submit-application"
            >
              Submit Loan Application
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
