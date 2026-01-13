package tui

import (
	"os"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	qrcode "github.com/skip2/go-qrcode"
)

// QRCodeConfig contains configuration for the QRCode component.
type QRCodeConfig struct {
	// URLOnly forces URL-only display (no QR code).
	URLOnly bool

	// MinWidth is the minimum terminal width to display QR code.
	// Falls back to URL-only if terminal is narrower.
	MinWidth int

	// Styles allows custom styling.
	Styles *Styles
}

// DefaultQRCodeConfig returns the default configuration.
func DefaultQRCodeConfig() QRCodeConfig {
	return QRCodeConfig{
		URLOnly:  false,
		MinWidth: 50,
	}
}

// QRCode renders a QR code in the terminal.
type QRCode struct {
	value    string
	config   QRCodeConfig
	styles   Styles
	qrString string
	canFit   bool
	err      error
	loading  bool
}

// NewQRCode creates a new QRCode component.
func NewQRCode(value string, config ...QRCodeConfig) *QRCode {
	cfg := DefaultQRCodeConfig()
	if len(config) > 0 {
		cfg = config[0]
	}

	styles := DefaultStyles()
	if cfg.Styles != nil {
		styles = *cfg.Styles
	}

	return &QRCode{
		value:   value,
		config:  cfg,
		styles:  styles,
		loading: true,
	}
}

// Init initializes the QRCode component.
func (m *QRCode) Init() tea.Cmd {
	return m.generateQR
}

// Update handles messages for the QRCode component.
func (m *QRCode) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case QRGeneratedMsg:
		m.loading = false
		m.qrString = msg.QRString
		m.canFit = msg.CanFit
		m.err = msg.Error
		return m, nil

	case tea.WindowSizeMsg:
		// Re-check if QR fits on resize
		m.canFit = msg.Width >= m.config.MinWidth
		return m, nil
	}

	return m, nil
}

// View renders the QRCode component.
func (m *QRCode) View() string {
	if m.loading {
		return m.styles.Muted.Render("Generating QR code...")
	}

	if m.err != nil {
		return lipgloss.JoinVertical(
			lipgloss.Left,
			m.styles.Error.Render("QR Error: "+m.err.Error()),
			m.styles.Link.Render(m.value),
		)
	}

	if m.config.URLOnly || !m.canFit || m.qrString == "" {
		return m.renderURLOnly()
	}

	return m.renderWithQR()
}

func (m *QRCode) renderURLOnly() string {
	return lipgloss.JoinVertical(
		lipgloss.Left,
		m.styles.Muted.Render("Scan or visit:"),
		m.styles.Link.Render(m.value),
	)
}

func (m *QRCode) renderWithQR() string {
	return lipgloss.JoinVertical(
		lipgloss.Left,
		m.qrString,
		"",
		m.styles.Muted.Render("Or visit: ")+m.styles.Link.Render(m.value),
	)
}

func (m *QRCode) generateQR() tea.Msg {
	// Check terminal width
	width := getTerminalWidth()
	canFit := width >= m.config.MinWidth

	if m.config.URLOnly || !canFit {
		return QRGeneratedMsg{CanFit: false}
	}

	qr, err := generateQRMatrix(m.value)
	if err != nil {
		return QRGeneratedMsg{Error: err, CanFit: false}
	}

	return QRGeneratedMsg{
		QRString: qr,
		CanFit:   true,
	}
}

// SetValue updates the QR code value.
func (m *QRCode) SetValue(value string) tea.Cmd {
	m.value = value
	m.loading = true
	return m.generateQR
}

// getTerminalWidth returns the terminal width, defaulting to 80 if unknown.
func getTerminalWidth() int {
	// Use os.Stdout.Fd() to get terminal size
	// For now, return a reasonable default
	// In a real implementation, use golang.org/x/term
	width := 80
	if w, ok := os.LookupEnv("COLUMNS"); ok {
		var cols int
		if _, err := strings.NewReader(w).Read([]byte{byte(cols)}); err == nil {
			width = cols
		}
	}
	return width
}

// generateQRMatrix generates a QR code as a string using Unicode half-blocks.
func generateQRMatrix(text string) (string, error) {
	// Generate QR code with low error correction for smaller size
	qr, err := qrcode.New(text, qrcode.Low)
	if err != nil {
		return "", err
	}

	// Disable border for tighter rendering
	qr.DisableBorder = true

	// Get the bitmap
	bitmap := qr.Bitmap()
	size := len(bitmap)

	// Use Unicode half-block characters for 2:1 aspect ratio
	// Upper half block: \u2580 (▀)
	// Lower half block: \u2584 (▄)
	// Full block: \u2588 (█)
	// Light shade (for background): use space

	const (
		upperHalf = "▀"
		lowerHalf = "▄"
		fullBlock = "█"
		empty     = " "
	)

	var sb strings.Builder

	// White border on top (one row of spaces with full blocks pattern)
	borderWidth := size + 4
	sb.WriteString(strings.Repeat(empty, borderWidth))
	sb.WriteString("\n")

	// Process two rows at a time for half-block rendering
	for y := 0; y < size; y += 2 {
		// Left border
		sb.WriteString(empty + empty)

		for x := 0; x < size; x++ {
			upper := bitmap[y][x]
			lower := false
			if y+1 < size {
				lower = bitmap[y+1][x]
			}

			// QR codes: true = black (module), false = white (background)
			// We want black modules to show, white to be empty
			if upper && lower {
				sb.WriteString(fullBlock)
			} else if upper && !lower {
				sb.WriteString(upperHalf)
			} else if !upper && lower {
				sb.WriteString(lowerHalf)
			} else {
				sb.WriteString(empty)
			}
		}

		// Right border
		sb.WriteString(empty + empty)
		sb.WriteString("\n")
	}

	// White border on bottom
	sb.WriteString(strings.Repeat(empty, borderWidth))

	return sb.String(), nil
}

// RenderQRCode generates and returns a QR code string for the given URL.
// This is a helper function for use outside of Bubble Tea models.
func RenderQRCode(url string, styles ...Styles) string {
	s := DefaultStyles()
	if len(styles) > 0 {
		s = styles[0]
	}

	qr, err := generateQRMatrix(url)
	if err != nil {
		return lipgloss.JoinVertical(
			lipgloss.Left,
			s.Muted.Render("Scan or visit:"),
			s.Link.Render(url),
		)
	}

	return lipgloss.JoinVertical(
		lipgloss.Left,
		qr,
		"",
		s.Muted.Render("Or visit: ")+s.Link.Render(url),
	)
}

// CanFitQRCode checks if a QR code would fit in the given terminal width.
func CanFitQRCode(url string, terminalWidth int) bool {
	qr, err := qrcode.New(url, qrcode.Low)
	if err != nil {
		return false
	}

	// QR code width + borders
	qrWidth := len(qr.Bitmap()) + 4
	return terminalWidth >= qrWidth
}
