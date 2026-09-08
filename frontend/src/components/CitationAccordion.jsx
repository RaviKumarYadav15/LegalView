import React, { useState } from 'react';
import { Library, ChevronDown } from 'lucide-react';

export default function CitationAccordion({ sources }) {
  const [isOpen, setIsOpen] = useState(false);
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-8 border border-line rounded-xl overflow-hidden bg-canvas">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer w-full flex items-center justify-between p-3 bg-panel hover:bg-panel-hover transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-muted">
          <Library size={16} className="text-blue-400" />
          View {sources.length} Retrieved Citations
        </div>
        <ChevronDown 
          size={16} 
          className={`text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      {isOpen && (
        <div className="p-4 grid gap-3 border-t border-line bg-panel">
          {sources.map((src, idx) => (
            <div key={idx} className="bg-canvas border border-line rounded-xl p-4 overflow-hidden">
              <div className="flex flex-col md:flex-row md:justify-between items-start mb-3 gap-2">
                <span className="text-xs font-bold text-blue-400 shrink-0">Match: {(src.score * 100).toFixed(1)}%</span>
                <span className="text-xs font-medium text-muted bg-panel-hover px-2.5 py-1 rounded-md break-words whitespace-pre-wrap max-w-full">
                  {src.source} (Pg {src.page}) {src.legal_meta ? `— ${src.legal_meta}` : ""}
                </span>
              </div>
              <p className="text-sm text-muted leading-relaxed break-words whitespace-pre-wrap">{src.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
