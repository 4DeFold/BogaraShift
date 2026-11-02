import 'leaflet/dist/leaflet.css';
import './globals.css';
export const metadata = { title: 'BogaraShift', description: 'Выбор полей и наблюдения фермера', icons: { icon: '/logo.png', apple: '/logo.png' } };
export default function RootLayout({children}) { return <html lang="ru"><body>{children}</body></html>; }
