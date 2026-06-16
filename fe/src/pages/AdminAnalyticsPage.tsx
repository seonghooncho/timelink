import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BarChart3, Gauge, RefreshCw, Users } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminAnalyticsApi } from '@/services/api';

const todayKey = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
};

const numberFormatter = new Intl.NumberFormat('ko-KR');

const AdminAnalyticsPage = () => {
  const [date, setDate] = useState(todayKey);
  const summaryQuery = useQuery({
    queryKey: ['admin', 'analytics', date],
    queryFn: () => adminAnalyticsApi.getSummary(date),
  });

  const summary = summaryQuery.data;
  const cards = useMemo(() => [
    { label: '총 회원', value: summary?.totalUsers ?? 0 },
    { label: '오늘 가입', value: summary?.todaySignups ?? 0 },
    { label: '오늘 활성', value: summary?.todayActiveUsers ?? 0 },
    { label: '7일 활성', value: summary?.activeUsers7d ?? 0 },
    { label: '30일 활성', value: summary?.activeUsers30d ?? 0 },
    { label: '오늘 링크 생성', value: summary?.todayLinksCreated ?? 0 },
    { label: '오늘 링크 열림', value: summary?.todayLinksOpened ?? 0 },
    { label: '평균 활동', value: formatDuration(summary?.averageActivitySeconds ?? 0), text: true },
  ], [summary]);
  const apiPerformance = summary?.apiPerformance ?? [];
  const maxP95 = Math.max(1, ...apiPerformance.map((item) => item.p95Ms));

  return (
    <AdminLayout
      title="Product Analytics"
      description="GA와 분리된 제품 사용 지표입니다. 개인정보와 원문 URL은 저장하지 않습니다."
      actions={(
        <button
          type="button"
          onClick={() => void summaryQuery.refetch()}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
          aria-label="지표 새로고침"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${summaryQuery.isFetching ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      )}
    >
        <section>
          <label className="text-xs font-bold text-neutral-500" htmlFor="analytics-date">기준일</label>
          <input
            id="analytics-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-2 h-10 w-full max-w-xs rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-950"
          />
        </section>

        {summaryQuery.isError ? (
          <section className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-red-700">
              <AlertTriangle className="h-4 w-4" />
              지표를 불러오지 못했습니다
            </div>
            <p className="mt-2 text-xs leading-5 text-red-700/80">
              관리자 권한 또는 네트워크 상태를 확인해주세요.
            </p>
          </section>
        ) : null}

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold text-neutral-500">{card.label}</p>
              <p className="mt-2 text-2xl font-bold text-neutral-950">
                {card.text ? card.value : numberFormatter.format(Number(card.value))}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-neutral-950">느린 API</h2>
            </div>
            <span className="text-xs font-semibold text-neutral-500">p95 기준</span>
          </div>
          <div className="space-y-2">
            {apiPerformance.length > 0 ? apiPerformance.map((item) => {
              const errorCount = (item.clientErrorCount ?? 0) + (item.serverErrorCount ?? 0);
              return (
                <div key={`${item.method}:${item.route}`} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 rounded-md bg-neutral-100 px-2 py-1 text-[10px] font-black text-neutral-700">
                          {item.method}
                        </span>
                        <p className="min-w-0 truncate text-sm font-bold text-neutral-950" title={item.route}>
                          {item.route}
                        </p>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className={`h-full rounded-full ${latencyBarClass(item.p95Ms)}`}
                          style={{ width: `${Math.max(6, Math.min(100, (item.p95Ms / maxP95) * 100))}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-right md:w-[360px]">
                      <MetricCell label="p95" value={formatMs(item.p95Ms)} strong tone={latencyTextClass(item.p95Ms)} />
                      <MetricCell label="p50" value={formatMs(item.p50Ms)} />
                      <MetricCell label="평균" value={formatMs(item.averageMs)} />
                      <MetricCell label="호출" value={numberFormatter.format(item.count)} />
                    </div>
                  </div>
                  {errorCount > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                      {item.clientErrorCount > 0 ? (
                        <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">
                          4xx {numberFormatter.format(item.clientErrorCount)}
                        </span>
                      ) : null}
                      {item.serverErrorCount > 0 ? (
                        <span className="rounded-md bg-red-50 px-2 py-1 text-red-700">
                          5xx {numberFormatter.format(item.serverErrorCount)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            }) : (
              <EmptyMetric label="아직 API 성능 지표가 없습니다" />
            )}
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-neutral-950">기능별 사용량 TOP 5</h2>
          </div>
          <div className="space-y-2">
            {(summary?.topFeatures ?? []).length > 0 ? summary?.topFeatures.map((item) => (
              <div key={item.feature} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
                <span className="text-sm font-semibold text-neutral-950">{item.feature}</span>
                <span className="text-sm font-bold text-emerald-700">{numberFormatter.format(item.count)}</span>
              </div>
            )) : (
              <EmptyMetric label="아직 기능 사용량이 없습니다" />
            )}
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-neutral-950">최근 에러 이벤트</h2>
          </div>
          <div className="space-y-2">
            {(summary?.recentErrors ?? []).length > 0 ? summary?.recentErrors.map((error) => (
              <div key={error.eventId} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-bold text-neutral-950">{error.errorCode || 'unknown_error'}</p>
                  <span className="shrink-0 rounded-md bg-neutral-100 px-2 py-1 text-[10px] font-bold text-neutral-500">
                    {error.severity || 'error'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-500">{formatTimestamp(error.timestamp)}</p>
                <p className="mt-2 truncate text-xs text-neutral-500">
                  {[error.feature, error.route].filter(Boolean).join(' · ') || 'context 없음'}
                </p>
              </div>
            )) : (
              <EmptyMetric label="최근 에러 이벤트가 없습니다" />
            )}
          </div>
        </section>
    </AdminLayout>
  );
};

const EmptyMetric = ({ label }: { label: string }) => (
  <div className="rounded-lg border border-dashed border-neutral-300 bg-white/70 px-4 py-6 text-center text-sm text-neutral-500">
    {label}
  </div>
);

const MetricCell = ({
  label,
  value,
  strong = false,
  tone = 'text-neutral-950',
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: string;
}) => (
  <div>
    <p className="text-[10px] font-bold text-neutral-400">{label}</p>
    <p className={`mt-1 text-sm ${strong ? 'font-black' : 'font-bold'} ${tone}`}>{value}</p>
  </div>
);

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0초';
  const rounded = Math.round(seconds);
  if (rounded < 60) return `${rounded}초`;
  return `${Math.floor(rounded / 60)}분 ${rounded % 60}초`;
}

function formatMs(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return '0ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(ms >= 10_000 ? 0 : 1)}s`;
}

function latencyBarClass(ms: number) {
  if (ms >= 3000) return 'bg-red-500';
  if (ms >= 1500) return 'bg-amber-500';
  return 'bg-emerald-600';
}

function latencyTextClass(ms: number) {
  if (ms >= 3000) return 'text-red-700';
  if (ms >= 1500) return 'text-amber-700';
  return 'text-emerald-700';
}

function formatTimestamp(timestamp?: string) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(date);
}

export default AdminAnalyticsPage;
