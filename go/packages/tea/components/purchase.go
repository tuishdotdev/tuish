package components

import (
	tuish "github.com/tuishdotdev/tuish/go"
	tuishtea "github.com/tuishdotdev/tuish/go/packages/tea"
	"github.com/tuishdotdev/tuish/go/tui"
)

type PurchaseFlow = tui.PurchaseFlow
type PurchaseFlowConfig = tui.PurchaseFlowConfig

func PurchaseFlow(model tuishtea.LicenseModel, config ...tui.PurchaseFlowConfig) *tui.PurchaseFlow {
	return tui.NewPurchaseFlow(model.SDK, config...)
}

func NewPurchaseFlow(sdk *tuish.SDK, config ...tui.PurchaseFlowConfig) *tui.PurchaseFlow {
	return tui.NewPurchaseFlow(sdk, config...)
}
