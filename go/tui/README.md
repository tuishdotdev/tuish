# Tuish TUI Components

Go terminal UI component library for the Tuish licensing platform, built on [Bubble Tea](https://github.com/charmbracelet/bubbletea) and [Lip Gloss](https://github.com/charmbracelet/lipgloss).

## Installation

```bash
go get github.com/tuishdotdev/tuish/go/tui
```

## Components

### LicenseGate

Conditionally renders content based on license status. Wraps your main application and only shows it when licensing requirements are met.

```go
import (
    tuish "github.com/tuishdotdev/tuish/go"
    "github.com/tuishdotdev/tuish/go/tui"
)

sdk, _ := tuish.New(tuish.Config{
    ProductID: "prod_xxx",
    PublicKey: "MCowBQYDK2VwAyEA...",
})

// Gate by any valid license
gate := tui.NewLicenseGate(sdk, myApp, tui.LicenseGateConfig{
    RequireLicense: true,
})

// Or gate by specific feature
gate := tui.NewLicenseGate(sdk, myApp, tui.LicenseGateConfig{
    Feature: "pro",
})

// Optional: set fallback for when access is denied
purchase := tui.NewPurchaseFlow(sdk)
gate.SetFallback(purchase)

p := tea.NewProgram(gate)
p.Run()
```

### LicenseStatus

Displays current license details including status, features, and expiry.

```go
// Full display
status := tui.NewLicenseStatus(sdk)

// Compact single-line display
status := tui.NewLicenseStatus(sdk, tui.LicenseStatusConfig{
    Compact: true,
})

// Hide features/expiry
status := tui.NewLicenseStatus(sdk, tui.LicenseStatusConfig{
    ShowFeatures: false,
    ShowExpiry:   false,
})
```

### PurchaseFlow

Complete checkout flow with QR code display and payment polling.

```go
flow := tui.NewPurchaseFlow(sdk, tui.PurchaseFlowConfig{
    ShowQRCode: true,
    Email:      "user@example.com",
    OnComplete: func(license *tuish.LicenseDetails) {
        fmt.Println("Purchased!", license.ProductName)
    },
    OnCancel: func() {
        fmt.Println("Cancelled")
    },
})

p := tea.NewProgram(flow)
p.Run()
```

### QRCode

Renders QR codes in the terminal using Unicode half-block characters.

```go
qr := tui.NewQRCode("https://checkout.example.com/session/123")
p := tea.NewProgram(qr)
p.Run()

// Or render directly without Bubble Tea
output := tui.RenderQRCode("https://example.com")
fmt.Println(output)
```

### LicenseManager

Complete self-service license management UI with menu navigation.

```go
manager := tui.NewLicenseManager(sdk, tui.LicenseManagerConfig{
    AllowManualEntry: true,
    Email:            "user@example.com",
    OnExit: func() {
        fmt.Println("Goodbye!")
    },
})

p := tea.NewProgram(manager, tea.WithAltScreen())
p.Run()
```

## Styling

All components support custom styling via the `Styles` field in their config:

```go
// Use default theme
styles := tui.DefaultStyles()

// Create custom theme
theme := tui.Theme{
    Primary: lipgloss.Color("#FF6B6B"),
    Success: lipgloss.Color("#4ECDC4"),
    // ... other colors
}
styles := tui.NewStyles(theme)

// Apply to component
status := tui.NewLicenseStatus(sdk, tui.LicenseStatusConfig{
    Styles: &styles,
})
```

## Helper Functions

For use outside Bubble Tea models:

```go
// Check license synchronously
if tui.IsLicensed(sdk) {
    // User has valid license
}

// Check specific feature
if tui.HasFeature(sdk, "pro") {
    // User has pro feature
}

// Render status without Bubble Tea
result, _ := sdk.CheckLicense(ctx)
output := tui.RenderLicenseStatus(result)
fmt.Println(output)

// Render QR code
output := tui.RenderQRCode("https://example.com")
fmt.Println(output)

// Render progress bar
bar := tui.RenderProgressBar(0.65, 40, styles)

// Render keyboard hints
hints := [][2]string{{"Enter", "Select"}, {"q", "Quit"}}
output := tui.RenderKeyHints(hints, styles)
```

## Example

Run the example application:

```bash
cd tui/example
go run main.go
```

Or with real credentials:

```bash
TUISH_PRODUCT_ID=prod_xxx TUISH_PUBLIC_KEY=MCow... go run main.go
```

## Unicode Symbols

The package exports commonly used Unicode symbols:

```go
tui.CheckMark       // ✓
tui.CrossMark       // ✗
tui.BulletPoint     // •
tui.ArrowRight      // →
tui.WarningSign     // ⚠
tui.Lock            // 🔒
tui.Key             // 🔑
tui.ShoppingCart    // 🛒
tui.Celebration     // 🎉
// ... and more
```

## Architecture

All components follow Bubble Tea's Model-View-Update (Elm-like) pattern:

- **Model**: Component struct implementing `tea.Model`
- **Init()**: Returns initial command (usually license check)
- **Update(msg)**: Handles messages, returns new model and commands
- **View()**: Renders styled output using Lip Gloss

Components can be composed together. The `LicenseGate` is particularly useful as it wraps your main application and handles the gating logic automatically.
