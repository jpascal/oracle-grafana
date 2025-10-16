import {
  DataSourceInstanceSettings,
  CoreApp,
  ScopedVars,
  DataQueryRequest,
  DataQueryResponse,
} from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';
import { Observable } from 'rxjs';
import { Query, DataSourceOptions, DEFAULT_QUERY } from './types';
import { DataSourceVariable } from './variables';

export class DataSource extends DataSourceWithBackend<Query, DataSourceOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<DataSourceOptions>) {
    super(instanceSettings);
    this.variables = new DataSourceVariable()
  }

  query(request: DataQueryRequest<Query>): Observable<DataQueryResponse> {
    for(const query of request.targets) {
      if (request.scopedVars && Object.keys(request.scopedVars).length > 0) {
        query.sql = this.applyTemplateVariables(query, request.scopedVars).sql;
      }
    }
    return super.query(request)
  }

  getDefaultQuery(_: CoreApp): Partial<Query> {
    return DEFAULT_QUERY;
  }

  applyTemplateVariables(query: Query, scopedVars: ScopedVars) {
    return {
      ...query,
      sql: getTemplateSrv().replace(query.sql, scopedVars),
    };
  }


  filterQuery(query: Query): boolean {
    // if no query has been provided, prevent the query from being executed
    return !!query.sql;
  }
}
