import { useKnowledgeBase } from "@/hooks/api/use-operations";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export function KnowledgeBasePage() {
  const knowledgeBase = useKnowledgeBase();

  if (knowledgeBase.isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold">Internal Knowledge Base</h1>
        <p className="text-sm text-muted-foreground">
          Troubleshooting guides, installation procedures, response scripts, escalation rules, and common fault solutions for support and engineering teams.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
    </div>
  );
}
