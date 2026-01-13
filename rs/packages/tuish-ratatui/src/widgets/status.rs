use crate::LicenseState;
use ratatui::buffer::Buffer;
use ratatui::layout::Rect;
use ratatui::text::Line;
use ratatui::widgets::{Block, Borders, Paragraph, Widget};

pub struct LicenseStatus<'a> {
	state: &'a LicenseState,
	title: Option<&'a str>,
}

impl<'a> LicenseStatus<'a> {
	pub fn new(state: &'a LicenseState) -> Self {
		Self { state, title: None }
	}

	pub fn title(mut self, title: &'a str) -> Self {
		self.title = Some(title);
		self
	}
}

impl<'a> Widget for LicenseStatus<'a> {
	fn render(self, area: Rect, buf: &mut Buffer) {
		let mut lines = Vec::new();
		if self.state.is_valid() {
			lines.push(Line::from("Licensed"));
		} else {
			lines.push(Line::from("Unlicensed"));
		}

		if let Some(result) = &self.state.result {
			if let Some(license) = &result.license {
				if !license.features.is_empty() {
					lines.push(Line::from(format!(
						"Features: {}",
						license.features.join(", ")
					)));
				}
			}
		} else if let Some(error) = &self.state.error {
			lines.push(Line::from(format!("Error: {error}")));
		}

		let block = Block::default().borders(Borders::ALL).title(
			self.title.unwrap_or("License Status"),
		);
		Paragraph::new(lines).block(block).render(area, buf);
	}
}
