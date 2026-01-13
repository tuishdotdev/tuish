# tuish-textual

Textual TUI components for Tuish license verification and monetization.

## Installation

```bash
pip install tuish-textual
```

## Usage

```python
from textual.app import App
from tuish import Tuish
from tuish_textual import LicenseGate, LicenseStatus, PurchaseFlow

class MyApp(App):
    def __init__(self):
        super().__init__()
        self.tuish = Tuish(
            product_id="prod_xxx",
            public_key="MCowBQYDK2VwAyEA...",
        )

    def compose(self):
        yield LicenseGate(
            tuish=self.tuish,
            fallback=[PurchaseFlow(tuish=self.tuish)],
            children=[
                LicenseStatus(tuish=self.tuish, compact=True),
                # Your app content here
            ],
        )

if __name__ == "__main__":
    MyApp().run()
```

## Components

- **LicenseStatus** - Display current license state
- **LicenseGate** - Conditional rendering based on license/feature
- **PurchaseFlow** - Complete checkout with QR code
- **TuishLicenseManager** - Self-service license management menu
- **LoginFlow** - OTP authentication for returning customers
- **QrCode** - Unicode QR code rendering

## License

MIT
