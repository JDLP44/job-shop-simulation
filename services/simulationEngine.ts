import { Job, ProductType, SimulationConfig, SimulationStats, WaitStats, ConfidenceInterval } from "../types";

// Simple pseudo-random number generator for reproducibility
class Random {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Linear Congruential Generator
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  // Exponential distribution for process times and intervals
  exponential(mean: number): number {
    return -Math.log(1 - this.next()) * mean;
  }

  // Choice from array
  choice<T>(items: T[]): T {
    const idx = Math.floor(this.next() * items.length);
    return items[idx];
  }
}

// Event types
enum EventType {
  ARRIVAL,
  MOULDING_FINISH,
  INSPECTION_FINISH,
  PACKAGING_FINISH,
}

interface SimEvent {
  time: number;
  type: EventType;
  job?: Job; // For finish events
}

export class SimulationEngine {
  private config: SimulationConfig;
  
  constructor(config: SimulationConfig) {
    this.config = config;
  }

  // Main entry point that handles multiple replications
  public run(): SimulationStats {
    const runs = Math.max(1, this.config.replications);
    const results: SimulationStats[] = [];

    for (let i = 0; i < runs; i++) {
        // Vary seed slightly for each replication if seed is fixed, 
        // or rely on user providing a different seed. 
        // For this demo, we'll increment the seed for each replication
        // to ensure they are different but reproducible.
        const runConfig = { ...this.config, seed: this.config.seed + i };
        results.push(this.runSingleSimulation(runConfig));
    }

    return this.aggregateResults(results);
  }

  private runSingleSimulation(config: SimulationConfig): SimulationStats {
    const random = new Random(config.seed);
    let currentTime = 0;
    const queue: SimEvent[] = [];
    const jobs: Job[] = [];

    // Resources
    let mouldingFree = config.mouldingMachines;
    let inspectionFree = config.inspectionStations;
    let packagingFree = config.packagingMachines;

    // Queues
    const mouldingQueue: Job[] = [];
    const inspectionQueue: Job[] = [];
    const packagingQueue: Job[] = [];

    // Utilization Tracking
    let totalMouldingBusyTime = 0;
    let totalInspectionBusyTime = 0;
    let totalPackagingBusyTime = 0;

    // WIP Tracking (Area under curve approach)
    let lastEventTime = 0;
    let wipArea = 0;
    let currentWip = 0;

    // Helper to schedule
    const schedule = (type: EventType, time: number, job?: Job) => {
        queue.push({ type, time, job });
        queue.sort((a, b) => a.time - b.time);
    };

    // Helper for process times
    const getProcessTime = (stage: 'moulding' | 'inspection' | 'packaging', type: ProductType): number => {
        let baseMean = 10;
        switch (type) {
            case ProductType.TypeA: baseMean = 10; break;
            case ProductType.TypeB: baseMean = 15; break;
            case ProductType.TypeC: baseMean = 20; break;
            case ProductType.TypeD: baseMean = 12; break;
        }
        if (stage === 'inspection') baseMean *= 0.8; 
        if (stage === 'packaging') baseMean *= 0.6;
        return random.exponential(baseMean);
    };

    // Schedule first arrival
    schedule(EventType.ARRIVAL, random.exponential(config.arrivalIntervalMean));

    while (queue.length > 0 && currentTime < config.duration) {
      const event = queue.shift()!;
      
      // Update WIP Area
      wipArea += currentWip * (event.time - lastEventTime);
      lastEventTime = event.time;
      
      currentTime = event.time;

      switch (event.type) {
        case EventType.ARRIVAL:
          currentWip++;
          const job: Job = {
            id: jobs.length + 1,
            productType: random.choice([ProductType.TypeA, ProductType.TypeB, ProductType.TypeC, ProductType.TypeD]),
            arrivalTime: currentTime,
            finished: false,
          };
          jobs.push(job);
          
          const nextArrival = currentTime + random.exponential(config.arrivalIntervalMean);
          if (nextArrival < config.duration) schedule(EventType.ARRIVAL, nextArrival);

          if (mouldingFree > 0) {
            mouldingFree--;
            job.mouldingStartTime = currentTime;
            schedule(EventType.MOULDING_FINISH, currentTime + getProcessTime('moulding', job.productType), job);
          } else {
            mouldingQueue.push(job);
          }
          break;

        case EventType.MOULDING_FINISH:
          const mJob = event.job!;
          mJob.mouldingEndTime = currentTime;
          if(mJob.mouldingStartTime) totalMouldingBusyTime += (currentTime - mJob.mouldingStartTime);
          mouldingFree++;

          if (mouldingQueue.length > 0) {
            mouldingFree--;
            const next = mouldingQueue.shift()!;
            next.mouldingStartTime = currentTime;
            schedule(EventType.MOULDING_FINISH, currentTime + getProcessTime('moulding', next.productType), next);
          }

          if (inspectionFree > 0) {
            inspectionFree--;
            mJob.inspectionStartTime = currentTime;
            schedule(EventType.INSPECTION_FINISH, currentTime + getProcessTime('inspection', mJob.productType), mJob);
          } else {
            inspectionQueue.push(mJob);
          }
          break;

        case EventType.INSPECTION_FINISH:
          const iJob = event.job!;
          iJob.inspectionEndTime = currentTime;
          if(iJob.inspectionStartTime) totalInspectionBusyTime += (currentTime - iJob.inspectionStartTime);
          inspectionFree++;

          if (inspectionQueue.length > 0) {
            inspectionFree--;
            const next = inspectionQueue.shift()!;
            next.inspectionStartTime = currentTime;
            schedule(EventType.INSPECTION_FINISH, currentTime + getProcessTime('inspection', next.productType), next);
          }

          if (packagingFree > 0) {
            packagingFree--;
            iJob.packagingStartTime = currentTime;
            schedule(EventType.PACKAGING_FINISH, currentTime + getProcessTime('packaging', iJob.productType), iJob);
          } else {
            packagingQueue.push(iJob);
          }
          break;

        case EventType.PACKAGING_FINISH:
          currentWip--;
          const pJob = event.job!;
          pJob.packagingEndTime = currentTime;
          if(pJob.packagingStartTime) totalPackagingBusyTime += (currentTime - pJob.packagingStartTime);
          pJob.finished = true;
          packagingFree++;

          if (packagingQueue.length > 0) {
            packagingFree--;
            const next = packagingQueue.shift()!;
            next.packagingStartTime = currentTime;
            schedule(EventType.PACKAGING_FINISH, currentTime + getProcessTime('packaging', next.productType), next);
          }
          break;
      }
    }

    // Single Run Stats Calculation
    const completed = jobs.filter(j => j.finished);
    let totalLeadTime = 0;
    let totalDegradation = 0;
    
    // Arrays for this run
    const waits = { m: [] as number[], i: [] as number[], p: [] as number[] };

    jobs.forEach(job => {
        if (job.mouldingStartTime) waits.m.push(job.mouldingStartTime - job.arrivalTime);
        if (job.inspectionStartTime && job.mouldingEndTime) {
            const wait = job.inspectionStartTime - job.mouldingEndTime;
            waits.i.push(wait);
            // Apply Degradation Threshold
            const effectiveWait = Math.max(0, wait - config.degradationThreshold);
            totalDegradation += effectiveWait * config.degradationCostPerMinute;
        }
        if (job.packagingStartTime && job.inspectionEndTime) waits.p.push(job.packagingStartTime - job.inspectionEndTime);
        if (job.finished && job.packagingEndTime) totalLeadTime += (job.packagingEndTime - job.arrivalTime);
    });

    const safeDiv = (n: number, d: number) => d === 0 ? 0 : n / d;
    const avgLead = safeDiv(totalLeadTime, completed.length);
    const avgCost = safeDiv(totalDegradation, jobs.length);
    
    // Service Level: % of inspection waits < 5 mins (Arbitrary 'Good' threshold for this metric)
    const serviceThreshold = 5; 
    const goodServiceCount = waits.i.filter(w => w < serviceThreshold).length;
    const serviceLevel = safeDiv(goodServiceCount, waits.i.length);

    // Calculate Percentiles Helper
    const calcStats = (arr: number[]): WaitStats => {
        if (arr.length === 0) return { avg: 0, p90: 0, max: 0 };
        arr.sort((a, b) => a - b);
        const sum = arr.reduce((a, b) => a + b, 0);
        const p90Idx = Math.floor(arr.length * 0.9);
        return {
            avg: sum / arr.length,
            p90: arr[p90Idx],
            max: arr[arr.length - 1]
        };
    };

    return {
        totalJobs: jobs.length,
        completedJobs: completed.length,
        throughput: completed.length / (config.duration / 60), // Jobs per hour
        avgWip: safeDiv(wipArea, config.duration),
        serviceLevel,
        avgLeadTime: avgLead,
        leadTimeCI: { mean: avgLead, lower: avgLead, upper: avgLead }, // Single run has no CI
        totalDegradationCost: totalDegradation,
        avgDegradationCostPerPart: avgCost,
        costCI: { mean: avgCost, lower: avgCost, upper: avgCost }, // Single run has no CI
        waitTimes: { moulding: waits.m, inspection: waits.i, packaging: waits.p },
        waitStats: { moulding: calcStats(waits.m), inspection: calcStats(waits.i), packaging: calcStats(waits.p) },
        machineUtilization: {
            moulding: safeDiv(totalMouldingBusyTime, config.duration * config.mouldingMachines),
            inspection: safeDiv(totalInspectionBusyTime, config.duration * config.inspectionStations),
            packaging: safeDiv(totalPackagingBusyTime, config.duration * config.packagingMachines)
        }
    };
  }

  private aggregateResults(runs: SimulationStats[]): SimulationStats {
    // If only 1 run, return it directly
    if (runs.length === 1) return runs[0];

    const count = runs.length;
    
    // Helper to average a field
    const avg = (extractor: (s: SimulationStats) => number) => 
        runs.reduce((sum, s) => sum + extractor(s), 0) / count;

    // Helper to calculate CI (95%)
    // Formula: Mean +/- 1.96 * (StdDev / sqrt(N))
    const calcCI = (extractor: (s: SimulationStats) => number): ConfidenceInterval => {
        const values = runs.map(extractor);
        const mean = values.reduce((a, b) => a + b, 0) / count;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (count - 1 || 1);
        const stdDev = Math.sqrt(variance);
        const margin = 1.96 * (stdDev / Math.sqrt(count));
        return { mean, lower: mean - margin, upper: mean + margin };
    };

    // Combine histograms (concatenate all data points)
    const combineWaits = (key: 'moulding' | 'inspection' | 'packaging') => 
        runs.reduce((arr, s) => [...arr, ...s.waitTimes[key]], [] as number[]);

    // Combine WaitStats (Average the percentiles)
    const avgWaitStat = (key: 'moulding' | 'inspection' | 'packaging'): WaitStats => ({
        avg: avg(s => s.waitStats[key].avg),
        p90: avg(s => s.waitStats[key].p90),
        max: Math.max(...runs.map(s => s.waitStats[key].max)) // Max of Max
    });

    const waitTimes = {
        moulding: combineWaits('moulding'),
        inspection: combineWaits('inspection'),
        packaging: combineWaits('packaging')
    };

    return {
        totalJobs: Math.round(avg(s => s.totalJobs)),
        completedJobs: Math.round(avg(s => s.completedJobs)),
        throughput: avg(s => s.throughput),
        avgWip: avg(s => s.avgWip),
        serviceLevel: avg(s => s.serviceLevel),
        
        avgLeadTime: avg(s => s.avgLeadTime),
        leadTimeCI: calcCI(s => s.avgLeadTime),

        totalDegradationCost: avg(s => s.totalDegradationCost),
        avgDegradationCostPerPart: avg(s => s.avgDegradationCostPerPart),
        costCI: calcCI(s => s.avgDegradationCostPerPart),

        waitTimes,
        waitStats: {
            moulding: avgWaitStat('moulding'),
            inspection: avgWaitStat('inspection'),
            packaging: avgWaitStat('packaging')
        },
        machineUtilization: {
            moulding: avg(s => s.machineUtilization.moulding),
            inspection: avg(s => s.machineUtilization.inspection),
            packaging: avg(s => s.machineUtilization.packaging),
        }
    };
  }
}