import './globals.css';

export const metadata = {
  title: 'OGxAOR Harga Barang - Ragnarok Database',
  description: 'Ragnarok Database with rAthena Stats, Divine Pride Assets, and Price Management',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="https://static.divine-pride.net/images/items/item/1230.png" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
