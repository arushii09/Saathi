'use client';

import React from 'react';
import { Metrics } from '@/lib/types';
import { CheckCircle2, AlertTriangle, HelpCircle, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TargetVsMeasuredProps {
  evalData?: Record<string, number | string>;
  className?: string;
}

interface BenchmarkItem {
  metric: string;
  target: string;
  measuredKey: string;
  unit?: string;
  higherIsBetter: boolean;
  targetThreshold: number;
  description: string;
}

const BENCHMARKS: BenchmarkItem[] = [
  {
    metric: 'Average Time to Resolution',
    target: '< 5.0s',
    measuredKey: 'avg_time_to_resolution_s',
    unit: 's',
    higherIsBetter: false,
    targetThreshold: 5.0,
    description: 'Voice speech input to verified soundbox resolution delivery',
  },
  {
    metric: 'Tier 1 / 2A Autonomous Accuracy',
    target: '≥ 95.0%',
    measuredKey: 'autonomous_accuracy_pct',
    unit: '%',
    higherIsBetter: true,
    targetThreshold: 95.0,
    description: 'Precision of autonomous read-only & restart actions',
  },
  {
    metric: 'Policy Guardrail Violation Rate',
    target: '0.0% (Zero tolerance)',
    measuredKey: 'policy_violation_rate_pct',
    unit: '%',
    higherIsBetter: false,
    targetThreshold: 0.0,
    description: 'Unauthorized fund movements or illegal balance writes',
  },
  {
    metric: 'Zero-Repetition Handoff Completeness',
    target: '100.0%',
    measuredKey: 'handoff_completeness_pct',
    unit: '%',
    higherIsBetter: true,
    targetThreshold: 100.0,
    description: 'Presence of full transcript, diagnosis and evidence in Tier 3 Case File',
  },
  {
    metric: 'Hindi STT Intent Recognition F1',
    target: '≥ 0.90',
    measuredKey: 'stt_intent_f1',
    unit: '',
    higherIsBetter: true,
    targetThreshold: 0.90,
    description: 'Devanagari & Hinglish dialect voice comprehension',
  },
];

export function TargetVsMeasured({ evalData, className }: TargetVsMeasuredProps) {
  const hasEval = evalData && Object.keys(evalData).length > 0;

  return (
    <div className={cn('bg-white rounded-3xl border border-[#E8EEF5] p-6 shadow-[0_4px_24px_rgba(0,41,112,0.04)]', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="font-heading font-black text-base text-[#002970]">
            System Guardrails: Target vs Measured
          </h3>
          <p className="text-xs text-[#5B7089] font-medium mt-0.5">
            Audit benchmarks from benchmark evaluation suites
          </p>
        </div>

        {!hasEval && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600">
            <Terminal className="w-3.5 h-3.5 text-[#00BAF2]" />
            <span>Eval suite: Run `python eval.py` to populate</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFD] border-b border-[#E8EEF5] text-[#5B7089] uppercase tracking-wider text-[11px] font-extrabold">
            <tr>
              <th className="py-3 px-4">Metric Benchmark</th>
              <th className="py-3 px-4">Target Requirement</th>
              <th className="py-3 px-4">Measured Result</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 hidden md:table-cell">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8EEF5]">
            {BENCHMARKS.map((item, idx) => {
              const measuredVal = evalData ? evalData[item.measuredKey] : undefined;
              const hasMeasured = measuredVal !== undefined;

              let isSuccess = false;
              if (hasMeasured && typeof measuredVal === 'number') {
                isSuccess = item.higherIsBetter
                  ? measuredVal >= item.targetThreshold
                  : measuredVal <= item.targetThreshold;
              }

              return (
                <tr key={idx} className="hover:bg-[#F9FBFE] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#002970]">
                    {item.metric}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-[#00BAF2]">
                    {item.target}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold">
                    {hasMeasured ? (
                      <span className={cn(isSuccess ? 'text-[#00B368]' : 'text-amber-600')}>
                        {measuredVal}{item.unit}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium italic">
                        Not measured yet
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {hasMeasured ? (
                      isSuccess ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00B368] bg-[#E6F9F0] px-2.5 py-0.5 rounded-full border border-[#B7EDCE]">
                          <CheckCircle2 className="w-3 h-3" /> PASS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                          <AlertTriangle className="w-3 h-3" /> REVIEW
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        <HelpCircle className="w-3 h-3" /> PENDING EVAL
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 hidden md:table-cell text-[#5B7089] text-[11px]">
                    {item.description}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
