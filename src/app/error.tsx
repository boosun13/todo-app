"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="space-y-4 py-16 text-center" role="alert">
      <h1 className="text-2xl font-semibold">問題が発生しました</h1>
      <p className="text-muted-foreground">時間をおいて再度お試しください。{error.digest && `(ID: ${error.digest})`}</p>
      <Button onClick={() => retry()}>再試行</Button>
    </div>
  );
}
