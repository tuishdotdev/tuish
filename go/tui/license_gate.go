package tui

import (
	tea "github.com/charmbracelet/bubbletea"
	tuish "github.com/tuishdotdev/tuish/go"
)

// LicenseGateConfig contains configuration for the LicenseGate component.
type LicenseGateConfig struct {
	// Feature is the specific feature required for access.
	// If empty, RequireLicense is checked instead.
	Feature string

	// RequireLicense requires any valid license when Feature is not set.
	RequireLicense bool

	// Styles allows custom styling.
	Styles *Styles
}

// LicenseGate conditionally renders content based on license status.
// It wraps a child model and only allows access when licensing requirements are met.
type LicenseGate struct {
	sdk      *tuish.SDK
	config   LicenseGateConfig
	styles   Styles
	child    tea.Model
	fallback tea.Model
	loading  tea.Model

	result     *tuish.LicenseCheckResult
	isLoading  bool
	hasAccess  bool
	err        error
}

// NewLicenseGate creates a new LicenseGate that wraps a child model.
//
// The child model is displayed when access is granted.
// The fallback model is displayed when access is denied (optional).
// If no fallback is provided, a default "access denied" message is shown.
//
// Example:
//
//	gate := tui.NewLicenseGate(sdk, myApp, tui.LicenseGateConfig{
//		Feature: "pro",
//	})
//	gate.SetFallback(purchaseFlow)
func NewLicenseGate(sdk *tuish.SDK, child tea.Model, config ...LicenseGateConfig) *LicenseGate {
	cfg := LicenseGateConfig{}
	if len(config) > 0 {
		cfg = config[0]
	}

	styles := DefaultStyles()
	if cfg.Styles != nil {
		styles = *cfg.Styles
	}

	return &LicenseGate{
		sdk:       sdk,
		config:    cfg,
		styles:    styles,
		child:     child,
		isLoading: true,
	}
}

// SetFallback sets the model to display when access is denied.
func (m *LicenseGate) SetFallback(fallback tea.Model) *LicenseGate {
	m.fallback = fallback
	return m
}

// SetLoading sets a custom loading model.
func (m *LicenseGate) SetLoading(loading tea.Model) *LicenseGate {
	m.loading = loading
	return m
}

// Init initializes the LicenseGate by checking the license.
func (m *LicenseGate) Init() tea.Cmd {
	return m.checkLicense
}

// Update handles messages for the LicenseGate.
func (m *LicenseGate) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case LicenseCheckedMsg:
		m.isLoading = false
		if msg.Error != nil {
			m.err = msg.Error
			m.hasAccess = false
		} else {
			m.result = msg.Result
			m.hasAccess = m.checkAccess(msg.Result)
		}

		// Initialize the appropriate child model
		if m.hasAccess {
			return m, m.child.Init()
		}
		if m.fallback != nil {
			return m, m.fallback.Init()
		}
		return m, nil

	case LicenseStoredMsg:
		// Re-check license after storing
		if msg.Error == nil {
			m.isLoading = true
			return m, m.checkLicense
		}

	case LicenseRefreshedMsg:
		if msg.Error == nil && msg.Result != nil {
			m.result = msg.Result
			m.hasAccess = m.checkAccess(msg.Result)
		}
	}

	// Pass messages to the active child model
	if m.isLoading {
		if m.loading != nil {
			var cmd tea.Cmd
			m.loading, cmd = m.loading.Update(msg)
			return m, cmd
		}
		return m, nil
	}

	if m.hasAccess {
		var cmd tea.Cmd
		m.child, cmd = m.child.Update(msg)
		return m, cmd
	}

	if m.fallback != nil {
		var cmd tea.Cmd
		m.fallback, cmd = m.fallback.Update(msg)
		return m, cmd
	}

	return m, nil
}

// View renders the LicenseGate.
func (m *LicenseGate) View() string {
	if m.isLoading {
		if m.loading != nil {
			return m.loading.View()
		}
		return m.styles.Muted.Render("Checking license...")
	}

	if m.hasAccess {
		return m.child.View()
	}

	if m.fallback != nil {
		return m.fallback.View()
	}

	return m.renderAccessDenied()
}

func (m *LicenseGate) renderAccessDenied() string {
	if m.config.Feature != "" {
		return m.styles.BoxWarning.Render(
			m.styles.Warning.Render(Lock+" Feature Required") + "\n\n" +
				m.styles.Body.Render("The \""+m.config.Feature+"\" feature requires a valid license.") + "\n" +
				m.styles.Muted.Render("Please upgrade to access this feature."),
		)
	}

	return m.styles.BoxWarning.Render(
		m.styles.Warning.Render(Lock+" License Required") + "\n\n" +
			m.styles.Body.Render("A valid license is required to access this application.") + "\n" +
			m.styles.Muted.Render("Please purchase a license to continue."),
	)
}

func (m *LicenseGate) checkAccess(result *tuish.LicenseCheckResult) bool {
	if m.config.Feature != "" {
		// Feature-based gating
		return m.hasFeature(result, m.config.Feature)
	}

	if m.config.RequireLicense {
		// Any valid license required
		return result.Valid
	}

	// No gating specified, allow access
	return true
}

func (m *LicenseGate) hasFeature(result *tuish.LicenseCheckResult, feature string) bool {
	if result == nil || result.License == nil {
		return false
	}

	for _, f := range result.License.Features {
		if f == feature {
			return true
		}
	}
	return false
}

func (m *LicenseGate) checkLicense() tea.Msg {
	result, err := m.sdk.CheckLicense(nil)
	return LicenseCheckedMsg{Result: result, Error: err}
}

// HasAccess returns whether access is currently granted.
func (m *LicenseGate) HasAccess() bool {
	return m.hasAccess
}

// IsLoading returns whether the component is loading.
func (m *LicenseGate) IsLoading() bool {
	return m.isLoading
}

// Result returns the current license check result.
func (m *LicenseGate) Result() *tuish.LicenseCheckResult {
	return m.result
}

// Child returns the wrapped child model.
func (m *LicenseGate) Child() tea.Model {
	return m.child
}

// Refresh triggers a license refresh.
func (m *LicenseGate) Refresh() tea.Cmd {
	m.isLoading = true
	return m.checkLicense
}

// SimpleLicenseGate provides a simpler interface for gating without a full Bubble Tea model.
// It checks the license synchronously and returns access status.
type SimpleLicenseGate struct {
	sdk     *tuish.SDK
	feature string
}

// NewSimpleLicenseGate creates a simple license gate for synchronous checks.
func NewSimpleLicenseGate(sdk *tuish.SDK, feature ...string) *SimpleLicenseGate {
	f := ""
	if len(feature) > 0 {
		f = feature[0]
	}
	return &SimpleLicenseGate{sdk: sdk, feature: f}
}

// Check performs a synchronous license check and returns access status.
func (g *SimpleLicenseGate) Check() (hasAccess bool, result *tuish.LicenseCheckResult, err error) {
	result, err = g.sdk.CheckLicense(nil)
	if err != nil {
		return false, nil, err
	}

	if g.feature != "" {
		// Check for specific feature
		if result.License != nil {
			for _, f := range result.License.Features {
				if f == g.feature {
					return true, result, nil
				}
			}
		}
		return false, result, nil
	}

	// Just check for valid license
	return result.Valid, result, nil
}

// HasFeature checks if the current license has a specific feature.
func HasFeature(sdk *tuish.SDK, feature string) bool {
	result, err := sdk.CheckLicense(nil)
	if err != nil || result == nil || result.License == nil {
		return false
	}

	for _, f := range result.License.Features {
		if f == feature {
			return true
		}
	}
	return false
}

// IsLicensed checks if the current license is valid.
func IsLicensed(sdk *tuish.SDK) bool {
	result, err := sdk.CheckLicense(nil)
	if err != nil {
		return false
	}
	return result.Valid
}
