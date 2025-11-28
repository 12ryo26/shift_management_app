import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const SHIFT_TYPES = {
  off: { label: "休み", color: "bg-gray-100" },
  morning: { label: "モーニング (7:30-15:00)", color: "bg-blue-100" },
  early: { label: "早番 (10:00-16:00)", color: "bg-green-100" },
  late: { label: "遅番 (17:00-23:00)", color: "bg-orange-100" },
  all: { label: "ALL (7:30-23:00)", color: "bg-purple-100" },
};

export default function ShiftInput() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [shiftRequests, setShiftRequests] = useState<Map<string, string>>(new Map());
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
        requestMap.set(dateStr, req.requestType);
      });
      setShiftRequests(requestMap);
    }
  }, [existingRequests]);

  const handleShiftChange = (date: string, type: string) => {
    const newRequests = new Map(shiftRequests);
    if (newRequests.get(date) === type) {
      newRequests.delete(date);
    } else {
      newRequests.set(date, type);
    }
    setShiftRequests(newRequests);
  };

  const handleSubmit = async () => {
    if (!period) {
      toast.error("シフト期間が見つかりません");
      return;
    }

    setIsSubmitting(true);
    try {
      const requests = Array.from(shiftRequests.entries()).map(([dateStr, type]) => ({
        requestDate: new Date(dateStr),
        requestType: type as "off" | "morning" | "early" | "late" | "all",
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
          <div className="space-y-4">
            {dateRange.map(date => {
              const dateStr = date.toISOString().split('T')[0];
              const selectedType = shiftRequests.get(dateStr);
              const dayName = date.toLocaleDateString('ja-JP', { weekday: 'short' });

              return (
                <div key={dateStr} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">
                      {date.toLocaleDateString('ja-JP')} ({dayName})
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {Object.entries(SHIFT_TYPES).map(([type, { label, color }]) => (
                      <button
                        key={type}
                        onClick={() => handleShiftChange(dateStr, type)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          selectedType === type
                            ? `border-blue-500 ${color}`
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="text-sm font-medium">{label}</div>
                      </button>
                    ))}
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
