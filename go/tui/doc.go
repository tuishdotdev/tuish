// Package tui provides Bubble Tea-based terminal UI components for the Tuish
// licensing platform. It offers drop-in components for license gating,
// status display, purchase flows, and complete license management UIs.
//
// The package is designed to integrate seamlessly with the main tuish SDK,
// providing beautiful terminal interfaces using the Lip Gloss styling library
// and Bubble Tea's Elm-like architecture.
//
// # Basic Usage
//
// The simplest way to gate access is with LicenseGate:
//
//	sdk, _ := tuish.New(tuish.Config{
//		ProductID: "prod_xxx",
//		PublicKey: "MCowBQYDK2VwAyEA...",
//	})
//
//	// Create a gated component that requires a valid license
//	gated := tui.NewLicenseGate(sdk, myAppModel)
//	p := tea.NewProgram(gated)
//
// # Components
//
// The package provides several components:
//
//   - LicenseGate: Conditionally renders content based on license validity
//   - LicenseStatus: Displays current license details and status
//   - PurchaseFlow: Complete checkout flow with QR code display
//   - QRCode: Renders QR codes in the terminal
//   - LicenseManager: Full self-service license management UI
//
// # Architecture
//
// All components follow Bubble Tea's Model-View-Update pattern:
//
//   - Models implement tea.Model interface
//   - Views render styled output using Lip Gloss
//   - Updates handle messages and state transitions
//
// Components can be composed together or used standalone. The LicenseGate
// wrapper is particularly useful for protecting your main application.
package tui
