package models

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

type PluginSettings struct {
	User         string                `json:"user"`
	Hostname     string                `json:"hostname"`
	TimeZone     string                `json:"timezone"`
	Port         int                   `json:"port"`
	Service      string                `json:"service"`
	Secrets      *SecretPluginSettings `json:"-"`
	MaxOpenConns int                   `json:"maxOpenConns"`
	MaxIdleConns int                   `json:"maxIdleConns"`
	MaxIdleTime  Duration              `json:"maxIdleTime"`
	MaxLifeTime  Duration              `json:"maxLifeTime"`
}

type SecretPluginSettings struct {
	Password string `json:"password"`
}

func LoadPluginSettings(source backend.DataSourceInstanceSettings) (*PluginSettings, error) {
	settings := PluginSettings{}
	err := json.Unmarshal(source.JSONData, &settings)
	if err != nil {
		return nil, err
	}

	settings.Secrets = loadSecretPluginSettings(source.DecryptedSecureJSONData)

	return &settings, nil
}

func loadSecretPluginSettings(source map[string]string) *SecretPluginSettings {
	return &SecretPluginSettings{
		Password: source["password"],
	}
}

type Duration struct {
	time.Duration
}

func (d Duration) MarshalJSON() ([]byte, error) {
	return json.Marshal(d.String())
}

func (d *Duration) UnmarshalJSON(b []byte) error {
	var v interface{}
	if err := json.Unmarshal(b, &v); err != nil {
		return err
	}
	switch value := v.(type) {
	case float64:
		d.Duration = time.Duration(value)
		return nil
	case string:
		var err error
		d.Duration, err = time.ParseDuration(value)
		if err != nil {
			return err
		}
		return nil
	default:
		return errors.New("invalid duration")
	}
}
