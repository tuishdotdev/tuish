package tui

import (
	"time"

	tuish "github.com/tuishdotdev/tuish/go"
)

// LicenseCheckedMsg is sent when a license check completes.
type LicenseCheckedMsg struct {
	Result *tuish.LicenseCheckResult
	Error  error
}

// LicenseRefreshedMsg is sent when a license refresh completes.
type LicenseRefreshedMsg struct {
	Result *tuish.LicenseCheckResult
	Error  error
}

// LicenseClearedMsg is sent when the license is cleared.
type LicenseClearedMsg struct {
	Error error
}

// LicenseStoredMsg is sent when a license key is stored.
type LicenseStoredMsg struct {
	Error error
}

// CheckoutSessionCreatedMsg is sent when a checkout session is created.
type CheckoutSessionCreatedMsg struct {
	Session *tuish.CheckoutSessionResult
	Error   error
}

// CheckoutStatusMsg is sent when checkout status is polled.
type CheckoutStatusMsg struct {
	Status    string
	License   *tuish.LicenseDetails
	Error     error
	Completed bool
}

// CheckoutTimeoutMsg is sent when checkout polling times out.
type CheckoutTimeoutMsg struct{}

// CheckoutCancelledMsg is sent when checkout is cancelled.
type CheckoutCancelledMsg struct{}

// SpinnerTickMsg is sent to animate the spinner.
type SpinnerTickMsg struct {
	Time time.Time
}

// ElapsedTickMsg is sent to update elapsed time display.
type ElapsedTickMsg struct {
	Elapsed time.Duration
}

// QRGeneratedMsg is sent when a QR code is generated.
type QRGeneratedMsg struct {
	QRString string
	CanFit   bool
	Error    error
}

// BrowserOpenedMsg is sent when a browser is opened.
type BrowserOpenedMsg struct {
	URL   string
	Error error
}

// MenuSelectMsg is sent when a menu item is selected.
type MenuSelectMsg struct {
	Value string
}

// TextInputSubmitMsg is sent when text input is submitted.
type TextInputSubmitMsg struct {
	Value string
}

// ConfirmMsg is sent for confirmation dialogs.
type ConfirmMsg struct {
	Confirmed bool
}

// NavigateMsg is sent to navigate between screens.
type NavigateMsg struct {
	Screen string
}

// ExitMsg is sent when the user wants to exit.
type ExitMsg struct{}

// ErrorMsg represents a generic error.
type ErrorMsg struct {
	Error   error
	Message string
}

// SuccessMsg represents a generic success.
type SuccessMsg struct {
	Message string
}

// Key press constants for consistent key handling.
const (
	KeyEnter     = "enter"
	KeyEscape    = "esc"
	KeyUp        = "up"
	KeyDown      = "down"
	KeyLeft      = "left"
	KeyRight     = "right"
	KeyTab       = "tab"
	KeyShiftTab  = "shift+tab"
	KeyBackspace = "backspace"
	KeyDelete    = "delete"
	KeySpace     = " "
	KeyQ         = "q"
	KeyR         = "r"
	KeyC         = "c"
	KeyY         = "y"
	KeyN         = "n"
)

// Command creators for common operations

// DoLicenseCheck returns a tea.Cmd that checks the license.
func DoLicenseCheck(sdk *tuish.SDK) func() LicenseCheckedMsg {
	return func() LicenseCheckedMsg {
		result, err := sdk.CheckLicense(nil)
		return LicenseCheckedMsg{Result: result, Error: err}
	}
}

// DoCreateCheckout returns a tea.Cmd that creates a checkout session.
func DoCreateCheckout(sdk *tuish.SDK, email string) func() CheckoutSessionCreatedMsg {
	return func() CheckoutSessionCreatedMsg {
		session, err := sdk.PurchaseInBrowser(nil, email)
		return CheckoutSessionCreatedMsg{Session: session, Error: err}
	}
}

// DoStoreLicense returns a tea.Cmd that stores a license key.
func DoStoreLicense(sdk *tuish.SDK, licenseKey string) func() LicenseStoredMsg {
	return func() LicenseStoredMsg {
		err := sdk.StoreLicense(licenseKey)
		return LicenseStoredMsg{Error: err}
	}
}

// DoClearLicense returns a tea.Cmd that clears the license.
func DoClearLicense(sdk *tuish.SDK) func() LicenseClearedMsg {
	return func() LicenseClearedMsg {
		err := sdk.ClearLicense()
		return LicenseClearedMsg{Error: err}
	}
}

// SpinnerTick creates a command for the spinner animation.
func SpinnerTick() SpinnerTickMsg {
	return SpinnerTickMsg{Time: time.Now()}
}

// ElapsedTick creates a command for elapsed time updates.
func ElapsedTick(elapsed time.Duration) ElapsedTickMsg {
	return ElapsedTickMsg{Elapsed: elapsed}
}
