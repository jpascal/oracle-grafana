package plugin

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"reflect"
	"slices"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/grafana/grafana-plugin-sdk-go/experimental/concurrent"
	"github.com/jpascal/oracle-datasource/pkg/models"
	go_ora "github.com/sijms/go-ora/v2"
)

// Make sure Datasource implements required interfaces. This is important to do
// since otherwise we will only get a not implemented error response from plugin in
// runtime. In this example datasource instance implements backend.QueryDataHandler,
// backend.CheckHealthHandler interfaces. Plugin should not implement all these
// interfaces - only those which are required for a particular task.
var (
	_ backend.QueryDataHandler      = (*Datasource)(nil)
	_ backend.CheckHealthHandler    = (*Datasource)(nil)
	_ instancemgmt.InstanceDisposer = (*Datasource)(nil)
)

// NewDatasource creates a new datasource instance.
func NewDatasource(_ context.Context, instanceSettings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	log.DefaultLogger.Info("close connections")
	settings, err := models.LoadPluginSettings(instanceSettings)
	if err != nil {
		return nil, err
	}
	db := sql.OpenDB(go_ora.NewConnector(fmt.Sprintf("oracle://%s:%s@%s:%d/%s", settings.User, settings.Secrets.Password, settings.Hostname, settings.Port, settings.Service)))
	db.SetMaxOpenConns(settings.MaxOpenConns)
	db.SetMaxIdleConns(settings.MaxIdleConns)
	db.SetConnMaxIdleTime(settings.MaxIdleTime.Duration)
	db.SetConnMaxLifetime(settings.MaxLifeTime.Duration)
	if err := db.Ping(); err != nil {
		return nil, err
	}

	return &Datasource{settings: settings, db: db}, nil
}

// Datasource is an example datasource which can respond to data queries, reports
// its health and has streaming skills.
type Datasource struct {
	settings *models.PluginSettings
	db       *sql.DB
}

// Dispose here tells plugin SDK that plugin wants to clean up resources when a new instance
// created. As soon as datasource settings change detected by SDK old datasource instance will
// be disposed and a new one will be created using NewSampleDatasource factory function.
func (d *Datasource) Dispose() {
	log.DefaultLogger.Info("close connections")
	d.db.Close()
	// Clean up datasource instance resources.
}

// QueryData handles multiple queries and returns multiple responses.
// req contains the queries []DataQuery (where each query contains RefID as a unique identifier).
// The QueryDataResponse contains a map of RefID to the response for each query, and each response
// contains Frames ([]*Frame).
func (d *Datasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	log.DefaultLogger.Info("query data")
	return concurrent.QueryData(ctx, req, d.concurrentQuery, 10)
}

func (d *Datasource) concurrentQuery(ctx context.Context, query concurrent.Query) (res backend.DataResponse) {
	var response backend.DataResponse
	// Unmarshal the JSON into our queryModel.
	var dsQuery DatasourceQuery

	err := json.Unmarshal(query.DataQuery.JSON, &dsQuery)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("json unmarshal: %v", err.Error()))
	}

	connection, err := d.db.Conn(ctx)
	defer func() {
		_ = connection.Close()
	}()

	queries := slices.DeleteFunc(strings.Split(dsQuery.SQL, ";"), func(s string) bool {
		return len(s) == 0
	})

	if len(queries) > 1 {
		for index, query := range queries[:1] {
			_, err = connection.ExecContext(ctx, fmt.Sprintf(query))
			if err != nil {
				return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("Error(query: %d): %v", index, err.Error()))
			}
		}
	}

	rows, err := connection.QueryContext(ctx, queries[len(queries)-1])
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("Error: %v", err.Error()))
	}

	columnTypes, err := rows.ColumnTypes()
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("Error: %v", err.Error()))
	}

	frame := data.NewFrame(query.DataQuery.RefID)

	log.DefaultLogger.Info(fmt.Sprintf("from: %+v", query))

	var values []any
	for _, column := range columnTypes {
		switch column.ScanType().Kind() {
		case reflect.Bool:
			frame.Fields = append(frame.Fields, data.NewField(column.Name(), nil, []*bool{}))
			values = append(values, Value[bool]())
		case reflect.Int64:
			frame.Fields = append(frame.Fields, data.NewField(column.Name(), nil, []*int64{}))
			values = append(values, Value[int64]())
		case reflect.Float64:
			frame.Fields = append(frame.Fields, data.NewField(column.Name(), nil, []*float64{}))
			values = append(values, Value[float64]())
		case reflect.TypeOf(time.Time{}).Kind():
			frame.Fields = append(frame.Fields, data.NewField(column.Name(), nil, []*time.Time{}))
			values = append(values, Value[time.Time]())
		default:
			frame.Fields = append(frame.Fields, data.NewField(column.Name(), nil, []*string{}))
			values = append(values, Value[string]())
		}
	}

	for rows.Next() {
		if err := rows.Scan(values...); err != nil {
			return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("Error: %v", err.Error()))
		}
		frame.AppendRow(Convert(values...)...)
	}

	response.Frames = append(response.Frames, frame)
	return response
}

func Value[T any]() any {
	var value sql.Null[T]
	return &value
}

type Nullable interface {
	Value() (driver.Value, error)
}

func Convert(values ...any) []any {
	var result []any
	for _, value := range values {
		if nullableValue, ok := value.(Nullable); ok {
			if v, err := nullableValue.Value(); err != nil {
				result = append(result, nil)
			} else {
				switch rawValue := v.(type) {
				case float64:
					result = append(result, &rawValue)
				case int64:
					result = append(result, &rawValue)
				case bool:
					result = append(result, &rawValue)
				case string:
					result = append(result, &rawValue)
				case time.Time:
					result = append(result, &rawValue)
				default:
					result = append(result, nil)
				}
			}
		}
	}
	return result
}

func (d *Datasource) CheckHealth(_ context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	res := &backend.CheckHealthResult{}
	config, err := models.LoadPluginSettings(*req.PluginContext.DataSourceInstanceSettings)

	if err != nil {
		log.DefaultLogger.Error("check", "err", err.Error())
		res.Status = backend.HealthStatusError
		res.Message = "Unable to load settings"
		return res, nil
	}

	if config.Secrets.Password == "" {
		res.Status = backend.HealthStatusError
		res.Message = "Password key is missing"
		return res, nil
	}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "Data source is working",
	}, nil
}
