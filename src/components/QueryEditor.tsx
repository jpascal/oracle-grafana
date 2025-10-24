import React, { useState } from 'react';
import { CodeEditor, InlineField, Stack, TextArea } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { DataSourceOptions, Query } from '../types';
import { getTemplateSrv } from '@grafana/runtime';
type Props = QueryEditorProps<DataSource, Query, DataSourceOptions>;

export function QueryEditor({ query, onChange }: Props) {
  const onSQLChange = (sql: string) => {
    onChange({
      ...query,
      sql: sql,
    });
    setSql(getTemplateSrv().replace(sql));
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
        <InlineField grow label="SQL" labelWidth={10}>
          <CodeEditor
            language="sql"
            onChange={onSQLChange}
            width="100%"
            value={query.sql || ''}
            height={300}
            showLineNumbers
            showMiniMap={false}
            monacoOptions={{
              tabSize: 2,
            }}
          ></CodeEditor>
        </InlineField>
        <InlineField grow label="Result" labelWidth={10}>
          <TextArea rows={5} value={sql} readOnly required width="100%" />
        </InlineField>
      </div>
    </Stack>
  );
}
