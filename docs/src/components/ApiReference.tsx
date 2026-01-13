'use client';

import dynamic from 'next/dynamic';

const ApiReferenceReact = dynamic(
	() => import('@scalar/api-reference-react').then((mod) => mod.ApiReferenceReact),
	{ ssr: false, loading: () => <div style={{ minHeight: '70vh' }}>Loading API Reference...</div> }
);

export default function TuishApiReference() {
	return (
		<div style={{ minHeight: '70vh' }}>
			<ApiReferenceReact configuration={{ url: '/openapi.json' }} />
		</div>
	);
}
