//! Basic example showing how to use the Tuish SDK
//!
//! Run with: cargo run --example basic

use tuish::{Tuish, TuishError};

#[tokio::main]
async fn main() -> Result<(), TuishError> {
    // Initialize the SDK with your product credentials
    let mut tuish = Tuish::builder()
        .product_id("your-product-id")
        .public_key("MCowBQYDK2VwAyEA...") // Your Ed25519 public key (SPKI base64)
        .api_key("your-api-key")
        .build()?;

    // Check if user has a valid license (offline-first)
    let result = tuish.check_license();

    if result.valid {
        println!("✓ License valid!");
        if let Some(license) = &result.license {
            println!("  License ID: {}", license.id);
            println!("  Product: {}", license.product_id);
            if let Some(exp) = license.expires_at {
                println!("  Expires: {}", exp);
            }
            println!("  Features: {:?}", license.features);
        }

        // Continue with your app...
        run_app();
    } else {
        println!("✗ No valid license found");
        if let Some(reason) = &result.reason {
            println!("  Reason: {:?}", reason);
        }

        // Prompt user to purchase
        println!("\nWould you like to purchase a license? (y/n)");

        // In a real app, you'd read user input here
        let wants_to_buy = true;

        if wants_to_buy {
            purchase_license(&mut tuish).await?;
        }
    }

    Ok(())
}

async fn purchase_license(tuish: &mut Tuish) -> Result<(), TuishError> {
    println!("\nOpening browser for checkout...");

    // Start checkout and open browser
    let session = tuish.open_checkout(Some("user@example.com")).await?;
    println!("Checkout URL: {}", session.checkout_url);
    println!("Session ID: {}", session.session_id);

    // Wait for purchase to complete (polls every 2 seconds)
    println!("\nWaiting for purchase to complete...");
    let result = tuish.wait_for_checkout(&session.session_id).await?;

    if result.valid {
        println!("\n✓ Purchase complete! License activated.");
        run_app();
    } else {
        println!("\n✗ Purchase was not completed");
    }

    Ok(())
}

fn run_app() {
    println!("\n🚀 Running your awesome TUI app...\n");
    // Your app logic here
}
