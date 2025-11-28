import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const SHIFT_TYPE_LABELS: Record<string, string> = {
  off: "休み",
  morning: "モーニング (7:30-15:00)",
  early: "早番 (10:00-16:00)",
  late: "遅番 (17:00-23:00)",
  all: "ALL (7:30-23:00)",
};

function AutoCreateShiftButton({ periodId }: { periodId: number }) {
  const [isLoading, setIsLoading] = useState(false);
  const mutation = trpc.finalShift.autoCreate.useMutation();

  const handleAutoCreate = async () => {
    setIsLoading(true);
    try {
      await mutation.mutateAsync({ periodId });
      toast.success("シフトを自動作成しました");
      window.location.reload();
    } catch (error) {
      toast.error("シフト作成に失敗しました");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleAutoCreate} disabled={isLoading} variant="default">
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      シフトを自動作成
    </Button>
  );
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: period, isLoading: periodLoading } = trpc.shiftPeriod.getCurrent.useQuery();
  const { data: allRequests } = trpc.shiftRequest.getAllByPeriod.useQuery(
    { periodId: period?.id || 0 },
    { enabled: !!period?.id && user?.role === "admin" }
  );

  const generatePeriodMutation = trpc.shiftPeriod.ensureCurrentMonth.useMutation();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      navigate("/");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (period) {
      setCurrentPeriod(period);
    }
  }, [period]);

  const handleGeneratePeriod = async () => {
    setIsGenerating(true);
    try {
      await generatePeriodMutation.mutateAsync();
      toast.success("シフト期間を生成しました");
      window.location.reload();
    } catch (error) {
      toast.error("シフト期間の生成に失敗しました");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (authLoading || periodLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  if (!currentPeriod) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>管理者ダッシュボード</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">現在、シフト期間がありません。</p>
            <Button onClick={handleGeneratePeriod} disabled={isGenerating}>
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              今月のシフト期間を生成
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>シフト期間情報</CardTitle>
            <CardDescription>
              {new Date(currentPeriod.startDate).toLocaleDateString('ja-JP')} ～ {new Date(currentPeriod.endDate).toLocaleDateString('ja-JP')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">ステータス</p>
                <p className="text-lg font-semibold">{currentPeriod.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">提出期限</p>
                <p className="text-lg font-semibold">
                  {new Date(currentPeriod.submissionDeadline).toLocaleDateString('ja-JP')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>シフト希望一覧</CardTitle>
            <CardDescription>
              スタッフから提出されたシフト希望
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allRequests && allRequests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">スタッフID</th>
                      <th className="text-left py-2">希望日</th>
                      <th className="text-left py-2">希望内容</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRequests.map(req => (
                      <tr key={req.id} className="border-b hover:bg-gray-50">
                        <td className="py-2">{req.staffId}</td>
                        <td className="py-2">
                          {new Date(req.requestDate).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="py-2">
                          {SHIFT_TYPE_LABELS[req.requestType] || req.requestType}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600">シフト希望がまだ提出されていません。</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>シフト作成</CardTitle>
            <CardDescription>
              スタッフの希望をもとに自動でシフトを作成します
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AutoCreateShiftButton periodId={currentPeriod.id} />
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button onClick={() => navigate("/")} variant="outline">
            ホームに戻る
          </Button>
        </div>
      </div>
    </div>
  );
}
