"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  title: string;
  description: string;
  href: string;
  icon?: ReactNode;
};

export function ConfigItemCard({ title, description, href, icon }: Props) {
  return (
    <Link to={href} className="block">
      <Card className="transition hover:bg-muted/20">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {icon ? <div className="rounded-xl bg-muted p-2 text-muted-foreground">{icon}</div> : null}
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground">Open {title.toLowerCase()} configuration.</CardContent>
      </Card>
    </Link>
  );
}

