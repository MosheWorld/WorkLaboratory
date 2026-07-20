import { createRoot } from 'react-dom/client';
import '@fontsource-variable/dm-sans/index.css';
import '@fontsource-variable/space-grotesk/index.css';
import './style.css';
import App from './app/App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('The app root element is missing.');

createRoot(rootElement).render(<App />);
