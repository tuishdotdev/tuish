'use client';

import { Badge } from 'tuimorphic';

export function NavTitle() {
	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
			<Badge variant="success">$_</Badge>
			<span style={{ fontSize: '1.25rem', color: '#50fa7b', fontWeight: 'bold' }}>
				tuish
			</span>
		</div>
	);
}
