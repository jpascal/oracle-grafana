import React, { ChangeEvent } from 'react';
import { InlineField, Input, Legend, SecretInput, TimeZonePicker } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { DataSourceOptions, SecureJsonData } from '../types';
import { TimeZone } from '@grafana/schema';

interface Props extends DataSourcePluginOptionsEditorProps<DataSourceOptions> {}

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;

  const onPasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      secureJsonData: {
        password: event.target.value,
      },
    });
  };

  const onPasswordReset = () => {
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...options.secureJsonFields,
        password: false,
      },
      secureJsonData: {
        ...options.secureJsonData,
        password: '',
      },
    });
  };

  const onChangeNumber = (attribute: keyof DataSourceOptions) => (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        [attribute]: Number(event.target.value),
      },
    });
  };

  const onChangeString = (attribute: keyof DataSourceOptions) => (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        [attribute]: event.target.value,
      },
    });
  };
  const onChangeTimeZone = (timezone?: TimeZone) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        timezone: timezone || "",
      },
    });
  }

  const { jsonData, secureJsonFields } = options;
  const secureJsonData = (options.secureJsonData || {}) as SecureJsonData;
  return (
    <>
      <Legend>Authentication</Legend>
      <InlineField grow label="User" labelWidth={20}>
        <Input placeholder="User" required value={jsonData.user} width={50} onChange={onChangeString('user')} />
      </InlineField>
      <InlineField grow label="Password" labelWidth={20}>
        <SecretInput
          isConfigured={(secureJsonData && secureJsonFields.password) as boolean}
          placeholder="Password"
          required
          value={secureJsonData.password}
          width={50}
          onChange={onPasswordChange}
          onReset={onPasswordReset}
        />
      </InlineField>
      <InlineField grow label="TimeZone" labelWidth={20}>
        <TimeZonePicker value={jsonData.timezone} onChange={onChangeTimeZone} width={50} />
      </InlineField>
      <Legend>Connection</Legend>
      <InlineField grow label="Hostname" labelWidth={20}>
        <Input placeholder="localhost" value={jsonData.hostname} width={50} onChange={onChangeString('hostname')} />
      </InlineField>
      <InlineField grow label="Port" labelWidth={20}>
        <Input placeholder="1521" type="number" value={jsonData.port} width={50} onChange={onChangeNumber('port')} />
      </InlineField>
      <InlineField grow label="Service" labelWidth={20}>
        <Input placeholder="" value={jsonData.service} width={50} onChange={onChangeString('service')} />
      </InlineField>
      <InlineField grow label="Max open connections" labelWidth={20}>
        <Input placeholder="25" value={jsonData.maxOpenConns} width={50} onChange={onChangeNumber('maxOpenConns')} />
      </InlineField>
      <InlineField grow label="Max Idle connections" labelWidth={20}>
        <Input placeholder="25" value={jsonData.maxIdleConns} width={50} onChange={onChangeNumber('maxIdleConns')} />
      </InlineField>
      <InlineField grow label="Max idle time" labelWidth={20}>
        <Input placeholder="1m" value={jsonData.maxIdleTime} width={50} onChange={onChangeString('maxIdleTime')} />
      </InlineField>
      <InlineField grow label="Max life time" labelWidth={20}>
        <Input placeholder="5m" value={jsonData.maxLifeTime} width={50} onChange={onChangeString('maxLifeTime')} />
      </InlineField>
    </>
  );
}
