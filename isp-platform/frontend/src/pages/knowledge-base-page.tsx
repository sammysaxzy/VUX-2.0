import { useState } from "react";
import { useKnowledgeBase, useSaveKnowledgeBaseArticle } from "@/hooks/api/use-operations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { KnowledgeBaseArticle } from "@/types";

const blankArticle: KnowledgeBaseArticle = {
  id: "",
  category: "troubleshooting",
  title: "",
  summary: "",
  audience: "support",
};

export function KnowledgeBasePage() {
  const knowledgeBase = useKnowledgeBase();
  const saveArticle = useSaveKnowledgeBaseArticle();
  const [form, setForm] = useState<KnowledgeBaseArticle>(blankArticle);

  if (knowledgeBase.isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold">Internal Knowledge Base</h1>
        <p className="text-sm text-muted-foreground">
          Troubleshooting guides, installation procedures, response scripts, escalation rules, and common fault solutions for support and engineering teams.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
          {(knowledgeBase.data ?? []).map((article) => (
            <Card key={article.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline">{article.category.replace(/_/g, " ")}</Badge>
                  <Badge variant="outline">{article.audience}</Badge>
                </div>
                <CardTitle className="text-lg">{article.title}</CardTitle>
                <CardDescription>{article.summary}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Use this as a reusable internal guide during fault handling, installs, and customer communication.
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add Knowledge Article</CardTitle>
            <CardDescription>Create persistent internal guidance for support, NOC, and field teams.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as KnowledgeBaseArticle["category"] }))}>
                  <option value="troubleshooting">troubleshooting</option>
                  <option value="installation">installation</option>
                  <option value="responses">responses</option>
                  <option value="escalation">escalation</option>
                  <option value="fault_solutions">fault_solutions</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Audience</Label>
                <Select value={form.audience} onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value as KnowledgeBaseArticle["audience"] }))}>
                  <option value="support">support</option>
                  <option value="engineer">engineer</option>
                  <option value="noc">noc</option>
                  <option value="all">all</option>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Summary</Label>
              <Textarea value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} className="min-h-32" />
            </div>
            <Button
              onClick={() =>
                saveArticle.mutate(
                  form,
                  { onSuccess: () => setForm(blankArticle) },
                )
              }
              disabled={saveArticle.isPending || !form.title.trim() || !form.summary.trim()}
            >
              {saveArticle.isPending ? "Saving..." : "Save Article"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
