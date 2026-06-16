import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, ExternalLink } from 'lucide-react';

interface AdminLayoutProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ title, description, actions, children }) => (
  <div className="min-h-screen bg-neutral-100 text-neutral-950">
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/admin/analytics" className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white">
            <BarChart3 className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold tracking-tight">Timelink Admin</span>
            <span className="block truncate text-xs font-medium text-neutral-500">운영 지표 콘솔</span>
          </span>
        </Link>
        <Link
          to="/"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
        >
          서비스로 이동
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </header>

    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950">{title}</h1>
          {description ? <p className="mt-1 text-sm leading-6 text-neutral-600">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </main>
  </div>
);

export default AdminLayout;
