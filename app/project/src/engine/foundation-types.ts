import { InternalSystem } from '@/domain';

export interface FatigueScaleBounds {
  min: number;
  max: number;
  homeostasis: number;
}

export type ContinuousSystemState = Readonly<Record<InternalSystem, number>>;

export type ContinuousSystemLoadVector = Readonly<Record<InternalSystem, number>>;
