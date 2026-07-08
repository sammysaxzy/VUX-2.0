import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAiNoc } from "@/hooks/api/use-business";
import type { AiNocResponse } from "@/types";

const aiModes: AiNocResponse["mode"][] = [
  "support",
  "fault_analysis",
  "report",
  "outage_explanation",
  "technician_guidance",
];

export function AiNocPage() {
  const aiMutation = useAiNoc();
  const [mode, setMode] = useState<AiNocResponse["mode"]>("fault_analysis");
  const [prompt, setPrompt] = useState(
    "Core OLT is healthy, but customers downstream of Closure CL-17 are reporting packet loss and four ONUs dropped in the last 30 minutes. Provide an operator-ready fault analysis.",
  );
  const [history, setHistory] = useState<AiNocResponse[]>([]);

  const helperText = useMemo(() => {
    if (mode === "support") return "Draft a calm support response with next action and ETA framing.";
    if (mode === "fault_analysis") return "Summarize likely root cause, checks, and affected service scope.";
    if (mode === "report") return "Prepare management-ready summaries for daily operations and outage reviews.";
    if (mode === "outage_explanation") return "Generate a clear customer-facing outage statement without exposing internal jargon.";
    return "Guide field technicians with safe, structured troubleshooting steps.";
  }, [mode]);

  const askAssistant = () => {
    if (!prompt.trim()) return;
    aiMutation.mutate(
      { prompt, mode },
      {
        onSuccess: (response) => setHistory((current) => [response, ...current].slice(0, 6)),
      },
    );
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <Card>
        <CardHeader>
          <CardTitle>AI Assistant / AI NOC</CardTitle>
          <CardDescription>
            API-ready operations assistant for support replies, outage explanations, field guidance, and management reporting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            This demo uses mock responses only. Live AI providers should be connected through environment variables on the backend, not hard-coded in the frontend.
          </div>
          <div className="space-y-1">
            <Label>Mode</Label>
            <Select value={mode} onChange={(event) => setMode(event.target.value as AiNocResponse["mode"])}>
              {aiModes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">{helperText}</p>
          </div>
          <div className="space-y-1">
            <Label>Prompt</Label>
            <Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="min-h-48" />
          </div>
          <Button onClick={askAssistant} disabled={aiMutation.isPending} className="w-full">
            {aiMutation.isPending ? "Generating..." : "Generate Guidance"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Latest Response</CardTitle>
            <CardDescription>Use this area during demos to show operator help, customer messaging, and incident write-ups.</CardDescription>
          </CardHeader>
          <CardContent>
            {aiMutation.data ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{aiMutation.data.mode.replace(/_/g, " ")}</Badge>
                  <Badge variant="outline">mock response</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{aiMutation.data.prompt}</p>
                <div className="rounded-xl bg-muted/30 p-4 text-sm leading-6">{aiMutation.data.response}</div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                Generate a response to preview AI-assisted NOC operations.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent AI Jobs</CardTitle>
            <CardDescription>Short history of the most recent advisory outputs generated in this session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No AI guidance generated yet.</p>
            ) : (
              history.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/70 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-medium">{item.mode.replace(/_/g, " ")}</p>
                    <Badge variant="outline">{new Date(item.createdAt).toLocaleString()}</Badge>
                  </div>
                  <p className="mb-2 text-xs text-muted-foreground">{item.prompt}</p>
                  <p className="text-sm">{item.response}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
