import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@umamichi-ui/common-css';
import '@umamichi-ui/common-css/article.css';
import { App } from './App';
import './styles.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
	throw new Error('App root not found.');
}

createRoot(app).render(
	<StrictMode>
		<App />
	</StrictMode>
);