import { createRoot } from 'react-dom/client';
import '@fontsource/markazi-text/arabic-500.css';
import '@fontsource/markazi-text/arabic-600.css';
import '@fontsource/markazi-text/arabic-700.css';
import '@fontsource/el-messiri/arabic-400.css';
import '@fontsource/el-messiri/arabic-600.css';
import '@fontsource/el-messiri/arabic-700.css';
import '@fontsource/el-messiri/latin-400.css';
import '@fontsource/el-messiri/latin-700.css';
import './styles.css';
import App from './App.jsx';

// image files in public/assets (credited in the README and the teacher window)
const root = document.documentElement.style;
root.setProperty('--img-table', `url(${import.meta.env.BASE_URL}assets/table.webp)`);
root.setProperty('--img-back', `url(${import.meta.env.BASE_URL}assets/card-back.webp)`);

createRoot(document.getElementById('root')).render(<App />);
