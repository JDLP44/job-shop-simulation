import React from "react";
import { X, Play, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

interface IntroModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const IntroModal: React.FC<IntroModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900">Welcome to JobShop<span className="text-red-600">Sim</span></h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <section className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-blue-600" />
              The Challenge
            </h3>
            <p className="text-sm text-blue-800 leading-relaxed">
              You manage a 3-stage production line: <strong>Moulding</strong> → <strong>Inspection</strong> → <strong>Packaging</strong>.
              <br /><br />
              <strong>Crucial Detail:</strong> Products waiting for Inspection start to cool down and degrade. 
              Every minute a part waits in the queue before Inspection costs money ("Degradation Cost").
            </p>
          </section>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Play className="w-4 h-4 text-red-600" />
                How to Run
              </h4>
              <ul className="text-sm text-gray-600 space-y-2 list-disc pl-4">
                <li>Adjust the number of machines for each stage.</li>
                <li>Set the <strong>Arrival Mean</strong> (how often new orders come in).</li>
                <li>Click <strong>Run Simulation</strong> to simulate an 8-hour shift.</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-600" />
                Analysis Goals
              </h4>
              <ul className="text-sm text-gray-600 space-y-2 list-disc pl-4">
                <li>Minimize <strong>Degradation Costs</strong> by ensuring Inspection isn't a bottleneck.</li>
                <li>Keep <strong>Machine Utilization</strong> high without creating long queues.</li>
                <li>Use <strong>Sensitivity Analysis</strong> to find the perfect number of Inspection stations automatically.</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h4 className="font-semibold text-gray-900 mb-2">Pro Tips:</h4>
            <div className="text-sm text-gray-500 space-y-2">
              <p className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                Watch the "Wait Impact" KPI. If it's high, add more Inspection Stations.
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                If Packaging utilization is low (e.g., 20%), you might have too many packaging machines.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntroModal;