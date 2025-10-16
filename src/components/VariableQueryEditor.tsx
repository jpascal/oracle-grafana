import React, { FormEvent } from 'react';
import { Label, Stack, TextArea } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { DataSourceOptions, Query } from '../types';

type Props = QueryEditorProps<DataSource, Query, DataSourceOptions>;

export function VariableQueryEditor({ query, onChange }: Props) {
  const onSQLChange = (event: FormEvent<HTMLTextAreaElement>) => {
    onChange({
      ...query,
      sql: event.currentTarget.value,
    });
  };
  return (
    <Stack gap={0}>
      <div
        style={{
          flexGrow: 1,
          minWidth: '480px',
          padding: '10px 5px',
        }}
      >
        <Label>Query</Label>
        <TextArea
          onChange={onSQLChange}
          placeholder="SELECT * \n FROM SYS.races \nWHERE data BETWEEN $__from AND $__to"
          rows={5}
          value={query.sql}
          required
          width="100%"
        />
      </div>
    </Stack>
  );
}
