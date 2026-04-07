import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        admin: resolve(__dirname, 'admin/index.html'),
        appointments: resolve(__dirname, 'pages/appointments.html'),
        clients: resolve(__dirname, 'pages/clients.html'),
        costos: resolve(__dirname, 'pages/costos.html'),
        costs: resolve(__dirname, 'pages/costs.html'),
        dashboard: resolve(__dirname, 'pages/dashboard.html'),
        medical_histories: resolve(__dirname, 'pages/medical-histories.html'),
        products: resolve(__dirname, 'pages/products.html'),
        reportes: resolve(__dirname, 'pages/reportes.html'),
        reports: resolve(__dirname, 'pages/reports.html'),
        stock: resolve(__dirname, 'pages/stock.html'),
        suppliers: resolve(__dirname, 'pages/suppliers.html'),
        ventas: resolve(__dirname, 'pages/ventas.html')
      }
    }
  }
});
