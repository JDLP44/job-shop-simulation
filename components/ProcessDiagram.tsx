import React from "react";
import { ArrowRight, Box, CheckCircle, Truck, Layers } from "lucide-react";
import InfoTooltip from "./InfoTooltip";

interface ProcessDiagramProps {
  mouldingMachines: number;
  inspectionStations: number;
  packagingMachines: number;
}

const ProcessDiagram: React.FC<ProcessDiagramProps> = ({
  mouldingMachines,
  inspectionStations,
  packagingMachines,
}) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 overflow-x-auto">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Layers className="h-5 w-5 text-red-500"/> 
        Production Line Configuration
        <InfoTooltip text="Visual representation of the shop floor. Orders flow Left to Right. Wait time accumulates between stages." />
      </h3>
      
      <div className="flex items-center justify-between min-w-[800px] gap-4">
        {/* Input */}
        <div className="flex flex-col items-center">
            <div className="w-24 h-12 bg-red-100 border-2 border-red-200 rounded-l-3xl flex items-center justify-center relative">
                <span className="text-xs font-bold text-red-800 uppercase">Order</span>
            </div>
        </div>

        <ArrowRight className="text-gray-300 w-8 h-8 flex-shrink-0" />

        {/* Moulding */}
        <div className="flex-1 border-2 border-dashed border-red-200 rounded-xl p-4 bg-red-50/30">
            <div className="text-xs font-bold text-red-800 uppercase mb-2 text-center tracking-wider">Moulding</div>
            <div className="flex flex-wrap justify-center gap-2">
                {Array.from({ length: mouldingMachines }).map((_, i) => (
                    <div key={i} className="w-8 h-8 bg-red-600 rounded shadow-sm flex items-center justify-center text-white text-xs font-mono" title="Moulding Machine">
                        M{i+1}
                    </div>
                ))}
            </div>
        </div>

        {/* Arrow with Wait Time Label */}
        <div className="flex flex-col items-center flex-shrink-0 w-24">
            <ArrowRight className="text-gray-400 w-8 h-8" />
            <div className="mt-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">Wait Time</div>
            <div className="text-[10px] text-gray-400 text-center leading-tight mt-1">(Degradation Risk)</div>
        </div>

        {/* Inspection */}
        <div className="flex-1 border-2 border-dashed border-red-200 rounded-xl p-4 bg-red-50/30">
            <div className="text-xs font-bold text-red-800 uppercase mb-2 text-center tracking-wider">Inspection</div>
             <div className="flex flex-wrap justify-center gap-2">
                {Array.from({ length: inspectionStations }).map((_, i) => (
                    <div key={i} className="w-8 h-8 bg-red-500 rounded-full shadow-sm flex items-center justify-center text-white text-xs font-mono" title="Inspection Station">
                        I{i+1}
                    </div>
                ))}
            </div>
        </div>

        <ArrowRight className="text-gray-300 w-8 h-8 flex-shrink-0" />

        {/* Packaging */}
        <div className="flex-1 border-2 border-dashed border-red-200 rounded-xl p-4 bg-red-50/30">
            <div className="text-xs font-bold text-red-800 uppercase mb-2 text-center tracking-wider">Packaging</div>
             <div className="flex flex-wrap justify-center gap-2">
                {Array.from({ length: packagingMachines }).map((_, i) => (
                    <div key={i} className="w-8 h-8 bg-red-600 rounded shadow-sm flex items-center justify-center text-white text-xs font-mono" title="Packaging Machine">
                        P{i+1}
                    </div>
                ))}
            </div>
        </div>

        <ArrowRight className="text-gray-300 w-8 h-8 flex-shrink-0" />

        {/* Shipping */}
        <div className="flex flex-col items-center">
            <div className="w-24 h-12 bg-gray-100 border-2 border-gray-200 rounded-r-3xl flex items-center justify-center">
                <span className="text-xs font-bold text-gray-600 uppercase flex items-center gap-1">
                    Shipping <Truck className="w-3 h-3"/>
                </span>
            </div>
        </div>
      </div>

      <div className="mt-4 flex gap-6 text-xs text-gray-500 justify-center">
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded"></div> Machine Park
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div> Work Station
         </div>
      </div>
    </div>
  );
};

export default ProcessDiagram;