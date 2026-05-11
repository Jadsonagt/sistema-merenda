import { app } from './app.js';
import './jobs/consumoCron.js';
const PORT = 3333;
app.listen(PORT, () => {
    console.log(`🚀 Server rodando na porta ${PORT}`);
});
