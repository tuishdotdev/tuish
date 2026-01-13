use tuish::LicenseCheckResult;

#[derive(Debug, Clone)]
pub enum LicenseEvent {
	Checked(LicenseCheckResult),
	Error(String),
}
