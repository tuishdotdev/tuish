package tui

import (
	"fmt"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	tuish "github.com/tuishdotdev/tuish/go"
)

// LicenseStatusConfig contains configuration for the LicenseStatus component.
type LicenseStatusConfig struct {
	// ShowFeatures displays the list of enabled features (default: true).
	ShowFeatures bool

	// ShowExpiry displays the expiration date (default: true).
	ShowExpiry bool

	// Compact uses single-line display mode.
	Compact bool

	// Styles allows custom styling (uses DefaultStyles if nil).
	Styles *Styles
}

// DefaultLicenseStatusConfig returns the default configuration.
func DefaultLicenseStatusConfig() LicenseStatusConfig {
	return LicenseStatusConfig{
		ShowFeatures: true,
		ShowExpiry:   true,
		Compact:      false,
	}
}

// LicenseStatus displays the current license status.
type LicenseStatus struct {
	sdk         *tuish.SDK
	config      LicenseStatusConfig
	styles      Styles
	result      *tuish.LicenseCheckResult
	loading     bool
	offlineMode bool
	err         error
}

// NewLicenseStatus creates a new LicenseStatus component.
func NewLicenseStatus(sdk *tuish.SDK, config ...LicenseStatusConfig) *LicenseStatus {
	cfg := DefaultLicenseStatusConfig()
	if len(config) > 0 {
		cfg = config[0]
	}

	styles := DefaultStyles()
	if cfg.Styles != nil {
		styles = *cfg.Styles
	}

	return &LicenseStatus{
		sdk:     sdk,
		config:  cfg,
		styles:  styles,
		loading: true,
	}
}

// Init initializes the component by checking the license.
func (m *LicenseStatus) Init() tea.Cmd {
	return m.checkLicense
}

// Update handles messages for the LicenseStatus component.
func (m *LicenseStatus) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case LicenseCheckedMsg:
		m.loading = false
		if msg.Error != nil {
			m.err = msg.Error
			m.offlineMode = true
		} else {
			m.result = msg.Result
			m.offlineMode = !msg.Result.OfflineVerified
		}
		return m, nil

	case tea.KeyMsg:
		switch msg.String() {
		case KeyR:
			m.loading = true
			return m, m.checkLicense
		}
	}

	return m, nil
}

// View renders the LicenseStatus component.
func (m *LicenseStatus) View() string {
	if m.loading {
		return m.styles.Muted.Render("Checking license...")
	}

	if m.err != nil {
		return m.styles.Error.Render(fmt.Sprintf("Error: %v", m.err))
	}

	if m.result == nil || m.result.License == nil {
		return m.renderNoLicense()
	}

	if m.config.Compact {
		return m.renderCompact()
	}

	return m.renderFull()
}

func (m *LicenseStatus) renderNoLicense() string {
	return lipgloss.JoinHorizontal(
		lipgloss.Top,
		m.styles.Warning.Render(WarningSign+" "),
		m.styles.Warning.Render("No license"),
	)
}

func (m *LicenseStatus) renderCompact() string {
	license := m.result.License
	isValid := m.result.Valid

	var status string
	var statusStyle lipgloss.Style
	if isValid {
		status = CheckMark
		statusStyle = m.styles.StatusValid
	} else {
		status = CrossMark
		statusStyle = m.styles.StatusInvalid
	}

	name := license.ProductName
	if name == "" {
		name = "Licensed"
	}

	featureCount := len(license.Features)
	featureText := fmt.Sprintf("%d feature", featureCount)
	if featureCount != 1 {
		featureText += "s"
	}

	offlineIndicator := ""
	if m.offlineMode {
		offlineIndicator = " (offline)"
	}

	return lipgloss.JoinHorizontal(
		lipgloss.Top,
		statusStyle.Render(status),
		" ",
		m.styles.Body.Render(fmt.Sprintf("%s %s %s%s", name, BulletPoint, featureText, offlineIndicator)),
	)
}

func (m *LicenseStatus) renderFull() string {
	license := m.result.License
	isValid := m.result.Valid

	var lines []string

	// Status line with icon
	var statusIcon, statusText string
	var statusStyle lipgloss.Style
	if isValid {
		statusIcon = CheckMark
		statusStyle = m.styles.StatusValid
	} else {
		statusIcon = CrossMark
		statusStyle = m.styles.StatusInvalid
	}

	name := license.ProductName
	if name == "" {
		name = "License"
	}

	statusLine := lipgloss.JoinHorizontal(
		lipgloss.Top,
		statusStyle.Render(statusIcon),
		" ",
		m.styles.Bold.Render(name),
	)
	if m.offlineMode {
		statusLine = lipgloss.JoinHorizontal(lipgloss.Top, statusLine, " ", m.styles.Muted.Render("(offline)"))
	}
	lines = append(lines, statusLine)

	// Status detail
	statusText = string(license.Status)
	var statusColor lipgloss.Style
	switch license.Status {
	case tuish.LicenseStatusActive:
		statusColor = m.styles.Success
	case tuish.LicenseStatusExpired:
		statusColor = m.styles.Error
	case tuish.LicenseStatusRevoked:
		statusColor = m.styles.Error
	default:
		statusColor = m.styles.Muted
	}

	lines = append(lines, lipgloss.JoinHorizontal(
		lipgloss.Top,
		m.styles.Muted.Render("Status: "),
		statusColor.Render(statusText),
	))

	// Features
	if m.config.ShowFeatures && len(license.Features) > 0 {
		lines = append(lines, m.styles.Muted.Render("Features:"))
		for _, feature := range license.Features {
			lines = append(lines, m.styles.ListItem.Render(BulletPoint+" "+feature))
		}
	}

	// Expiry
	if m.config.ShowExpiry {
		expiryText := m.formatExpiry(license.ExpiresAt)
		lines = append(lines, lipgloss.JoinHorizontal(
			lipgloss.Top,
			m.styles.Muted.Render("Expires: "),
			m.styles.Body.Render(expiryText),
		))
	}

	return lipgloss.JoinVertical(lipgloss.Left, lines...)
}

func (m *LicenseStatus) formatExpiry(timestamp *int64) string {
	if timestamp == nil {
		return "Never"
	}

	t := time.UnixMilli(*timestamp)
	return t.Format("Jan 2, 2006")
}

func (m *LicenseStatus) checkLicense() tea.Msg {
	result, err := m.sdk.CheckLicense(nil)
	return LicenseCheckedMsg{Result: result, Error: err}
}

// Result returns the current license check result.
func (m *LicenseStatus) Result() *tuish.LicenseCheckResult {
	return m.result
}

// IsValid returns whether the license is valid.
func (m *LicenseStatus) IsValid() bool {
	return m.result != nil && m.result.Valid
}

// IsLoading returns whether the component is loading.
func (m *LicenseStatus) IsLoading() bool {
	return m.loading
}

// Refresh triggers a license refresh.
func (m *LicenseStatus) Refresh() tea.Cmd {
	m.loading = true
	return m.checkLicense
}

// RenderLicenseStatus is a helper function to render license status as a string
// without needing the full Bubble Tea model.
func RenderLicenseStatus(result *tuish.LicenseCheckResult, config ...LicenseStatusConfig) string {
	cfg := DefaultLicenseStatusConfig()
	if len(config) > 0 {
		cfg = config[0]
	}

	styles := DefaultStyles()
	if cfg.Styles != nil {
		styles = *cfg.Styles
	}

	if result == nil || result.License == nil {
		return styles.Warning.Render(WarningSign + " No license")
	}

	license := result.License

	if cfg.Compact {
		// Compact mode
		var status string
		var statusStyle lipgloss.Style
		if result.Valid {
			status = CheckMark
			statusStyle = styles.StatusValid
		} else {
			status = CrossMark
			statusStyle = styles.StatusInvalid
		}

		name := license.ProductName
		if name == "" {
			name = "Licensed"
		}

		featureCount := len(license.Features)
		featureText := fmt.Sprintf("%d feature", featureCount)
		if featureCount != 1 {
			featureText += "s"
		}

		return statusStyle.Render(status) + " " + styles.Body.Render(name+" "+BulletPoint+" "+featureText)
	}

	// Full mode
	var sb strings.Builder

	// Status line
	var statusIcon string
	var statusStyle lipgloss.Style
	if result.Valid {
		statusIcon = CheckMark
		statusStyle = styles.StatusValid
	} else {
		statusIcon = CrossMark
		statusStyle = styles.StatusInvalid
	}

	name := license.ProductName
	if name == "" {
		name = "License"
	}

	sb.WriteString(statusStyle.Render(statusIcon) + " " + styles.Bold.Render(name) + "\n")

	// Status detail
	var statusColor lipgloss.Style
	switch license.Status {
	case tuish.LicenseStatusActive:
		statusColor = styles.Success
	default:
		statusColor = styles.Error
	}
	sb.WriteString(styles.Muted.Render("Status: ") + statusColor.Render(string(license.Status)) + "\n")

	// Features
	if cfg.ShowFeatures && len(license.Features) > 0 {
		sb.WriteString(styles.Muted.Render("Features:") + "\n")
		for _, feature := range license.Features {
			sb.WriteString(styles.ListItem.Render(BulletPoint+" "+feature) + "\n")
		}
	}

	// Expiry
	if cfg.ShowExpiry {
		var expiryText string
		if license.ExpiresAt == nil {
			expiryText = "Never"
		} else {
			expiryText = time.UnixMilli(*license.ExpiresAt).Format("Jan 2, 2006")
		}
		sb.WriteString(styles.Muted.Render("Expires: ") + styles.Body.Render(expiryText))
	}

	return sb.String()
}
