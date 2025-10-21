import React, { FormEvent, useState } from 'react';
import { Stack, TextArea } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { DataSourceOptions, Query } from '../types';
import { getTemplateSrv } from '@grafana/runtime';

type Props = QueryEditorProps<DataSource, Query, DataSourceOptions>;

export function QueryEditor({ query, onChange }: Props) {
  const onSQLChange = (event: FormEvent<HTMLTextAreaElement>) => {
    onChange({
      ...query,
      sql: event.currentTarget.value,
    });
    setSql(getTemplateSrv().replace(event.currentTarget.value));
  };
  const [sql, setSql] = useState(query.sql);
  return (
    <Stack gap={0}>
      <div
        style={{
          flexGrow: 1,
          minWidth: '480px',
          padding: '10px 5px',
          gap: '5px',
        }}
      >
        <TextArea
          onChange={onSQLChange}
          placeholder="SELECT * \n FROM SYS.races \nWHERE data BETWEEN $__from AND $__to"
          rows={5}
          defaultValue={query.sql}
          required
          width="100%"
        />
        <TextArea rows={5} value={sql} readOnly required width="100%" />
      </div>
    </Stack>
  );
}
