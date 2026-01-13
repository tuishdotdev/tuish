package components

import (
	tuish "github.com/tuishdotdev/tuish/go"
	"github.com/tuishdotdev/tuish/go/tui"
)

func HasFeature(sdk *tuish.SDK, feature string) bool {
	return tui.HasFeature(sdk, feature)
}

func IsLicensed(sdk *tuish.SDK) bool {
	return tui.IsLicensed(sdk)
}
