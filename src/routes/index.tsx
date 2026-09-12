import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { CommitteeSession } from "@/components/committee-session";
import { ProfessorPicker } from "@/components/professor-picker";
import { ProfileForm } from "@/components/profile-form";
import { ReviewBoard } from "@/components/review-board";
import { ReviewingOverlay } from "@/components/reviewing-overlay";
import { useCaseStore } from "@/store/case-store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const step = useCaseStore((s) => s.step);
  const reviewing = useCaseStore((s) => s.reviewing);

  useEffect(() => {
    void useCaseStore.persist.rehydrate();
  }, []);

  return (
    <AppShell>
      {reviewing ? (
        <ReviewingOverlay />
      ) : step === "profile" ? (
        <ProfileForm />
      ) : step === "committee" ? (
        <ProfessorPicker />
      ) : step === "reviews" ? (
        <ReviewBoard />
      ) : (
        <CommitteeSession />
      )}
    </AppShell>
  );
}
