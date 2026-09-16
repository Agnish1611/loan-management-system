"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  Button,
  Label,
  Input,
  Select,
  PageSpinner,
  Badge,
  formatDate,
  ApiError,
  CheckIcon,
} from "@repo/ui";
import { borrowerApi } from "@/lib/api/borrower";
import type {
  BorrowerProfileDto,
  BorrowerProfileUpsertInput,
} from "@repo/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<BorrowerProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [panNumber, setPanNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [employmentMode, setEmploymentMode] = useState<
    "SALARIED" | "SELF_EMPLOYED" | "UNEMPLOYED" | ""
  >("");

  useEffect(() => {
    borrowerApi
      .getProfile()
      .then((res) => {
        const p = res.profile;
        if (!p) return;
        setProfile(p);
        setPanNumber(p.panNumber);
        setDateOfBirth(p.dateOfBirth.split("T")[0] ?? "");
        setMonthlySalary(String(p.monthlySalaryPaise / 100));
        setEmploymentMode(p.employmentMode);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          // No profile yet — blank form
          return;
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setWarning(null);
    setSuccess(false);

    const cleanPan = panNumber.trim().toUpperCase();
    if (!cleanPan) {
      setError("Please enter your PAN number.");
      return;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(cleanPan)) {
      setError(
        "Invalid PAN format. Must be 5 uppercase letters, 4 digits, and 1 letter (e.g. ABCDE1234F).",
      );
      return;
    }

    if (!dateOfBirth) {
      setError("Please select your date of birth.");
      return;
    }

    if (!monthlySalary.trim()) {
      setError("Please enter your monthly salary.");
      return;
    }

    const salaryNum = Number(monthlySalary);
    if (isNaN(salaryNum) || salaryNum < 0) {
      setError("Monthly salary must be a positive number.");
      return;
    }

    if (!employmentMode) {
      setError("Please select an employment mode.");
      return;
    }

    const payload: BorrowerProfileUpsertInput = {
      panNumber: cleanPan,
      dateOfBirth,
      monthlySalary: salaryNum,
      employmentMode,
    };

    setSaving(true);
    try {
      const res = await borrowerApi.upsertProfile(payload);
      setProfile(res.profile);
      if (res.isEligible) {
        setSuccess(true);
        setWarning(null);
        setError(null);
      } else {
        setSuccess(false);
        setWarning(
          "Profile saved. However, you do not currently meet baseline loan eligibility criteria. Please review the scorecard above.",
        );
        setError(null);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to save profile. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Your Profile"
        subtitle="Complete your KYC details to unlock loan applications and evaluate eligibility."
      />

      {/* BRE result card */}
      {profile?.bre && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Eligibility Check Result
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated on {formatDate(profile.bre.evaluatedAt)} · Age at
                evaluation: {profile.bre.ageAtEvaluation} yrs
              </p>
            </div>
            <Badge
              variant={profile.bre.passed ? "success" : "danger"}
              dot
              className="text-sm px-3 py-1"
            >
              {profile.bre.passed ? "Eligible" : "Not Eligible"}
            </Badge>
          </div>

          <ul className="mt-4 space-y-2.5">
            {profile.bre.results.map((r) => (
              <li
                key={r.rule}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-sm"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                    r.passed ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      {r.rule}
                    </span>
                    <span
                      className={`text-xs font-semibold uppercase ${
                        r.passed ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {r.passed ? "Passed" : "Failed"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{r.message}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* KYC form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6"
      >
        <div>
          <h2 className="text-base font-bold text-slate-900">KYC Details</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Your government ID and verified employment details
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="panNumber" required>
              PAN Number
            </Label>
            <Input
              id="panNumber"
              value={panNumber}
              onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
              placeholder="ABCDE1234F"
              maxLength={10}
              required
            />
          </div>
          <div>
            <Label htmlFor="dateOfBirth" required>
              Date of Birth
            </Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="monthlySalary" required>
              Monthly Salary (₹)
            </Label>
            <Input
              id="monthlySalary"
              type="number"
              value={monthlySalary}
              onChange={(e) => setMonthlySalary(e.target.value)}
              placeholder="e.g. 35000"
              min={0}
              required
              hint="Minimum ₹25,000 to be eligible"
            />
          </div>
          <div>
            <Label htmlFor="employmentMode" required>
              Employment Mode
            </Label>
            <Select
              id="employmentMode"
              value={employmentMode}
              onChange={(e) =>
                setEmploymentMode(
                  e.target.value as "SALARIED" | "SELF_EMPLOYED" | "UNEMPLOYED",
                )
              }
              placeholder="Select mode"
              required
            >
              <option value="SALARIED">Salaried</option>
              <option value="SELF_EMPLOYED">Self-Employed</option>
              <option value="UNEMPLOYED">Unemployed</option>
            </Select>
          </div>
        </div>

        {error && (
          <p className="p-3 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl">
            {error}
          </p>
        )}
        {warning && (
          <div className="p-3.5 text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
            <p className="font-semibold text-amber-950">{warning}</p>
            <p className="text-amber-800">
              You can update your details or apply once you meet the minimum
              eligibility criteria.
            </p>
          </div>
        )}
        {success && (
          <p className="p-3 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl inline-flex items-center gap-1.5 w-full">
            <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Profile saved successfully. Eligibility check has run and
              approved.
            </span>
          </p>
        )}

        <div className="pt-2">
          <Button type="submit" loading={saving} id="save-profile">
            Save &amp; Run Eligibility Check
          </Button>
        </div>
      </form>
    </div>
  );
}
