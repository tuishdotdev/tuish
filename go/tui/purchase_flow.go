package tui

import (
	"context"
	"fmt"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	tuish "github.com/tuishdotdev/tuish/go"
)

// PurchaseFlowStep represents the current step in the purchase flow.
type PurchaseFlowStep int

const (
	PurchaseStepIdle PurchaseFlowStep = iota
	PurchaseStepCreating
	PurchaseStepWaiting
	PurchaseStepSuccess
	PurchaseStepError
	PurchaseStepCancelled
)

// PurchaseFlowConfig contains configuration for the PurchaseFlow component.
type PurchaseFlowConfig struct {
	// Email is pre-filled for checkout.
	Email string

	// ShowQRCode enables QR code display (default: true).
	ShowQRCode bool

	// PollInterval is the checkout polling interval (default: 2s).
	PollInterval time.Duration

	// Timeout is the checkout timeout (default: 10m).
	Timeout time.Duration

	// OnComplete is called when purchase completes.
	OnComplete func(*tuish.LicenseDetails)

	// OnCancel is called when user cancels.
	OnCancel func()

	// Styles allows custom styling.
	Styles *Styles
}

// DefaultPurchaseFlowConfig returns the default configuration.
func DefaultPurchaseFlowConfig() PurchaseFlowConfig {
	return PurchaseFlowConfig{
		ShowQRCode:   true,
		PollInterval: 2 * time.Second,
		Timeout:      10 * time.Minute,
	}
}

// PurchaseFlow manages the complete purchase flow with QR code and polling.
type PurchaseFlow struct {
	sdk    *tuish.SDK
	config PurchaseFlowConfig
	styles Styles

	step           PurchaseFlowStep
	sessionID      string
	checkoutURL    string
	license        *tuish.LicenseDetails
	err            error
	retryable      bool
	elapsedSeconds int
	spinnerFrame   int
	qrCode         *QRCode

	// For polling
	ctx        context.Context
	cancelFunc context.CancelFunc
}

// NewPurchaseFlow creates a new PurchaseFlow component.
func NewPurchaseFlow(sdk *tuish.SDK, config ...PurchaseFlowConfig) *PurchaseFlow {
	cfg := DefaultPurchaseFlowConfig()
	if len(config) > 0 {
		cfg = config[0]
	}

	styles := DefaultStyles()
	if cfg.Styles != nil {
		styles = *cfg.Styles
	}

	return &PurchaseFlow{
		sdk:    sdk,
		config: cfg,
		styles: styles,
		step:   PurchaseStepIdle,
	}
}

// Init starts the purchase flow.
func (m *PurchaseFlow) Init() tea.Cmd {
	return m.start()
}

// Update handles messages for the PurchaseFlow.
func (m *PurchaseFlow) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case CheckoutSessionCreatedMsg:
		if msg.Error != nil {
			m.step = PurchaseStepError
			m.err = msg.Error
			m.retryable = true
			return m, nil
		}

		m.step = PurchaseStepWaiting
		m.sessionID = msg.Session.SessionID
		m.checkoutURL = msg.Session.CheckoutURL

		// Create QR code
		m.qrCode = NewQRCode(m.checkoutURL, QRCodeConfig{
			URLOnly: !m.config.ShowQRCode,
		})

		// Start polling and timer
		return m, tea.Batch(
			m.qrCode.Init(),
			m.pollCheckout(),
			m.tickSpinner(),
			m.tickElapsed(),
		)

	case CheckoutStatusMsg:
		if msg.Completed {
			if msg.License != nil {
				m.step = PurchaseStepSuccess
				m.license = msg.License
				if m.config.OnComplete != nil {
					m.config.OnComplete(msg.License)
				}
				return m, nil
			}
			// Timeout or expired
			m.step = PurchaseStepError
			m.err = fmt.Errorf("checkout session expired")
			m.retryable = true
			return m, nil
		}

		if msg.Error != nil {
			// Continue polling on error
			return m, tea.Tick(m.config.PollInterval, func(t time.Time) tea.Msg {
				return m.doPoll()
			})
		}

		// Continue polling
		return m, tea.Tick(m.config.PollInterval, func(t time.Time) tea.Msg {
			return m.doPoll()
		})

	case SpinnerTickMsg:
		if m.step == PurchaseStepWaiting {
			m.spinnerFrame = (m.spinnerFrame + 1) % len(SpinnerFrames)
			return m, m.tickSpinner()
		}

	case ElapsedTickMsg:
		if m.step == PurchaseStepWaiting {
			m.elapsedSeconds++
			if time.Duration(m.elapsedSeconds)*time.Second >= m.config.Timeout {
				m.step = PurchaseStepError
				m.err = fmt.Errorf("checkout timed out")
				m.retryable = true
				return m, nil
			}
			return m, m.tickElapsed()
		}

	case QRGeneratedMsg:
		if m.qrCode != nil {
			m.qrCode.Update(msg)
		}

	case tea.KeyMsg:
		switch msg.String() {
		case KeyEscape, KeyQ:
			if m.step == PurchaseStepWaiting || m.step == PurchaseStepCreating {
				return m, m.cancel()
			}
		case KeyR:
			if (m.step == PurchaseStepError && m.retryable) || m.step == PurchaseStepCancelled {
				return m, m.start()
			}
		}

	case CheckoutCancelledMsg:
		m.step = PurchaseStepCancelled
		if m.config.OnCancel != nil {
			m.config.OnCancel()
		}
	}

	return m, nil
}

// View renders the PurchaseFlow component.
func (m *PurchaseFlow) View() string {
	switch m.step {
	case PurchaseStepIdle:
		return m.renderIdle()
	case PurchaseStepCreating:
		return m.renderCreating()
	case PurchaseStepWaiting:
		return m.renderWaiting()
	case PurchaseStepSuccess:
		return m.renderSuccess()
	case PurchaseStepError:
		return m.renderError()
	case PurchaseStepCancelled:
		return m.renderCancelled()
	default:
		return ""
	}
}

func (m *PurchaseFlow) renderIdle() string {
	return m.styles.BoxFocused.Render(
		m.styles.Highlight.Render("Initializing..."),
	)
}

func (m *PurchaseFlow) renderCreating() string {
	content := lipgloss.JoinVertical(
		lipgloss.Left,
		m.styles.BoxHeader.Render("CHECKOUT"),
		"",
		SpinnerFrames[m.spinnerFrame]+" Setting up secure checkout...",
	)

	return m.styles.BoxFocused.Render(content)
}

func (m *PurchaseFlow) renderWaiting() string {
	var sb strings.Builder

	// Header
	header := m.styles.BannerInfo.Render(CreditCard + " COMPLETE YOUR PURCHASE")
	sb.WriteString(header)
	sb.WriteString("\n\n")

	// Instructions
	instructions := []string{
		CircleNumber1 + " Scan the QR code with your phone",
		CircleNumber2 + " Complete payment in your browser",
		CircleNumber3 + " Return here - we'll detect it automatically",
	}
	for _, inst := range instructions {
		sb.WriteString(m.styles.Body.Render(inst))
		sb.WriteString("\n")
	}
	sb.WriteString("\n")

	// QR Code
	if m.qrCode != nil {
		qrBox := m.styles.Box.Render(m.qrCode.View())
		sb.WriteString(qrBox)
		sb.WriteString("\n\n")
	}

	// Status bar
	spinner := SpinnerFrames[m.spinnerFrame]
	elapsed := m.formatTime(m.elapsedSeconds)
	progress := float64(m.elapsedSeconds%30) / 30.0

	statusLine := lipgloss.JoinHorizontal(
		lipgloss.Top,
		spinner+" Waiting for payment ",
		m.styles.Muted.Render(BulletPoint+" "),
		m.styles.Highlight.Render(elapsed),
	)
	sb.WriteString(statusLine)
	sb.WriteString("\n")

	// Progress bar
	progressBar := RenderProgressBar(progress, 40, m.styles)
	sb.WriteString(progressBar)
	sb.WriteString("\n\n")

	// Controls
	controls := RenderKeyHint("Esc", "Cancel", m.styles)
	sb.WriteString(controls)

	return sb.String()
}

func (m *PurchaseFlow) renderSuccess() string {
	var sb strings.Builder

	// Success banner
	banner := m.styles.BannerSuccess.Render(CheckMark + " PURCHASE SUCCESSFUL!")
	sb.WriteString(banner)
	sb.WriteString("\n\n")

	// License details box
	var details []string
	details = append(details, m.styles.Bold.Render("License Activated"))

	if m.license != nil {
		if m.license.ProductName != "" {
			details = append(details, "")
			details = append(details, m.styles.Muted.Render("Product: ")+m.styles.Body.Render(m.license.ProductName))
		}

		if len(m.license.Features) > 0 {
			details = append(details, "")
			details = append(details, m.styles.Muted.Render("Features unlocked:"))
			for _, f := range m.license.Features {
				details = append(details, m.styles.CheckMark.Render("")+m.styles.Body.Render(f))
			}
		}

		if m.license.ExpiresAt != nil {
			details = append(details, "")
			expiry := time.UnixMilli(*m.license.ExpiresAt).Format("Jan 2, 2006")
			details = append(details, m.styles.Muted.Render("Valid until: ")+m.styles.Body.Render(expiry))
		}
	}

	detailsBox := m.styles.BoxSuccess.Render(
		lipgloss.JoinVertical(lipgloss.Left, details...),
	)
	sb.WriteString(detailsBox)
	sb.WriteString("\n\n")

	// Thank you message
	sb.WriteString(m.styles.Success.Render("Thank you for your purchase! " + Celebration))

	return sb.String()
}

func (m *PurchaseFlow) renderError() string {
	var sb strings.Builder

	// Error banner
	banner := m.styles.BannerError.Render(CrossMark + " PURCHASE FAILED")
	sb.WriteString(banner)
	sb.WriteString("\n\n")

	// Error details
	errMsg := "An unexpected error occurred"
	if m.err != nil {
		errMsg = m.err.Error()
	}

	errBox := m.styles.BoxError.Render(
		m.styles.Bold.Render("Error Details:") + "\n\n" +
			m.styles.Body.Render(errMsg),
	)
	sb.WriteString(errBox)
	sb.WriteString("\n\n")

	// Controls
	var hints [][2]string
	if m.retryable {
		hints = append(hints, [2]string{"R", "Retry"})
	}
	hints = append(hints, [2]string{"Q", "Exit"})
	sb.WriteString(RenderKeyHints(hints, m.styles))

	return sb.String()
}

func (m *PurchaseFlow) renderCancelled() string {
	var sb strings.Builder

	// Warning box
	box := m.styles.BoxWarning.Render(
		m.styles.Warning.Render(WarningSign+" Purchase Cancelled"),
	)
	sb.WriteString(box)
	sb.WriteString("\n\n")

	// Controls
	hints := [][2]string{
		{"R", "Try Again"},
		{"Q", "Exit"},
	}
	sb.WriteString(RenderKeyHints(hints, m.styles))

	return sb.String()
}

func (m *PurchaseFlow) formatTime(seconds int) string {
	mins := seconds / 60
	secs := seconds % 60
	return fmt.Sprintf("%d:%02d", mins, secs)
}

func (m *PurchaseFlow) start() tea.Cmd {
	m.step = PurchaseStepCreating
	m.elapsedSeconds = 0
	m.spinnerFrame = 0
	m.err = nil
	m.retryable = false

	// Create cancellable context
	m.ctx, m.cancelFunc = context.WithTimeout(context.Background(), m.config.Timeout)

	return func() tea.Msg {
		session, err := m.sdk.PurchaseInBrowser(m.ctx, m.config.Email)
		return CheckoutSessionCreatedMsg{Session: session, Error: err}
	}
}

func (m *PurchaseFlow) cancel() tea.Cmd {
	if m.cancelFunc != nil {
		m.cancelFunc()
	}
	return func() tea.Msg {
		return CheckoutCancelledMsg{}
	}
}

func (m *PurchaseFlow) pollCheckout() tea.Cmd {
	return tea.Tick(m.config.PollInterval, func(t time.Time) tea.Msg {
		return m.doPoll()
	})
}

func (m *PurchaseFlow) doPoll() tea.Msg {
	if m.ctx == nil || m.sessionID == "" {
		return CheckoutStatusMsg{Error: fmt.Errorf("no active session")}
	}

	status, err := m.sdk.GetClient().GetCheckoutStatus(m.ctx, m.sessionID)
	if err != nil {
		return CheckoutStatusMsg{Error: err}
	}

	switch status.Status {
	case "complete":
		return CheckoutStatusMsg{
			Status:    status.Status,
			License:   status.License,
			Completed: true,
		}
	case "expired":
		return CheckoutStatusMsg{
			Status:    status.Status,
			Completed: true,
		}
	default:
		return CheckoutStatusMsg{Status: status.Status}
	}
}

func (m *PurchaseFlow) tickSpinner() tea.Cmd {
	return tea.Tick(100*time.Millisecond, func(t time.Time) tea.Msg {
		return SpinnerTickMsg{Time: t}
	})
}

func (m *PurchaseFlow) tickElapsed() tea.Cmd {
	return tea.Tick(time.Second, func(t time.Time) tea.Msg {
		return ElapsedTickMsg{Elapsed: time.Duration(m.elapsedSeconds+1) * time.Second}
	})
}

// Step returns the current step in the purchase flow.
func (m *PurchaseFlow) Step() PurchaseFlowStep {
	return m.step
}

// License returns the purchased license (if successful).
func (m *PurchaseFlow) License() *tuish.LicenseDetails {
	return m.license
}

// Error returns the current error (if any).
func (m *PurchaseFlow) Error() error {
	return m.err
}

// IsComplete returns whether the purchase flow has completed (success, error, or cancelled).
func (m *PurchaseFlow) IsComplete() bool {
	return m.step == PurchaseStepSuccess || m.step == PurchaseStepError || m.step == PurchaseStepCancelled
}

// IsSuccess returns whether the purchase was successful.
func (m *PurchaseFlow) IsSuccess() bool {
	return m.step == PurchaseStepSuccess
}

// Retry restarts the purchase flow.
func (m *PurchaseFlow) Retry() tea.Cmd {
	return m.start()
}
