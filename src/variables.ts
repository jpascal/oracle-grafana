import { DataSourceVariableSupport, VariableSupportType } from '@grafana/data';

import { DataSource } from './datasource';

export class DataSourceVariable extends DataSourceVariableSupport<DataSource> {
  getType(): VariableSupportType {
    return VariableSupportType.Datasource;
  }
}
