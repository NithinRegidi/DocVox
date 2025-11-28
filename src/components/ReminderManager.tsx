import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Bell,
  Plus,
  Trash2,
  Check,
  Clock,
  Calendar,
  AlertTriangle,
  Download,
  BellRing,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Reminder, DetectedDeadline } from "@/integrations/supabase/types";

interface ReminderManagerProps {
  documentId?: string;
  detectedDeadlines?: DetectedDeadline[];
  onReminderCreated?: () => void;
}

const ReminderManager = ({ documentId, detectedDeadlines, onReminderCreated }: ReminderManagerProps) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [type, setType] = useState<Reminder["type"]>("custom");
  const [priority, setPriority] = useState<Reminder["priority"]>("medium");
  const [recurring, setRecurring] = useState<Reminder["recurring"]>(null);

  useEffect(() => {
    fetchReminders();
    checkNotificationPermission();
  }, [documentId]);

  // Set up notification check interval
  useEffect(() => {
    const checkReminders = setInterval(() => {
      checkUpcomingReminders();
    }, 60000); // Check every minute

    return () => clearInterval(checkReminders);
  }, [reminders]);

  const checkNotificationPermission = () => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        toast({
          title: "Notifications Enabled",
          description: "You'll receive alerts for upcoming deadlines",
        });
      }
    }
  };

  const fetchReminders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("reminders")
        .select("*")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true });

      if (documentId) {
        query = query.eq("document_id", documentId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setReminders((data as Reminder[]) || []);
    } catch (error) {
      console.error("Error fetching reminders:", error);
    }
  };

  const checkUpcomingReminders = useCallback(() => {
    if (notificationPermission !== "granted") return;

    const now = new Date();
    reminders.forEach((reminder) => {
      if (reminder.status !== "pending" || reminder.notified) return;

      const reminderTime = reminder.reminder_date 
        ? new Date(reminder.reminder_date) 
        : new Date(reminder.due_date);

      // Notify if reminder time is within the past minute
      const timeDiff = now.getTime() - reminderTime.getTime();
      if (timeDiff >= 0 && timeDiff < 60000) {
        showNotification(reminder);
        markAsNotified(reminder.id);
      }
    });
  }, [reminders, notificationPermission]);

  const showNotification = (reminder: Reminder) => {
    if (notificationPermission !== "granted") return;

    const priorityEmoji = {
      high: "🔴",
      medium: "🟡",
      low: "🟢",
    };

    new Notification(`${priorityEmoji[reminder.priority]} ${reminder.title}`, {
      body: reminder.description || `Due: ${formatDate(reminder.due_date)}`,
      icon: "/favicon.ico",
      tag: reminder.id,
    });
  };

  const markAsNotified = async (reminderId: string) => {
    try {
      await supabase
        .from("reminders")
        .update({ notified: true })
        .eq("id", reminderId);
    } catch (error) {
      console.error("Error marking reminder as notified:", error);
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !dueDate) {
      toast({
        title: "Error",
        description: "Title and due date are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("reminders").insert({
        user_id: user.id,
        document_id: documentId || null,
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate,
        reminder_date: reminderDate || null,
        type,
        priority,
        status: "pending",
        notified: false,
        recurring,
      });

      if (error) throw error;

      toast({
        title: "Reminder Created",
        description: "You'll be notified before the deadline",
      });

      resetForm();
      setIsCreateOpen(false);
      fetchReminders();
      onReminderCreated?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create reminder";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleCreateFromDeadline = async (deadline: DetectedDeadline) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Calculate reminder date (1 day before for high priority, 3 days for medium, 7 for low)
      const daysBeforeMap = { high: 1, medium: 3, low: 7 };
      const dueDate = new Date(deadline.date);
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - daysBeforeMap[deadline.priority]);

      const { error } = await supabase.from("reminders").insert({
        user_id: user.id,
        document_id: documentId || null,
        title: deadline.description,
        description: deadline.amount ? `Amount: ${deadline.amount}` : null,
        due_date: deadline.date,
        reminder_date: reminderDate.toISOString().split("T")[0],
        type: deadline.type === "other" ? "custom" : deadline.type as Reminder["type"],
        priority: deadline.priority,
        status: "pending",
        notified: false,
        recurring: null,
      });

      if (error) throw error;

      toast({
        title: "Reminder Created",
        description: `Reminder set for ${deadline.description}`,
      });

      fetchReminders();
      onReminderCreated?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create reminder";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (reminderId: string, status: Reminder["status"]) => {
    try {
      const { error } = await supabase
        .from("reminders")
        .update({ status })
        .eq("id", reminderId);

      if (error) throw error;
      fetchReminders();
    } catch (error) {
      console.error("Error updating reminder:", error);
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    try {
      const { error } = await supabase.from("reminders").delete().eq("id", reminderId);
      if (error) throw error;
      
      toast({
        title: "Deleted",
        description: "Reminder has been removed",
      });
      fetchReminders();
    } catch (error) {
      console.error("Error deleting reminder:", error);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setReminderDate("");
    setType("custom");
    setPriority("medium");
    setRecurring(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const exportToCalendar = (reminder: Reminder) => {
    const startDate = new Date(reminder.due_date);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);

    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//DocSpeak Aid//Reminder//EN
BEGIN:VEVENT
UID:${reminder.id}@docspeak-aid
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${reminder.title}
DESCRIPTION:${reminder.description || ""}
PRIORITY:${reminder.priority === "high" ? 1 : reminder.priority === "medium" ? 5 : 9}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${reminder.title.replace(/[^a-z0-9]/gi, "_")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Exported",
      description: "Calendar event downloaded",
    });
  };

  const getPriorityColor = (priority: Reminder["priority"]) => {
    switch (priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusBadge = (status: Reminder["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Pending</Badge>;
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "dismissed":
        return <Badge variant="secondary">Dismissed</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: Reminder["type"]) => {
    switch (type) {
      case "payment": return "💰";
      case "renewal": return "🔄";
      case "deadline": return "⏰";
      case "appointment": return "📅";
      case "custom": return "📝";
      default: return "📌";
    }
  };

  const pendingReminders = reminders.filter(r => r.status === "pending" || r.status === "overdue");
  const completedReminders = reminders.filter(r => r.status === "completed" || r.status === "dismissed");

  return (
    <div className="space-y-4">
      {/* Header with notification toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          <h3 className="font-semibold">Reminders</h3>
          {pendingReminders.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {pendingReminders.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {notificationPermission !== "granted" && (
            <Button
              variant="outline"
              size="sm"
              onClick={requestNotificationPermission}
              className="gap-2"
            >
              <BellRing className="w-4 h-4" />
              Enable Notifications
            </Button>
          )}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Reminder
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Reminder</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateReminder} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Payment due, Renewal deadline..."
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description (optional)</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Additional details..."
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Due Date</label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Remind On</label>
                    <Input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <Select value={type} onValueChange={(v) => setType(v as Reminder["type"])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deadline">⏰ Deadline</SelectItem>
                        <SelectItem value="payment">💰 Payment</SelectItem>
                        <SelectItem value="renewal">🔄 Renewal</SelectItem>
                        <SelectItem value="appointment">📅 Appointment</SelectItem>
                        <SelectItem value="custom">📝 Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as Reminder["priority"])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">🔴 High</SelectItem>
                        <SelectItem value="medium">🟡 Medium</SelectItem>
                        <SelectItem value="low">🟢 Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Recurring</label>
                  <Select 
                    value={recurring || "none"} 
                    onValueChange={(v) => setRecurring(v === "none" ? null : v as Reminder["recurring"])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Not recurring" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not recurring</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Reminder</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Detected Deadlines from AI */}
      {detectedDeadlines && detectedDeadlines.length > 0 && (
        <Card className="p-4 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="font-medium text-sm">Detected Deadlines</span>
          </div>
          <div className="space-y-2">
            {detectedDeadlines.map((deadline, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${getPriorityColor(deadline.priority)}`} />
                  <div>
                    <p className="text-sm font-medium">{deadline.description}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(deadline.date)} • {deadline.type}
                      {deadline.amount && ` • ${deadline.amount}`}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCreateFromDeadline(deadline)}
                  className="gap-1"
                >
                  <Bell className="w-3 h-3" />
                  Set Reminder
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pending Reminders */}
      {pendingReminders.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-500">Upcoming</h4>
          {pendingReminders.map((reminder) => (
            <Card key={reminder.id} className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 mt-2 rounded-full ${getPriorityColor(reminder.priority)}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getTypeIcon(reminder.type)}</span>
                      <span className="font-medium">{reminder.title}</span>
                      {getStatusBadge(reminder.status)}
                    </div>
                    {reminder.description && (
                      <p className="text-sm text-gray-500 mt-1">{reminder.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due: {formatDate(reminder.due_date)}
                      </span>
                      {reminder.reminder_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Remind: {formatDate(reminder.reminder_date)}
                        </span>
                      )}
                      {reminder.recurring && (
                        <Badge variant="outline" className="text-xs">
                          🔄 {reminder.recurring}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleStatusChange(reminder.id, "completed")}
                    title="Mark as completed"
                  >
                    <Check className="w-4 h-4 text-green-500" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => exportToCalendar(reminder)}
                    title="Export to calendar"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleStatusChange(reminder.id, "dismissed")}
                    title="Dismiss"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteReminder(reminder.id)}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Completed/Dismissed */}
      {completedReminders.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-400">Completed</h4>
          {completedReminders.slice(0, 3).map((reminder) => (
            <Card key={reminder.id} className="p-3 opacity-60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getTypeIcon(reminder.type)}</span>
                  <div>
                    <span className="font-medium line-through">{reminder.title}</span>
                    <p className="text-xs text-gray-500">{formatDate(reminder.due_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(reminder.status)}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteReminder(reminder.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {reminders.length === 0 && !detectedDeadlines?.length && (
        <Card className="p-8 text-center">
          <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No reminders yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Create reminders to track important deadlines
          </p>
        </Card>
      )}
    </div>
  );
};

export default ReminderManager;
