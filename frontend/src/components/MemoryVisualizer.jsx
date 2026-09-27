import React from 'react';
import { Layers, Database, ArrowRight, CircleDot } from 'lucide-react';

export default function MemoryVisualizer({ frames = [], objects = [] }) {
  // If no structured frames provided, create a fallback frame from state
  const displayFrames = frames && frames.length > 0 ? frames : [
    {
      frame_name: 'Global frame',
      is_active: true,
      variables: [
        { name: 'program', value: 'active execution', target_object_id: '' }
      ]
    }
  ];

  return (
    <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 font-mono text-xs shadow-inner">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
        <div className="flex items-center gap-2 font-sans font-bold text-slate-800 text-xs uppercase tracking-wider">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>Call Stack Frames</span>
        </div>
        <div className="flex items-center gap-2 font-sans font-bold text-slate-800 text-xs uppercase tracking-wider">
          <Database className="w-4 h-4 text-amber-600" />
          <span>Heap Objects & References</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Left Column: Stack Call Frames */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-[11px] font-sans font-bold text-slate-500 uppercase">Frames</div>
          
          {displayFrames.map((frame, fIdx) => (
            <div 
              key={fIdx}
              className={`rounded-lg border transition-all ${
                frame.is_active 
                  ? 'bg-blue-50/70 border-blue-300 shadow-sm ring-1 ring-blue-200' 
                  : 'bg-white border-slate-200'
              }`}
            >
              {/* Frame Header */}
              <div className="px-3 py-1.5 border-b border-slate-200/80 bg-slate-100/60 flex items-center justify-between">
                <span className="font-bold text-slate-800">{frame.frame_name}</span>
                {frame.is_active && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-sans font-bold bg-blue-600 text-white uppercase">
                    active
                  </span>
                )}
              </div>

              {/* Variables Table */}
              <div className="p-2 space-y-1.5">
                {frame.variables && frame.variables.length > 0 ? (
                  frame.variables.map((v, vIdx) => (
                    <div key={vIdx} className="flex items-center justify-between bg-white px-2.5 py-1 rounded border border-slate-200 text-xs">
                      <span className="text-slate-700 font-semibold">{v.name}</span>
                      
                      <div className="flex items-center gap-1.5">
                        {v.target_object_id ? (
                          <span className="inline-flex items-center gap-1 text-blue-600 font-bold text-[11px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            <CircleDot className="w-3 h-3 text-blue-500" />
                            <span>{v.value || 'pointer'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                            {v.value}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic text-[11px] px-1 py-0.5">No local variables in frame</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pointer Direction Center Divider (Desktop) */}
        <div className="hidden lg:flex lg:col-span-1 justify-center items-center self-center text-slate-300">
          <ArrowRight className="w-5 h-5 text-slate-400" />
        </div>

        {/* Right Column: Heap Objects */}
        <div className="lg:col-span-6 space-y-3">
          <div className="text-[11px] font-sans font-bold text-slate-500 uppercase">Objects</div>

          {objects && objects.length > 0 ? (
            <div className="space-y-3">
              {objects.map((obj, oIdx) => (
                <div key={oIdx} className="bg-amber-50/40 border border-amber-200 rounded-lg p-2.5 shadow-sm">
                  {/* Object Header */}
                  <div className="flex items-center justify-between mb-1.5 text-[11px]">
                    <span className="font-sans font-bold text-amber-900 uppercase">
                      {obj.type_name || 'object'}
                    </span>
                    <span className="font-bold text-slate-800 bg-amber-100/80 px-2 py-0.5 rounded">
                      {obj.label || obj.object_id}
                    </span>
                  </div>

                  {/* Object Items / Elements Cells */}
                  {obj.elements && obj.elements.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {obj.elements.map((elem, eIdx) => (
                        <div key={eIdx} className="bg-yellow-100/90 border border-yellow-300 rounded px-2.5 py-1 text-xs text-yellow-950 font-bold shadow-xs">
                          {elem}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {obj.points_to && (
                    <div className="mt-2 text-[10px] text-blue-700 flex items-center gap-1 font-sans font-semibold">
                      <ArrowRight className="w-3 h-3" /> references node {obj.points_to}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-dashed border-slate-300 rounded-lg p-6 text-center text-slate-400 text-xs">
              Primitive types stored directly in stack frames. (Lists, Tuples, Dictionaries, and Functions will appear here as heap blocks).
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

