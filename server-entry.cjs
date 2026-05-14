// Wrapper CommonJS para compatibilidade com Phusion Passenger
async function startServer() {
  try {
    await import('./server.js');
  } catch (error) {
    console.error('Erro fatal ao carregar o servidor ESM:', error);
  }
}
startServer();
