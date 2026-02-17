import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

const Reports = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground">Generate professional bills and statements</p>
      </div>
      <Card>
        <CardHeader><CardTitle>PDF Bill Generation</CardTitle></CardHeader>
        <CardContent className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">PDF bill generation will be available in Phase 6.</p>
          <Button disabled>Generate Professional Bill</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
