import { app } from './app.js';
import './jobs/consumoCron.js';
import './jobs/keepAlive.js';
const PORT = 3333;
app.listen(PORT, () => {
    console.log(`🚀 Server rodando na porta ${PORT}`);
});
