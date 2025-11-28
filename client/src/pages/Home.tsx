import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, Calendar, ClipboardList, BarChart3 } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: currentPeriod } = trpc.shiftPeriod.getCurrent.useQuery();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-gray-900">
                飲食店シフト管理システム
              </h1>
              <p className="text-xl text-gray-600">
                スタッフのシフト希望を簡単に管理できるシステムです。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
              <Card>
                <CardHeader>
                  <Calendar className="w-8 h-8 text-blue-600 mb-2" />
                  <CardTitle>月2回のシフト</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    1-15日と16-月末の2回に分けてシフト希望を提出
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <ClipboardList className="w-8 h-8 text-green-600 mb-2" />
                  <CardTitle>簡単入力</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    日付ごとに出勤・休み・相談を選択するだけ
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <BarChart3 className="w-8 h-8 text-purple-600 mb-2" />
                  <CardTitle>自動作成</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    希望をもとに管理者が最適なシフトを自動作成
                  </p>
                </CardContent>
              </Card>
            </div>

            <div>
              <Button
                onClick={() => window.location.href = getLoginUrl()}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
              >
                ログインして始める
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">シフト管理</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">{user.name}</span>
            <Button
              onClick={() => logout()}
              variant="outline"
            >
              ログアウト
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Period Card */}
          <Card>
            <CardHeader>
              <CardTitle>現在のシフト期間</CardTitle>
              <CardDescription>
                {currentPeriod
                  ? `${new Date(currentPeriod.startDate).toLocaleDateString('ja-JP')} ～ ${new Date(currentPeriod.endDate).toLocaleDateString('ja-JP')}`
                  : "シフト期間がありません"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentPeriod ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">ステータス</p>
                    <p className="text-lg font-semibold">
                      {currentPeriod.status === "open" ? "受付中" : currentPeriod.status === "closed" ? "受付終了" : "確定"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">提出期限</p>
                    <p className="text-lg font-semibold">
                      {new Date(currentPeriod.submissionDeadline).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate("/shift-input")}
                    className="w-full"
                  >
                    シフト希望を入力
                  </Button>
                </div>
              ) : (
                <p className="text-gray-600">現在、シフト期間がありません。</p>
              )}
            </CardContent>
          </Card>

          {/* Admin Panel */}
          {user.role === "admin" && (
            <Card>
              <CardHeader>
                <CardTitle>管理者メニュー</CardTitle>
                <CardDescription>
                  シフト管理機能
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={() => navigate("/dashboard")}
                    className="w-full"
                    variant="outline"
                  >
                    ダッシュボード
                  </Button>
                  <Button
                    disabled
                    className="w-full"
                    variant="outline"
                  >
                    シフト作成（準備中）
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>使い方</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 list-decimal list-inside">
                <li className="text-gray-700">
                  <strong>シフト期間を確認</strong> - 現在のシフト対象期間を確認します
                </li>
                <li className="text-gray-700">
                  <strong>希望を入力</strong> - 「シフト希望を入力」ボタンから希望を登録します
                </li>
                <li className="text-gray-700">
                  <strong>提出期限までに提出</strong> - 提出期限までに希望を提出してください
                </li>
                <li className="text-gray-700">
                  <strong>最終シフトを確認</strong> - 管理者が作成したシフトを確認します
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
