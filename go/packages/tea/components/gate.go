package components

import (
	bubbletea "github.com/charmbracelet/bubbletea"
	tuish "github.com/tuishdotdev/tuish/go"
	"github.com/tuishdotdev/tuish/go/tui"
)

type LicenseGate = tui.LicenseGate
type LicenseGateConfig = tui.LicenseGateConfig

func NewLicenseGate(sdk *tuish.SDK, child bubbletea.Model, config ...tui.LicenseGateConfig) *tui.LicenseGate {
	return tui.NewLicenseGate(sdk, child, config...)
}
