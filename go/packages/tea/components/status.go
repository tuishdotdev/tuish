package components

import (
	tuish "github.com/tuishdotdev/tuish/go"
	"github.com/tuishdotdev/tuish/go/tui"
)

type LicenseStatus = tui.LicenseStatus
type LicenseStatusConfig = tui.LicenseStatusConfig

func LicenseStatus(sdk *tuish.SDK, config ...tui.LicenseStatusConfig) *tui.LicenseStatus {
	return tui.NewLicenseStatus(sdk, config...)
}
