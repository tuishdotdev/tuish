use crate::LicenseState;
use ratatui::buffer::Buffer;
use ratatui::layout::Rect;
use ratatui::text::Line;
use ratatui::widgets::{Block, Borders, Paragraph, Widget};

pub struct FeatureGate<'a> {
	state: &'a LicenseState,
	feature: &'a str,
}

impl<'a> FeatureGate<'a> {
	pub fn new(state: &'a LicenseState, feature: &'a str) -> Self {
		Self { state, feature }
	}

	pub fn enabled(&self) -> bool {
		self.state.has_feature(self.feature)
	}
}

impl<'a> Widget for FeatureGate<'a> {
	fn render(self, area: Rect, buf: &mut Buffer) {
		let message = if self.enabled() {
			format!("Feature unlocked: {}", self.feature)
		} else {
			format!("Feature locked: {}", self.feature)
		};
		let block = Block::default().borders(Borders::ALL).title("Feature");
		Paragraph::new(vec![Line::from(message)])
			.block(block)
			.render(area, buf);
	}
}
