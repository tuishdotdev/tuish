use crate::LicenseState;
use ratatui::buffer::Buffer;
use ratatui::layout::Rect;
use ratatui::text::Line;
use ratatui::widgets::{Block, Borders, Paragraph, Widget};

pub struct PurchaseFlow<'a> {
	state: &'a LicenseState,
	message: Option<&'a str>,
}

impl<'a> PurchaseFlow<'a> {
	pub fn new(state: &'a LicenseState) -> Self {
		Self { state, message: None }
	}

	pub fn message(mut self, message: &'a str) -> Self {
		self.message = Some(message);
		self
	}
}

impl<'a> Widget for PurchaseFlow<'a> {
	fn render(self, area: Rect, buf: &mut Buffer) {
		let mut lines = Vec::new();
		lines.push(Line::from("Purchase flow"));
		lines.push(Line::from(
			self
				.message
				.unwrap_or("Integrate checkout UI for unlicensed users."),
		));

		if self.state.is_valid() {
			lines.push(Line::from("License already active."));
		}

		let block = Block::default().borders(Borders::ALL).title("Purchase");
		Paragraph::new(lines).block(block).render(area, buf);
	}
}
