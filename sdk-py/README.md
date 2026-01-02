# Tuish Python SDK

> **Status: Planned** - This SDK is not yet implemented.

Python SDK for [Tuish](https://tuish.dev) - Drop-in licensing and monetization for terminal/TUI apps.

## Coming Soon

```python
from tuish import Tuish

client = Tuish(product_id="prod_xxx", public_key="pk_xxx")
result = client.check_license()

if result.valid:
    print("Licensed!")
else:
    client.purchase_in_browser()
```

## Contributing

Interested in helping build the Python SDK? See [CONTRIBUTING.md](../CONTRIBUTING.md).
