use tuish::LicenseCheckResult;

#[derive(Debug, Clone, Default)]
pub struct LicenseState {
	pub result: Option<LicenseCheckResult>,
	pub error: Option<String>,
}

impl LicenseState {
	pub fn new() -> Self {
		Self::default()
	}

	pub fn with_result(result: LicenseCheckResult) -> Self {
		Self {
			result: Some(result),
			error: None,
		}
	}

	pub fn is_valid(&self) -> bool {
		self.result.as_ref().is_some_and(|result| result.valid)
	}

	pub fn has_feature(&self, feature: &str) -> bool {
		let Some(result) = &self.result else {
			return false;
		};
		let Some(license) = &result.license else {
			return false;
		};
		license.features.iter().any(|item| item == feature)
	}
}
