"use client";

import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getConfigurationItem } from "@/components/settings/configuration-items";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function ConfigDetailPage() {
  const { section } = useParams();
  const navigate = useNavigate();
  const item = getConfigurationItem(section);
  const initialForm = useMemo(
    () =>
      item
        ? Object.fromEntries(
            item.sections.flatMap((entry) =>
              entry.fields.map((field) => [field.id, field.type === "toggle" ? false : field.type === "select" ? field.options[0] : ""]),
            ),
          )
        : {},
    [item],
  );
  const [values, setValues] = useState<Record<string, string | boolean>>(initialForm);

  useEffect(() => {
    setValues(initialForm);
  }, [initialForm]);

  if (!item) {
    return <Navigate to="/settings/configuration" replace />;
  }

  return (
    <SettingsLayout
      activeTab="configuration"
      summary={item.label}
      description="Manage global system behavior for portal experience, communications, automation, billing, and integrations."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Configuration / {item.label}</p>
            <h2 className="text-xl font-semibold">{item.label}</h2>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
          <Button type="button" variant="outline" onClick={() => navigate("/settings/configuration")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        {item.sections.map((sectionItem) => (
          <Card key={sectionItem.title}>
            <CardHeader>
              <CardTitle>{sectionItem.title}</CardTitle>
              <CardDescription>{sectionItem.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {sectionItem.fields.map((field) => {
                  if (field.type === "toggle") {
                    return (
                      <div key={field.id} className="rounded-xl border border-border/70 p-4 md:col-span-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Label htmlFor={field.id}>{field.label}</Label>
                            <p className="mt-1 text-sm text-muted-foreground">{field.helper}</p>
                          </div>
                          <Switch
                            checked={Boolean(values[field.id])}
                            onCheckedChange={(checked) => setValues((current) => ({ ...current, [field.id]: checked }))}
                          />
                        </div>
                      </div>
                    );
                  }

                  if (field.type === "textarea") {
                    return (
                      <div key={field.id} className="space-y-1 md:col-span-2">
                        <Label htmlFor={field.id}>{field.label}</Label>
                        <Textarea
                          id={field.id}
                          value={String(values[field.id] ?? "")}
                          placeholder={field.placeholder}
                          onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}
                        />
                      </div>
                    );
                  }

                  if (field.type === "select") {
                    return (
                      <div key={field.id} className="space-y-1">
                        <Label htmlFor={field.id}>{field.label}</Label>
                        <Select
                          id={field.id}
                          value={String(values[field.id] ?? field.options[0])}
                          onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}
                        >
                          {field.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </Select>
                      </div>
                    );
                  }

                  return (
                    <div key={field.id} className="space-y-1">
                      <Label htmlFor={field.id}>{field.label}</Label>
                      <Input
                        id={field.id}
                        type={field.type}
                        value={String(values[field.id] ?? "")}
                        placeholder={field.placeholder}
                        onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={() => toast.success(`${item.label} configuration saved.`)}>
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsLayout>
  );
}
