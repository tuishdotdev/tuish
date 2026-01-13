//! Ratatui widgets for integrating Tuish license state into terminal apps.

mod events;
mod state;

pub mod widgets;

pub use events::LicenseEvent;
pub use state::LicenseState;
