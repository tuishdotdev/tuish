package tui

import (
	"github.com/charmbracelet/lipgloss"
)

// Theme contains the color scheme for TUI components.
// Based on the Tuish brand aesthetic (Dracula-inspired).
type Theme struct {
	// Primary colors
	Primary   lipgloss.Color // Green accent
	Secondary lipgloss.Color // Cyan
	Accent    lipgloss.Color // Magenta

	// Status colors
	Success lipgloss.Color // Green
	Warning lipgloss.Color // Yellow/Orange
	Error   lipgloss.Color // Red

	// Text colors
	Text     lipgloss.Color // Off-white
	Muted    lipgloss.Color // Dim gray
	Inverted lipgloss.Color // Dark for inverted text

	// Border colors
	Border      lipgloss.Color // Subtle border
	BorderFocus lipgloss.Color // Focused/active border
}

// DefaultTheme provides the Tuish brand color scheme.
// Matches the docs landing page aesthetic.
var DefaultTheme = Theme{
	Primary:   lipgloss.Color("#50fa7b"), // Tuish green
	Secondary: lipgloss.Color("#8be9fd"), // Cyan
	Accent:    lipgloss.Color("#ff79c6"), // Magenta

	Success: lipgloss.Color("#50fa7b"), // Green
	Warning: lipgloss.Color("#ffb86c"), // Orange
	Error:   lipgloss.Color("#ff6b6b"), // Red

	Text:     lipgloss.Color("#e8e8e8"), // Off-white
	Muted:    lipgloss.Color("#6272a4"), // Muted purple-gray
	Inverted: lipgloss.Color("#0a0a0f"), // Almost black

	Border:      lipgloss.Color("#44475a"), // Subtle border
	BorderFocus: lipgloss.Color("#50fa7b"), // Green focus
}

// Styles contains pre-configured styles for TUI components.
type Styles struct {
	Theme Theme

	// Text styles
	Title     lipgloss.Style
	Subtitle  lipgloss.Style
	Body      lipgloss.Style
	Muted     lipgloss.Style
	Bold      lipgloss.Style
	Highlight lipgloss.Style
	Success   lipgloss.Style
	Warning   lipgloss.Style
	Error     lipgloss.Style
	Link      lipgloss.Style

	// Box styles (sharp corners to match brand)
	Box        lipgloss.Style
	BoxFocused lipgloss.Style
	BoxSuccess lipgloss.Style
	BoxWarning lipgloss.Style
	BoxError   lipgloss.Style
	BoxHeader  lipgloss.Style

	// List styles
	ListItem       lipgloss.Style
	ListItemActive lipgloss.Style
	Bullet         lipgloss.Style
	CheckMark      lipgloss.Style
	CrossMark      lipgloss.Style

	// Status indicators
	StatusValid   lipgloss.Style
	StatusInvalid lipgloss.Style
	StatusPending lipgloss.Style

	// Keyboard hints
	KeyHint  lipgloss.Style
	KeyLabel lipgloss.Style

	// Banner styles
	BannerSuccess lipgloss.Style
	BannerError   lipgloss.Style
	BannerInfo    lipgloss.Style

	// Prompt style
	Prompt lipgloss.Style
}

// DefaultStyles returns the default styled components.
func DefaultStyles() Styles {
	return NewStyles(DefaultTheme)
}

// NewStyles creates a new Styles instance with the given theme.
func NewStyles(theme Theme) Styles {
	return Styles{
		Theme: theme,

		// Text styles
		Title: lipgloss.NewStyle().
			Bold(true).
			Foreground(theme.Primary),

		Subtitle: lipgloss.NewStyle().
			Foreground(theme.Muted),

		Body: lipgloss.NewStyle().
			Foreground(theme.Text),

		Muted: lipgloss.NewStyle().
			Foreground(theme.Muted),

		Bold: lipgloss.NewStyle().
			Bold(true).
			Foreground(theme.Text),

		Highlight: lipgloss.NewStyle().
			Bold(true).
			Foreground(theme.Primary),

		Success: lipgloss.NewStyle().
			Foreground(theme.Success),

		Warning: lipgloss.NewStyle().
			Foreground(theme.Warning),

		Error: lipgloss.NewStyle().
			Foreground(theme.Error),

		Link: lipgloss.NewStyle().
			Underline(true).
			Foreground(theme.Secondary),

		// Box styles - using normal border (sharp corners)
		Box: lipgloss.NewStyle().
			Border(lipgloss.NormalBorder()).
			BorderForeground(theme.Border).
			Padding(1, 2),

		BoxFocused: lipgloss.NewStyle().
			Border(lipgloss.NormalBorder()).
			BorderForeground(theme.BorderFocus).
			Padding(1, 2),

		BoxSuccess: lipgloss.NewStyle().
			Border(lipgloss.NormalBorder()).
			BorderForeground(theme.Success).
			Padding(1, 2),

		BoxWarning: lipgloss.NewStyle().
			Border(lipgloss.NormalBorder()).
			BorderForeground(theme.Warning).
			Padding(1, 2),

		BoxError: lipgloss.NewStyle().
			Border(lipgloss.NormalBorder()).
			BorderForeground(theme.Error).
			Padding(1, 2),

		BoxHeader: lipgloss.NewStyle().
			Bold(true).
			Foreground(theme.Primary).
			MarginBottom(1),

		// List styles
		ListItem: lipgloss.NewStyle().
			PaddingLeft(2).
			Foreground(theme.Text),

		ListItemActive: lipgloss.NewStyle().
			PaddingLeft(2).
			Bold(true).
			Foreground(theme.Primary),

		Bullet: lipgloss.NewStyle().
			Foreground(theme.Muted).
			SetString(BulletPoint + " "),

		CheckMark: lipgloss.NewStyle().
			Foreground(theme.Success).
			SetString(CheckMark + " "),

		CrossMark: lipgloss.NewStyle().
			Foreground(theme.Error).
			SetString(CrossMark + " "),

		// Status indicators
		StatusValid: lipgloss.NewStyle().
			Bold(true).
			Foreground(theme.Success),

		StatusInvalid: lipgloss.NewStyle().
			Bold(true).
			Foreground(theme.Error),

		StatusPending: lipgloss.NewStyle().
			Foreground(theme.Muted),

		// Keyboard hints
		KeyHint: lipgloss.NewStyle().
			Foreground(theme.Muted),

		KeyLabel: lipgloss.NewStyle().
			Bold(true).
			Foreground(theme.Secondary),

		// Banner styles
		BannerSuccess: lipgloss.NewStyle().
			Bold(true).
			Foreground(theme.Inverted).
			Background(theme.Success).
			Padding(0, 2).
			MarginBottom(1),

		BannerError: lipgloss.NewStyle().
			Bold(true).
			Foreground(theme.Inverted).
			Background(theme.Error).
			Padding(0, 2).
			MarginBottom(1),

		BannerInfo: lipgloss.NewStyle().
			Bold(true).
			Foreground(theme.Inverted).
			Background(theme.Primary).
			Padding(0, 2).
			MarginBottom(1),

		// Terminal prompt style
		Prompt: lipgloss.NewStyle().
			Bold(true).
			Foreground(theme.Primary).
			SetString("$ "),
	}
}

// Unicode symbols used in UI
const (
	CheckMark    = "\u2713" // ✓
	CrossMark    = "\u2717" // ✗
	BulletPoint  = "\u2022" // •
	ArrowRight   = "\u2192" // →
	ArrowLeft    = "\u2190" // ←
	WarningSign  = "\u26A0" // ⚠
	InfoSign     = "\u2139" // ℹ
	PointerRight = "\u25B8" // ▸
	PointerDown  = "\u25BE" // ▾

	// Additional symbols
	CircleNumber1 = "\u2460" // ①
	CircleNumber2 = "\u2461" // ②
	CircleNumber3 = "\u2462" // ③
	CreditCard    = "\U0001F4B3" // 💳
	Celebration   = "\U0001F389" // 🎉
	Lock          = "\U0001F512" // 🔒
	Unlock        = "\U0001F513" // 🔓
	Key           = "\U0001F511" // 🔑
	ShoppingCart  = "\U0001F6D2" // 🛒
	Clipboard     = "\U0001F4CB" // 📋
	Trash         = "\U0001F5D1" // 🗑
	Wave          = "\U0001F44B" // 👋
)

// SpinnerFrames contains the frames for the spinner animation.
var SpinnerFrames = []string{"⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"}

// ProgressBarChars contains characters for progress bar rendering.
var ProgressBarChars = struct {
	Full  string
	Empty string
	Left  string
	Right string
}{
	Full:  "█",
	Empty: "░",
	Left:  "",
	Right: "",
}

// RenderProgressBar renders a progress bar with the given width and progress (0-1).
func RenderProgressBar(progress float64, width int, styles Styles) string {
	if width < 4 {
		width = 4
	}

	filled := int(progress * float64(width))
	if filled > width {
		filled = width
	}
	if filled < 0 {
		filled = 0
	}

	bar := ""
	for i := 0; i < width; i++ {
		if i < filled {
			bar += ProgressBarChars.Full
		} else {
			bar += ProgressBarChars.Empty
		}
	}

	return styles.Highlight.Render(bar)
}

// RenderKeyHint renders a keyboard shortcut hint like "[Esc] Cancel".
func RenderKeyHint(key, label string, styles Styles) string {
	return styles.KeyLabel.Render("["+key+"]") + " " + styles.KeyHint.Render(label)
}

// RenderKeyHints renders multiple keyboard hints separated by spaces.
func RenderKeyHints(hints [][2]string, styles Styles) string {
	result := ""
	for i, hint := range hints {
		if i > 0 {
			result += "  "
		}
		result += RenderKeyHint(hint[0], hint[1], styles)
	}
	return result
}

// RenderPrompt renders the terminal-style prompt.
func RenderPrompt(styles Styles) string {
	return styles.Prompt.String()
}
