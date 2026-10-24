import React from 'react';
import { Sparkles, ShieldCheck, Database, HelpCircle, Bot } from 'lucide-react';
import AiChatPanel from '../../components/ai/AiChatPanel';
import Card from '../../components/ui/Card';
import AiBadge from '../../components/ai/AiBadge';

export default function AiAssistant() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI Assistant Console</h2>
            <AiBadge />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time conversational agent backed by deterministic database tool-calling & role governance
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main AI Chat Interface */}
        <div className="lg:col-span-2 h-[650px]">
          <AiChatPanel />
        </div>

        {/* Side Guardrails & Policy Reference */}
        <div className="space-y-4">
          <Card
            title="System Guardrails"
            subtitle="Verified Hackathon Brief Architecture"
          >
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <Database className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800">Database as Source of Truth:</strong> The model never hallucinates numbers; it executes backend tools with the user's explicit role scope.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800">Strict Data Scoping:</strong> An employee asking about a colleague's salary will be politely refused.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800">Roman Urdu Understanding:</strong> Natural bilingual intent detection enables Urdu queries (e.g., <em>"aaj kon chutti pe hai?"</em>).
                </div>
              </div>
            </div>
          </Card>

          <Card
            title="Standard Corporate Policies"
            subtitle="Trained in AI system knowledgebase"
          >
            <div className="space-y-2 text-xs text-slate-600">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-800 block">Office Timing & Grace:</span>
                09:00 AM start, 15 min grace (late after 09:15). Work under 5 hours = half day.
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-800 block">Leave Entitlement:</span>
                Annual: 14 &bull; Sick: 8 &bull; Casual: 10 &bull; Unpaid: Unlimited. Weekends and holidays skipped.
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-800 block">Tax Brackets:</span>
                Progressive annual slabs: 0 to 600k (0%), 600k-1.2M (5%), 1.2M-2.4M (30k+15%), 2.4M-3.6M (210k+25%), 3.6M+ (510k+35%).
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
