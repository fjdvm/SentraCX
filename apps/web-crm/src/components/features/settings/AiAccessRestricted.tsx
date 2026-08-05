import React from "react";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AiAccessRestrictedProps {
  userRole: string;
}

export function AiAccessRestricted({ userRole }: AiAccessRestrictedProps) {
  return (
    <Card className="bg-card border border-border rounded-xl shadow-none">
      <CardContent className="p-xl flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <Lock className="w-6 h-6 text-destructive" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-foreground">Access Restricted</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Only administrators and support managers are permitted to modify AI scoring thresholds, weights, and model sensitivities.
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          Current Role: {userRole}
        </Badge>
      </CardContent>
    </Card>
  );
}
