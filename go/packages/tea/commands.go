package tea

import (
	"context"

	tuish "github.com/tuishdotdev/tuish/go"
)

func CheckLicenseCmd(sdk *tuish.SDK) Cmd {
	return func() Msg {
		if sdk == nil {
			return LicenseCheckedMsg{Err: ErrMissingSDK}
		}
		result, err := sdk.CheckLicense(context.Background())
		msg := LicenseCheckedMsg{Result: result, Err: err}
		if err == nil && result != nil {
			msg.Valid = result.Valid
		}
		return msg
	}
}
