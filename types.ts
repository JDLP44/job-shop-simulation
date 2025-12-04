export enum ProductType {
  TypeA = "Type A",
  TypeB = "Type B",
  TypeC = "Type C",
  TypeD = "Type D",
}

export interface SimulationConfig {
  duration: number; // in minutes
  mouldingMachines: number;
  inspectionStations: number;
  packagingMachines: number;
  arrivalIntervalMean: number; // minutes
  degradationCostPerMinute: number;
  degradationThreshold: number; // Grace period in minutes
  replications: number; // Number of simulation runs
  seed: number;
}

export interface Job {
  id: number;
  productType: ProductType;
  arrivalTime: number;
  mouldingStartTime?: number;
  mouldingEndTime?: number;
  inspectionStartTime?: number; // Wait time before this causes degradation
  inspectionEndTime?: number;
  packagingStartTime?: number;
  packagingEndTime?: number;
  finished: boolean;
}

export interface WaitStats {
  avg: number;
  p90: number;
  max: number;
}

export interface ConfidenceInterval {
  mean: number;
  lower: number;
  upper: number;
}

export interface SimulationStats {
  totalJobs: number;
  completedJobs: number;
  
  // Advanced KPIs
  throughput: number; // Jobs per hour
  avgWip: number; // Average Work In Process
  serviceLevel: number; // % of inspection waits below a safe threshold (e.g. 5 min)

  avgLeadTime: number;
  leadTimeCI: ConfidenceInterval;

  totalDegradationCost: number;
  avgDegradationCostPerPart: number;
  costCI: ConfidenceInterval;

  // Wait Time Stats
  waitTimes: {
    moulding: number[];
    inspection: number[]; 
    packaging: number[];
  };
  
  waitStats: {
    moulding: WaitStats;
    inspection: WaitStats;
    packaging: WaitStats;
  };

  machineUtilization: {
    moulding: number;
    inspection: number;
    packaging: number;
  };
}

export interface SensitivityPoint {
  label: string; // e.g., "1", "2", "3" machines
  xValue: number;
  cost: number;
  avgWait: number;
  variable: 'moulding' | 'inspection' | 'packaging';
}

export interface ScenarioResult {
  id: number;
  timestamp: Date;
  config: SimulationConfig;
  stats: SimulationStats;
  isBest?: boolean;
}