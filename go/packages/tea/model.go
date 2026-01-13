package tea

import (
	"errors"

	bubbletea "github.com/charmbracelet/bubbletea"
	tuish "github.com/tuishdotdev/tuish/go"
)

type Cmd = bubbletea.Cmd
type Msg = bubbletea.Msg
type Model = bubbletea.Model

var ErrMissingSDK = errors.New("tuish SDK is required")

// LicenseModel tracks license state inside a Bubble Tea app.
type LicenseModel struct {
	SDK      *tuish.SDK
	Result   *tuish.LicenseCheckResult
	Err      error
	Checking bool
}

func NewLicenseModel(sdk *tuish.SDK) LicenseModel {
	return LicenseModel{SDK: sdk}
}

func (m LicenseModel) Init() Cmd {
	return CheckLicenseCmd(m.SDK)
}

func (m LicenseModel) Update(msg Msg) (LicenseModel, Cmd) {
	switch typed := msg.(type) {
	case LicenseCheckedMsg:
		m.Result = typed.Result
		m.Err = typed.Err
		m.Checking = false
	}
	return m, nil
}

func (m LicenseModel) IsValid() bool {
	return m.Result != nil && m.Result.Valid
}

func (m LicenseModel) HasFeature(feature string) bool {
	if m.Result == nil || m.Result.License == nil {
		return false
	}
	for _, item := range m.Result.License.Features {
		if item == feature {
			return true
		}
	}
	return false
}
