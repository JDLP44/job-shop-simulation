import React, { useState, useCallback, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";
import Layout from "./components/Layout";
import ProcessDiagram from "./components/ProcessDiagram";
import Dashboard from "./components/Dashboard";
import IntroModal from "./components/IntroModal";
import InfoTooltip from "./components/InfoTooltip";
import { SimulationEngine } from "./services/simulationEngine";
import { SimulationConfig, SimulationStats, SensitivityPoint, ScenarioResult } from "./types";
import { Play, TrendingUp, Settings2 } from "lucide-react";

const App: React.FC = () => {
  // Default Configuration
  const [config, setConfig] = useState<SimulationConfig>({
    duration: 480, // 8 hour shift
    mouldingMachines: 2,
    inspectionStations: 2,
    packagingMachines: 1,
    arrivalIntervalMean: 5,
    degradationCostPerMinute: 2.5,
    degradationThreshold: 0, // Minutes free before cost
    replications: 1,
    seed: 42,
  });

  const [stats, setStats] = useState<SimulationStats | null>(null);
  const [history, setHistory] = useState<ScenarioResult[]>([]);
  const [sensitivityData, setSensitivityData] = useState<SensitivityPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  
  // AI Feedback State
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const prevConfigRef = useRef<SimulationConfig>(config);
  const prevStatsRef = useRef<SimulationStats | null>(null);
  const isFirstRun = useRef(true);

  // Initial Run
  useEffect(() => {
    if (isFirstRun.current) {
        const engine = new SimulationEngine(config);
        const results = engine.run();
        setStats(results);
        prevStatsRef.current = results;
        isFirstRun.current = false;
    }
  }, []);

  // Fast AI Feedback Loop
  useEffect(() => {
    const timer = setTimeout(async () => {
        // Don't run if config hasn't effectively changed key params for the AI
        if (JSON.stringify(config) === JSON.stringify(prevConfigRef.current)) return;

        // Run a "Fast" simulation (1 replication) for the AI to analyze
        // We use a different seed or same seed? Same seed ensures delta is due to config, not randomness.
        const fastConfig = { ...config, replications: 1 };
        const engine = new SimulationEngine(fastConfig);
        const newStats = engine.run();

        const prevStats = prevStatsRef.current;

        if (prevStats) {
            // Identify what changed
            const changes = [];
            if (config.mouldingMachines !== prevConfigRef.current.mouldingMachines) changes.push(`Moulding: ${prevConfigRef.current.mouldingMachines}->${config.mouldingMachines}`);
            if (config.inspectionStations !== prevConfigRef.current.inspectionStations) changes.push(`Inspection: ${prevConfigRef.current.inspectionStations}->${config.inspectionStations}`);
            if (config.packagingMachines !== prevConfigRef.current.packagingMachines) changes.push(`Packaging: ${prevConfigRef.current.packagingMachines}->${config.packagingMachines}`);
            if (config.arrivalIntervalMean !== prevConfigRef.current.arrivalIntervalMean) changes.push(`Arrival: ${prevConfigRef.current.arrivalIntervalMean}->${config.arrivalIntervalMean}`);

            if (changes.length > 0) {
                 try {
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const prompt = `
                      Context: Job Shop Simulation (Moulding->Inspection->Packaging).
                      User Change: ${changes.join(', ')}.
                      
                      Impact:
                      - Cost/Part: $${prevStats.avgDegradationCostPerPart.toFixed(2)} -> $${newStats.avgDegradationCostPerPart.toFixed(2)}
                      - Throughput: ${prevStats.throughput.toFixed(0)} -> ${newStats.throughput.toFixed(0)} jobs/hr
                      - Inspection Util: ${(prevStats.machineUtilization.inspection * 100).toFixed(0)}% -> ${(newStats.machineUtilization.inspection * 100).toFixed(0)}%
                      - Packaging Util: ${(prevStats.machineUtilization.packaging * 100).toFixed(0)}% -> ${(newStats.machineUtilization.packaging * 100).toFixed(0)}%
                      
                      Task: Provide an INSTANT, VERY SHORT (<20 words) feedback to the user about this change. 
                      Focus on whether it was a good idea (bottleneck relieved? cost saved?) or bad (wasteful? new bottleneck?).
                      Be direct.
                    `;

                    const result = await ai.models.generateContent({
                      model: 'gemini-2.5-flash-lite',
                      contents: prompt,
                    });
                    
                    setAiFeedback(result.text);
                 } catch (e) {
                     console.error("AI Feedback failed", e);
                 }
            }
        }

        // Update Refs
        prevConfigRef.current = config;
        prevStatsRef.current = newStats;
        
        // Auto-update main stats if user wants live feedback feel, 
        // but let's keep it separate if we want to preserve "Run" button for high-rep runs.
        // For better UX, let's update the main stats too if replications is low (<5)
        if (config.replications < 5) {
            setStats(newStats);
        }

    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [config]);

  const runSimulation = useCallback(() => {
    setLoading(true);
    // Use setTimeout to allow UI to update before heavy calculation
    setTimeout(() => {
      const engine = new SimulationEngine(config);
      const results = engine.run();
      
      setStats(results);
      prevStatsRef.current = results; // Sync ref

      // Add to History
      setHistory(prev => {
        const newEntry: ScenarioResult = {
            id: Date.now(),
            timestamp: new Date(),
            config: { ...config },
            stats: results
        };
        // Mark best
        const all = [...prev, newEntry];
        const minCost = Math.min(...all.map(h => h.stats.avgDegradationCostPerPart));
        return all.map(h => ({ ...h, isBest: h.stats.avgDegradationCostPerPart === minCost }));
      });

      setLoading(false);
    }, 100);
  }, [config]);

  const runSensitivityAnalysis = useCallback((variable: 'moulding' | 'inspection' | 'packaging') => {
    setLoading(true);
    setSensitivityData([]);
    
    setTimeout(() => {
      const points: SensitivityPoint[] = [];
      // Range: 1 to 10 machines
      // Temporarily set replications to 3 for sensitivity speed if user has set high reps
      const sensitivityConfig = { ...config, replications: Math.min(config.replications, 5) };

      for (let i = 1; i <= 10; i++) {
        const testConfig = { ...sensitivityConfig };
        
        if (variable === 'moulding') testConfig.mouldingMachines = i;
        if (variable === 'inspection') testConfig.inspectionStations = i;
        if (variable === 'packaging') testConfig.packagingMachines = i;

        const engine = new SimulationEngine(testConfig);
        const res = engine.run();
        
        points.push({
            label: `${i}`,
            xValue: i,
            cost: res.avgDegradationCostPerPart,
            avgWait: res.waitStats[variable].avg,
            variable: variable
        });
      }
      
      setSensitivityData(points);
      
      // Also update the main stats to the current config run just so the dashboard isn't empty
      const currentRunEngine = new SimulationEngine(config);
      const currentResults = currentRunEngine.run();
      setStats(currentResults);
      prevStatsRef.current = currentResults;
      
      setLoading(false);
    }, 100);
  }, [config]);

  const handleInputChange = (field: keyof SimulationConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Layout onHelpClick={() => setShowIntro(true)}>
      <IntroModal isOpen={showIntro} onClose={() => setShowIntro(false)} />
      
      {/* Control Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-gray-100 pb-4 gap-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-red-600" />
                Lab Configuration
                <InfoTooltip text="Set up your production line parameters here. Use 'Replications' to improve statistical confidence." />
            </h2>
            <div className="flex flex-wrap gap-2">
                 <button 
                    onClick={() => runSensitivityAnalysis('inspection')}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    disabled={loading}
                 >
                    <TrendingUp className="w-4 h-4" />
                    Analyze Sensitivity
                 </button>
                 <button 
                    onClick={runSimulation}
                    className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm font-medium"
                    disabled={loading}
                 >
                    {loading ? "Running..." : <><Play className="w-4 h-4" /> Run Simulation</>}
                 </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6">
            {/* Input Group */}
            <div className="space-y-2 lg:col-span-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center justify-between">
                    <span>Moulding Machines</span>
                    <span className="font-bold text-red-600">{config.mouldingMachines}</span>
                </label>
                <input 
                    type="range" min="1" max="10" 
                    value={config.mouldingMachines} 
                    onChange={(e) => handleInputChange('mouldingMachines', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
            </div>

            <div className="space-y-2 lg:col-span-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center justify-between">
                    <span>Inspection Stations</span>
                    <span className="font-bold text-red-600">{config.inspectionStations}</span>
                </label>
                <input 
                    type="range" min="1" max="10" 
                    value={config.inspectionStations} 
                    onChange={(e) => handleInputChange('inspectionStations', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
            </div>

            <div className="space-y-2 lg:col-span-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center justify-between">
                    <span>Packaging Machines</span>
                    <span className="font-bold text-red-600">{config.packagingMachines}</span>
                </label>
                <input 
                    type="range" min="1" max="10" 
                    value={config.packagingMachines} 
                    onChange={(e) => handleInputChange('packagingMachines', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
            </div>

             <div className="space-y-2 lg:col-span-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                    Arrival Mean
                    <InfoTooltip text="Average minutes between orders." />
                </label>
                <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                    <input 
                        type="number" 
                        value={config.arrivalIntervalMean} 
                        onChange={(e) => handleInputChange('arrivalIntervalMean', parseFloat(e.target.value))}
                        className="w-full px-3 py-1.5 text-sm focus:outline-none bg-white text-gray-900"
                    />
                </div>
            </div>

            {/* Row 2 */}
             <div className="space-y-2 lg:col-span-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center justify-between">
                    <span>Replications (Runs)</span>
                    <span className="font-bold text-blue-600">{config.replications}</span>
                </label>
                 <div className="flex items-center gap-2">
                    <input 
                        type="range" min="1" max="50" 
                        value={config.replications} 
                        onChange={(e) => handleInputChange('replications', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                 </div>
                 <div className="text-[10px] text-gray-400 text-right">Run {config.replications}x for 95% CI</div>
            </div>

            <div className="space-y-2 lg:col-span-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                    Grace Period (min)
                    <InfoTooltip text="Parts can wait this long before degradation cost applies." />
                </label>
                 <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                    <input 
                        type="number" 
                        value={config.degradationThreshold} 
                        onChange={(e) => handleInputChange('degradationThreshold', parseFloat(e.target.value))}
                        className="w-full px-3 py-1.5 text-sm focus:outline-none bg-white text-gray-900"
                    />
                </div>
            </div>

            <div className="space-y-2 lg:col-span-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                    Cost / min ($)
                    <InfoTooltip text="Financial penalty per minute of waiting after grace period." />
                </label>
                 <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                    <span className="pl-3 text-gray-500 text-sm bg-white">$</span>
                    <input 
                        type="number" 
                        value={config.degradationCostPerMinute} 
                        onChange={(e) => handleInputChange('degradationCostPerMinute', parseFloat(e.target.value))}
                        className="w-full px-2 py-1.5 text-sm focus:outline-none bg-white text-gray-900"
                    />
                </div>
            </div>
        </div>
      </div>

      <ProcessDiagram 
        mouldingMachines={config.mouldingMachines}
        inspectionStations={config.inspectionStations}
        packagingMachines={config.packagingMachines}
      />

      <Dashboard 
        stats={stats} 
        sensitivityData={sensitivityData} 
        loading={loading} 
        history={history}
        replications={config.replications}
        aiFeedback={aiFeedback}
      />
    </Layout>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);