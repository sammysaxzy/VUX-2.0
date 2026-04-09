import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CircleOff, Router, Signal } from "lucide-react";
import { useCustomer } from "@/hooks/api/use-customers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export function CustomerProfilePage() {
  const { id } = useParams();
  const { data: customer, isLoading, isError } = useCustomer(id);

  if (isLoading) return <PageSkeleton />;

  if (isError || !customer) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-danger">Customer record not available.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex items-center justify-between">
        <Link to="/customers">
          <Button variant="outline">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Customers
          </Button>
        </Link>
        <Badge variant="outline">{customer.customerType}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{customer.name}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Customer ID:</span> {customer.id}
            </p>
            <p>
              <span className="text-muted-foreground">Customer Type:</span> {customer.customerType}
            </p>
            <p>
              <span className="text-muted-foreground">Address:</span> {customer.address}
            </p>
            <p>
              <span className="text-muted-foreground">GPS:</span> {customer.location.lat}, {customer.location.lng}
            </p>
            <p>
              <span className="text-muted-foreground">MST:</span> {customer.mstId}
            </p>
            <p>
              <span className="text-muted-foreground">Splitter Port:</span> {customer.splitterPort}
            </p>
            <p>
              <span className="text-muted-foreground">Fibre Core:</span> {customer.fibreCoreId}
            </p>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/70 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">ONU & PON</p>
              <div className="mt-2 flex items-center gap-2">
                <Router className="h-4 w-4 text-primary" />
                <p>
                  {customer.onuSerial} on {customer.oltName} / {customer.ponPort}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-border/70 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Signal Levels</p>
              <p className="mt-2 flex items-center gap-2">
                <Signal className="h-4 w-4 text-info" /> RX {customer.rxSignal} dBm / TX {customer.txSignal} dBm
              </p>
            </div>
            <div className="rounded-xl border border-border/70 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Link Status</p>
              <p className="mt-2 flex items-center gap-2">
                <CircleOff className="h-4 w-4 text-warning" />
                {customer.online ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
