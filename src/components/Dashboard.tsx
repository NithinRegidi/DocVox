import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { useMemo } from "react";
import { Document } from "@/integrations/supabase/types";
import ReminderManager from "@/components/ReminderManager";

interface DashboardProps {
  documents: Document[];
}

const Dashboard = ({ documents }: DashboardProps) => {
  const stats = useMemo(() => {
    const total = documents.length;
    
    // Document type breakdown
    const typeBreakdown = documents.reduce((acc, doc) => {
      const type = doc.document_type || "Unknown";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Urgency breakdown
    const urgencyBreakdown = documents.reduce((acc, doc) => {
      const urgency = doc.ai_analysis?.urgency || "unknown";
      acc[urgency] = (acc[urgency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentDocs = documents.filter(
      doc => new Date(doc.created_at) >= sevenDaysAgo
    ).length;

    // Processing status
    const statusBreakdown = documents.reduce((acc, doc) => {
      const status = doc.processing_status || "unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      typeBreakdown,
      urgencyBreakdown,
      recentDocs,
      statusBreakdown,
    };
  }, [documents]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high':
        return 'bg-red-500/10 text-red-700 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'low':
        return 'bg-green-500/10 text-green-700 border-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      "Bank Letter": "bg-blue-500/10 text-blue-700 border-blue-500/20",
      "Legal Notice": "bg-red-500/10 text-red-700 border-red-500/20",
      "Government Form": "bg-green-500/10 text-green-700 border-green-500/20",
      "Academic Document": "bg-purple-500/10 text-purple-700 border-purple-500/20",
      "General Document": "bg-gray-500/10 text-gray-700 border-gray-500/20",
    };
    return colors[type] || colors["General Document"];
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Documents</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <FileText className="h-12 w-12 text-primary opacity-50" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Last 7 Days</p>
              <p className="text-3xl font-bold">{stats.recentDocs}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-green-600 opacity-50" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">High Urgency</p>
              <p className="text-3xl font-bold">{stats.urgencyBreakdown.high || 0}</p>
            </div>
            <AlertCircle className="h-12 w-12 text-orange-600 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Document Types */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Document Types
        </h3>
        <div className="space-y-3">
          {Object.entries(stats.typeBreakdown)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([type, count]) => {
              const numCount = count as number;
              return (
                <div key={type} className="flex items-center justify-between">
                  <Badge className={getTypeColor(type)} variant="outline">
                    {type}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${(numCount / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{numCount}</span>
                  </div>
                </div>
              );
            })}
        </div>
      </Card>

      {/* Urgency Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          Urgency Distribution
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['high', 'medium', 'low'].map((urgency) => (
            <div key={urgency} className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="flex justify-center mb-2">
                {urgency === 'high' && <AlertCircle className="h-8 w-8 text-red-500" />}
                {urgency === 'medium' && <Clock className="h-8 w-8 text-yellow-500" />}
                {urgency === 'low' && <CheckCircle2 className="h-8 w-8 text-green-500" />}
              </div>
              <p className="text-2xl font-bold mb-1">
                {stats.urgencyBreakdown[urgency] || 0}
              </p>
              <Badge className={getUrgencyColor(urgency)} variant="outline">
                {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Reminders Section */}
      <Card className="p-6">
        <ReminderManager />
      </Card>
    </div>
  );
};

export default Dashboard;
