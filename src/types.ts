import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export interface Query extends DataQuery {
  sql?: string;
}

export const DEFAULT_QUERY: Partial<Query> = {};

export interface DataPoint {
  Time: number;
  Value: number;
}

export interface DataSourceResponse {
  datapoints: DataPoint[];
}

/**
 * These are options configured for each DataSource instance
 */
export interface DataSourceOptions extends DataSourceJsonData {
  user: string;
  hostname: string;
  port: number;
  service: string;
  maxOpenConns: number;
  maxIdleConns: number;
  maxIdleTime: string;
  maxLifeTime: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface SecureJsonData {
  password: string;
}
