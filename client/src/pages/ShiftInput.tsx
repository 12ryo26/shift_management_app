import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ShiftInput() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [shiftRequests, setShiftRequests] = useState<Map<string, { type: string; startTime: string; endTime: string }>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: period, isLoading: periodLoading } = trpc.shiftPeriod.getCurrent.useQuery();
  const { data: existingRequests } = trpc.shiftRequest.getByPeriod.useQuery(
    { periodId: period?.id || 0 },
    { enabled: !!period?.id && !!user }
  );

  const submitMutation = trpc.shiftRequest.submit.useMutation();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (period) {
      setCurrentPeriod(period);
    }
  }, [period]);

  useEffect(() => {
    if (existingRequests) {
      const requestMap = new Map();
      existingRequests.forEach(req => {
        const dateStr = new Date(req.requestDate).toISOString().split('T')[0];
        requestMap.set(dateStr, {
          type: req.requestType,
          startTime: req.preferredStartTime || "",
          endTime: req.preferredEndTime || "",
        });
      });
      setShiftRequests(requestMap);
    }
  }, [existingRequests]);

  const handleShiftChange = (date: string, type: string) => {
    const newRequests = new Map(shiftRequests);
    if (newRequests.has(date)) {
      const existing = newRequests.get(date)!;
      if (existing.type === type) {
        newRequests.delete(date);
      } else {
        newRequests.set(date, { ...existing, type });
      }
    } else {
      newRequests.set(date, { type, startTime: "", endTime: "" });
    }
    setShiftRequests(newRequests);
  };

  const handleTimeChange = (date: string, field: "startTime" | "endTime", value: string) => {
    const newRequests = new Map(shiftRequests);
    const existing = newRequests.get(date) || { type: "flexible", startTime: "", endTime: "" };
    newRequests.set(date, { ...existing, [field]: value });
    setShiftRequests(newRequests);
  };

  const handleSubmit = async () => {
    if (!period) {
      toast.error("シフト期間が見つかりません");
      return;
    }

    setIsSubmitting(true);
    try {
      const requests = Array.from(shiftRequests.entries()).map(([dateStr, data]) => ({
        requestDate: new Date(dateStr),
        requestType: data.type as "work" | "off" | "flexible",
        preferredStartTime: data.startTime || undefined,
        preferredEndTime: data.endTime || undefined,
      }));

      await submitMutation.mutateAsync({
        periodId: period.id,
        requests,
      });

      toast.success("シフト希望を提出しました");
      navigate("/");
    } catch (error) {
      toast.error("シフト希望の提出に失敗しました");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || periodLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!currentPeriod) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>シフト入力</CardTitle>
          </CardHeader>
          <CardContent>
            <p>現在、シフト入力期間がありません。</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const startDate = new Date(currentPeriod.startDate);
  const endDate = new Date(currentPeriod.endDate);
  const dateRange = [];

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dateRange.push(new Date(d));
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>シフト希望入力</CardTitle>
          <CardDescription>
            {startDate.toLocaleDateString('ja-JP')} ～ {endDate.toLocaleDateString('ja-JP')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {dateRange.map(date => {
              const dateStr = date.toISOString().split('T')[0];
              const request = shiftRequests.get(dateStr);
              const dayName = date.toLocaleDateString('ja-JP', { weekday: 'short' });

              return (
                <div key={dateStr} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">
                      {date.toLocaleDateString('ja-JP')} ({dayName})
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`work-${dateStr}`}
                          checked={request?.type === "work"}
                          onCheckedChange={() => handleShiftChange(dateStr, "work")}
                        />
                        <Label htmlFor={`work-${dateStr}`} className="cursor-pointer">
                          出勤
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`off-${dateStr}`}
                          checked={request?.type === "off"}
                          onCheckedChange={() => handleShiftChange(dateStr, "off")}
                        />
                        <Label htmlFor={`off-${dateStr}`} className="cursor-pointer">
                          休み
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`flexible-${dateStr}`}
                          checked={request?.type === "flexible"}
                          onCheckedChange={() => handleShiftChange(dateStr, "flexible")}
                        />
                        <Label htmlFor={`flexible-${dateStr}`} className="cursor-pointer">
                          相談
                        </Label>
                      </div>
                    </div>

                    {request?.type === "work" && (
                      <div className="flex items-center space-x-4 ml-4">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`start-${dateStr}`}>開始時間</Label>
                          <Input
                            id={`start-${dateStr}`}
                            type="time"
                            value={request.startTime}
                            onChange={(e) => handleTimeChange(dateStr, "startTime", e.target.value)}
                            className="w-32"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`end-${dateStr}`}>終了時間</Label>
                          <Input
                            id={`end-${dateStr}`}
                            type="time"
                            value={request.endTime}
                            onChange={(e) => handleTimeChange(dateStr, "endTime", e.target.value)}
                            className="w-32"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-4 mt-8">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              提出
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
