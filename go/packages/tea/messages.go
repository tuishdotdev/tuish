package tea

import tuish "github.com/tuishdotdev/tuish/go"

// LicenseCheckedMsg reports the outcome of a license check.
type LicenseCheckedMsg struct {
	Result *tuish.LicenseCheckResult
	Err    error
	Valid  bool
}
