'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface JsonViewerProps {
  data: unknown;
  title?: string;
  defaultExpanded?: boolean;
  className?: string;
}

export function JsonViewer({
  data,
  title = 'Payload JSON',
  defaultExpanded = false,
  className,
}: JsonViewerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const formattedJson = JSON.stringify(data, null, 2);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(formattedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('rounded-btn border border-slate-200 overflow-hidden bg-slate-50 text-xs font-mono', className)}>
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-3 py-2 bg-slate-100/80 cursor-pointer hover:bg-slate-200/60 transition-colors select-none text-slate-700 font-semibold"
      >
        <div className="flex items-center gap-1.5">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          <span>{title}</span>
        </div>
        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-white text-slate-500 hover:text-slate-800 transition-colors"
          title="Copy JSON"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-online" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <pre className="p-3 text-[11px] leading-relaxed overflow-x-auto text-slate-800 bg-white">
          {formattedJson}
        </pre>
      )}
    </div>
  );
}
