use crate::LicenseState;
use ratatui::buffer::Buffer;
use ratatui::layout::Rect;
use ratatui::text::Line;
use ratatui::widgets::{Block, Borders, Paragraph, Widget};

pub struct LicenseGate<'a> {
	state: &'a LicenseState,
	licensed: Option<&'a str>,
	unlicensed: Option<&'a str>,
}

impl<'a> LicenseGate<'a> {
	pub fn new(state: &'a LicenseState) -> Self {
		Self {
			state,
			licensed: None,
			unlicensed: None,
		}
	}

	pub fn licensed(mut self, message: &'a str) -> Self {
		self.licensed = Some(message);
		self
	}

	pub fn unlicensed(mut self, message: &'a str) -> Self {
		self.unlicensed = Some(message);
		self
	}
}

impl<'a> Widget for LicenseGate<'a> {
	fn render(self, area: Rect, buf: &mut Buffer) {
		let message = if self.state.is_valid() {
			self.licensed.unwrap_or("Licensed")
		} else {
			self.unlicensed.unwrap_or("License required")
		};

		let block = Block::default().borders(Borders::ALL).title("License Gate");
		Paragraph::new(vec![Line::from(message)])
			.block(block)
			.render(area, buf);
	}
}
