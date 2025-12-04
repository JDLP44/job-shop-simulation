import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell
} from "recharts";
import { SimulationStats, SensitivityPoint, ScenarioResult } from "../types";
import { AlertCircle, Clock, DollarSign, CheckCircle, Activity, TrendingUp, Layers, Lightbulb, Star, History, Bolt } from "lucide-react";
import InfoTooltip from "./InfoTooltip";

interface DashboardProps {
  stats: SimulationStats | null;
  sensitivityData: SensitivityPoint[];
  loading: boolean;
  history: ScenarioResult[];
  replications: number;
  aiFeedback: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, sensitivityData, loading, history, replications, aiFeedback }) => {
  if (loading) {
     return (
        <div className="flex items-center justify-center h-96 bg-white rounded-xl border border-gray-200">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              <p className="text-gray-500 font-medium">Running {replications > 1 ? `${replications} replications...` : 'simulation...'}</p>
            </div>
        </div>
     );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-white rounded-xl border border-gray-200 text-gray-400">
        <Clock className="w-12 h-12 mb-4 text-gray-300" />
        <p>Configure parameters and run the simulation to view results.</p>
      </div>
    );
  }

  // --- Logic for AI Analyst ---
  const getRecommendations = () => {
    const recs = [];
    if (stats.machineUtilization.inspection > 0.9) {
        recs.push({ text: "Inspection is a severe bottleneck (>90% util). Add stations to reduce degradation costs.", type: 'critical' });
    } else if (stats.machineUtilization.packaging > 0.95) {
        recs.push({ text: "Packaging is maxed out (>95%). This limits total throughput. Add a packaging machine.", type: 'warning' });
    }
    
    if (stats.waitStats.inspection.p90 > 15) {
         recs.push({ text: `Tail Risk: 10% of parts wait >${stats.waitStats.inspection.p90.toFixed(1)} min. This drives up average costs significantly.`, type: 'warning' });
    }

    if (stats.machineUtilization.packaging < 0.3 && stats.machineUtilization.moulding < 0.3) {
        recs.push({ text: "System has excess capacity. Consider reducing machine counts to save capital.", type: 'info' });
    }

    if (recs.length === 0) recs.push({ text: "System appears balanced. Check sensitivity analysis for fine-tuning.", type: 'success' });
    return recs;
  };

  const recommendations = getRecommendations();

  // --- Histograms ---
  const createHistogram = (data: number[]) => {
    if (!data || data.length === 0) return [];
    const max = Math.ceil(Math.max(...data, 1)); 
    const min = 0;
    const binCount = 15;
    const binWidth = (max - min) / binCount;
    
    const bins = Array.from({ length: binCount }, (_, i) => ({
        range: `${(min + i * binWidth).toFixed(1)} - ${(min + (i + 1) * binWidth).toFixed(1)}`,
        min: min + i * binWidth,
        count: 0
    }));

    data.forEach(v => {
        const binIndex = Math.min(Math.floor((v - min) / binWidth), binCount - 1);
        if (binIndex >= 0) bins[binIndex].count++;
    });
    return bins;
  };

  const mouldingData = createHistogram(stats.waitTimes.moulding);
  const inspectionData = createHistogram(stats.waitTimes.inspection);
  const packagingData = createHistogram(stats.waitTimes.packaging);

  // Utilization Data
  const utilizationData = [
    { name: 'Moulding', value: (stats.machineUtilization.moulding * 100).toFixed(1), color: '#ef4444' },
    { name: 'Inspection', value: (stats.machineUtilization.inspection * 100).toFixed(1), color: '#f97316' },
    { name: 'Packaging', value: (stats.machineUtilization.packaging * 100).toFixed(1), color: '#eab308' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Live AI Feedback Banner */}
      {aiFeedback && (
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl shadow-lg p-3 text-white flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="bg-white/20 p-1.5 rounded-lg flex-shrink-0">
                  <Bolt className="w-5 h-5 text-white" />
              </div>
              <div className="flex-grow font-medium text-sm md:text-base tracking-wide">
                  {aiFeedback}
              </div>
          </div>
      )}

      {/* Top Grid: KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Lead Time */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
                 <div>
                    <p className="text-sm font-medium text-gray-500">Avg Lead Time</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-gray-900">{stats.avgLeadTime.toFixed(1)}</p>
                        <span className="text-sm text-gray-500">min</span>
                    </div>
                 </div>
                 <div className="p-2 bg-purple-50 rounded-lg"><Clock className="w-5 h-5 text-purple-600" /></div>
            </div>
            {replications > 1 && (
                <div className="text-[10px] text-gray-400 bg-gray-50 rounded px-2 py-1 self-start">
                    95% CI: [{stats.leadTimeCI.lower.toFixed(1)}, {stats.leadTimeCI.upper.toFixed(1)}]
                </div>
            )}
        </div>

        {/* Card 2: Cost per Part */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
             <div className="flex justify-between items-start mb-2">
                 <div>
                    <p className="text-sm font-medium text-gray-500">Cost / Part</p>
                    <div className="flex items-baseline gap-2">
                        <p className={`text-2xl font-bold ${stats.avgDegradationCostPerPart > 5 ? 'text-red-600' : 'text-gray-900'}`}>
                            ${stats.avgDegradationCostPerPart.toFixed(2)}
                        </p>
                    </div>
                 </div>
                 <div className="p-2 bg-red-50 rounded-lg"><DollarSign className="w-5 h-5 text-red-600" /></div>
            </div>
             {replications > 1 && (
                <div className="text-[10px] text-gray-400 bg-gray-50 rounded px-2 py-1 self-start">
                    95% CI: [${stats.costCI.lower.toFixed(2)}, ${stats.costCI.upper.toFixed(2)}]
                </div>
            )}
        </div>

        {/* Card 3: Throughput */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
             <div className="flex justify-between items-start mb-2">
                 <div>
                    <p className="text-sm font-medium text-gray-500">Throughput</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-gray-900">{stats.throughput.toFixed(1)}</p>
                        <span className="text-sm text-gray-500">jobs/hr</span>
                    </div>
                 </div>
                 <div className="p-2 bg-green-50 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
            </div>
             <p className="text-xs text-gray-500 mt-1">Avg WIP: {stats.avgWip.toFixed(1)} units</p>
        </div>

        {/* Card 4: Service Level */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
             <div className="flex justify-between items-start mb-2">
                 <div>
                    <p className="text-sm font-medium text-gray-500">Service Level</p>
                    <div className="flex items-baseline gap-2">
                        <p className={`text-2xl font-bold ${stats.serviceLevel > 0.9 ? 'text-green-600' : 'text-yellow-600'}`}>
                            {(stats.serviceLevel * 100).toFixed(1)}%
                        </p>
                    </div>
                 </div>
                 <div className="p-2 bg-blue-50 rounded-lg"><Activity className="w-5 h-5 text-blue-600" /></div>
            </div>
             <p className="text-xs text-gray-500 mt-1">% Insp. wait {'<'} 5 min</p>
        </div>
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Histograms - Spanning 2 columns */}
         <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                        <span>Inspection Wait Time</span>
                        <InfoTooltip text="Critical distribution. Long tail = High risk." />
                    </h4>
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={inspectionData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="min" tickFormatter={(v) => Math.round(v).toString()} fontSize={10} />
                                <YAxis fontSize={10} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} name="Frequency" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-gray-100 text-xs">
                         <span className="text-gray-500">Avg: <span className="font-semibold text-gray-900">{stats.waitStats.inspection.avg.toFixed(1)}m</span></span>
                         <span className="text-gray-500">90th%: <span className="font-semibold text-gray-900">{stats.waitStats.inspection.p90.toFixed(1)}m</span></span>
                         <span className="text-gray-500">Max: <span className="font-semibold text-gray-900">{stats.waitStats.inspection.max.toFixed(1)}m</span></span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                        <span>Packaging Wait Time</span>
                    </h4>
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={packagingData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="min" tickFormatter={(v) => Math.round(v).toString()} fontSize={10} />
                                <YAxis fontSize={10} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="count" fill="#eab308" radius={[4, 4, 0, 0]} name="Frequency" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-gray-100 text-xs">
                         <span className="text-gray-500">Avg: <span className="font-semibold text-gray-900">{stats.waitStats.packaging.avg.toFixed(1)}m</span></span>
                         <span className="text-gray-500">90th%: <span className="font-semibold text-gray-900">{stats.waitStats.packaging.p90.toFixed(1)}m</span></span>
                         <span className="text-gray-500">Max: <span className="font-semibold text-gray-900">{stats.waitStats.packaging.max.toFixed(1)}m</span></span>
                    </div>
                </div>
            </div>
            
            {/* Utilization Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                 <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
                     <Activity className="w-4 h-4 text-gray-500" /> Machine Utilization
                 </h3>
                 <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={utilizationData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} />
                            <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                            <Tooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: any) => [`${value}%`, 'Utilization']}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                {utilizationData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                 </div>
            </div>
         </div>

         {/* Sidebar Column */}
         <div className="space-y-6">
            {/* AI Recommendation */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
                <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-indigo-600" />
                    AI Analyst Recommendation
                </h3>
                <ul className="space-y-3">
                    {recommendations.map((rec, idx) => (
                        <li key={idx} className="flex gap-2 text-xs leading-relaxed">
                            <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                rec.type === 'critical' ? 'bg-red-500' : 
                                rec.type === 'warning' ? 'bg-orange-400' : 
                                rec.type === 'success' ? 'bg-green-500' : 'bg-blue-400'
                            }`} />
                            <span className="text-indigo-800">{rec.text}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Sensitivity Mini Chart */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-900">Sensitivity</h3>
                    <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded">Cost vs Count</span>
                </div>
                 <div className="h-40">
                    {sensitivityData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sensitivityData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="xValue" type="number" domain={['auto', 'auto']} fontSize={10} tickCount={5} />
                                <YAxis fontSize={10} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Line type="monotone" dataKey="cost" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs">
                             <TrendingUp className="w-8 h-8 mb-2 opacity-20" />
                             Click "Analyze Sensitivity"
                        </div>
                    )}
                 </div>
            </div>

            {/* Scenario History Mini Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <History className="w-4 h-4 text-gray-500" /> History
                    </h3>
                </div>
                <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-3 py-2">Cfg (M-I-P)</th>
                                <th className="px-3 py-2">Cost/Pt</th>
                                <th className="px-3 py-2 text-right">Job/Hr</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {history.slice().reverse().map((run) => (
                                <tr key={run.id} className={`hover:bg-gray-50 transition-colors ${run.id === history[history.length-1].id ? 'bg-blue-50/50' : ''}`}>
                                    <td className="px-3 py-2 font-mono text-gray-600">
                                        {run.config.mouldingMachines}-{run.config.inspectionStations}-{run.config.packagingMachines}
                                    </td>
                                    <td className="px-3 py-2 font-medium">
                                        <div className="flex items-center gap-1">
                                            ${run.stats.avgDegradationCostPerPart.toFixed(2)}
                                            {run.isBest && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-600">{run.stats.throughput.toFixed(0)}</td>
                                </tr>
                            ))}
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-3 py-4 text-center text-gray-400 italic">No runs yet</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;