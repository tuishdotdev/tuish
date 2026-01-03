'use client';

import { ApiReferenceReact } from '@scalar/api-reference-react';

export default function TuishApiReference() {
	return (
		<div style={{ minHeight: '70vh' }}>
			<ApiReferenceReact configuration={{ url: '/openapi.json' }} />
		</div>
	);
}
