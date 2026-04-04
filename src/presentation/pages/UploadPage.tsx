import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { useSessions } from "@/application/hooks/training/useSessions";
import UploadZone from "@/presentation/components/training/UploadZone";
import RecentUploads from "@/presentation/components/training/RecentUploads";
import { apiClient } from "@/application/api/client";

export default function UploadPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const queryClient = useQueryClient();

  // Fetch last 20 sessions (recent uploads)
  const { data: sessionsData, isLoading: sessionsLoading } = useSessions(
    athleteId,
    "all"
  );

  const sessions = (sessionsData?.sessions ?? []).slice(0, 20);

  const handleUploadComplete = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["sessions", athleteId] });
  }, [queryClient, athleteId]);

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      if (!athleteId) return;
      try {
        await apiClient.delete(`/training/sessions/${athleteId}/${sessionId}`);
        queryClient.invalidateQueries({ queryKey: ["sessions", athleteId] });
      } catch {
        // Error handling is done via the api client
      }
    },
    [athleteId, queryClient]
  );

  // No athlete selected
  if (!athleteId) {
    return (
      <div data-testid="upload-page" className="mx-auto max-w-4xl p-4 md:p-6">
        <h1 className="mb-4 text-2xl font-bold text-foreground">Upload</h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">
            Vaelg en atlet for at uploade traeningsfiler.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="upload-page" className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-foreground">Upload</h1>

      {/* Upload zone */}
      <UploadZone
        athleteId={athleteId}
        onUploadComplete={handleUploadComplete}
      />

      {/* Recent uploads */}
      <RecentUploads
        sessions={sessions}
        isLoading={sessionsLoading}
        onDelete={handleDeleteSession}
      />
    </div>
  );
}
