import React, { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { aiApi } from '../../api/ai.api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import AiBadge from './AiBadge';

export default function AiSummaryCard({ kpis, className = '' }) {
  const [summaryBullets, setSummaryBullets] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSummarize() {
    try {
      setLoading(true);
      setError(null);
      const res = await aiApi.summary(kpis || {});
      setSummaryBullets(res.data.bullets);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate AI insights.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      className={`border-teal-100 bg-gradient-to-br from-teal-50/40 via-white to-indigo-50/30 ${className}`}
      headerClassName="px-5 py-3.5 border-b border-teal-100/60 flex items-center justify-between"
      title={
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-slate-800">Executive AI Summary</span>
        </div>
      }
      action={
        <div className="flex items-center gap-2">
          {summaryBullets && <AiBadge />}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSummarize}
            loading={loading}
            icon={RefreshCw}
          >
            {summaryBullets ? 'Re-generate' : 'Summarize KPIs'}
          </Button>
        </div>
      }
    >
      {!summaryBullets && !loading && !error && (
        <p className="text-xs text-slate-500 py-1">
          Click <strong>Summarize KPIs</strong> to synthesize workforce headcount, attendance velocity, and payroll indicators into 3–5 actionable insights.
        </p>
      )}

      {loading && (
        <div className="flex items-center gap-3 py-3 text-xs text-teal-700 animate-pulse">
          <Sparkles className="w-4 h-4 animate-spin text-teal-600" />
          <span>Analyzing company performance metrics against HR benchmarks...</span>
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-600 py-1 font-medium">{error}</p>
      )}

      {summaryBullets && !loading && (
        <ul className="space-y-2 py-1">
          {summaryBullets.map((bullet, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 flex-shrink-0"></span>
              <span dangerouslySetInnerHTML={{ __html: bullet.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
