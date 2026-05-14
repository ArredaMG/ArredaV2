process.on('uncaughtException', (err) => {
  console.error('🚨 [FATAL ERROR - UNCAUGHT EXCEPTION]:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 [FATAL ERROR - UNHANDLED REJECTION]:', reason);
});

let express, cors, google, formidable, fs, path, dotenv;
try {
  express = require('express');
  cors = require('cors');
  ({ google } = require('googleapis'));
  formidable = require('formidable');
  fs = require('fs');
  path = require('path');
  dotenv = require('dotenv');
} catch (err) {
  console.error('🚨 [ERRO DE REQUIRE]:', err.message);
}

// Desativa dotenv na Hostinger, pois as envs vêm do painel
if (process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL) {
  dotenv.config();
  // Se houver arquivo .env.local, carrega ele explicitamente para garantir as chaves locais no ambiente dev
  dotenv.config({ path: '.env.local' });
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rota de Upload do Google Drive
app.post('/api/upload-drive', async (req, res) => {
  const form = formidable({
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB limit
  });

  try {
    const [fields, files] = await form.parse(req);

    const fileArray = files.file;
    if (!fileArray || fileArray.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const file = fileArray[0];
    const projectName = Array.isArray(fields.projectName) ? fields.projectName[0] : fields.projectName;
    const itemName = Array.isArray(fields.itemName) ? fields.itemName[0] : fields.itemName;

    if (!projectName || !itemName) {
        fs.unlinkSync(file.filepath); // clean up
        return res.status(400).json({ error: 'projectName e itemName são obrigatórios.' });
    }

    const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!rootFolderId) {
      fs.unlinkSync(file.filepath);
      return res.status(500).json({ error: 'Configuração do Google Drive ausente no servidor.' });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // 1. Procurar subpasta com projectName
    const query = `'${rootFolderId}' in parents and name = '${projectName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchRes = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    let folderId;

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      // Pasta existe
      folderId = searchRes.data.files[0].id;
    } else {
      // Criar nova pasta
      const folderMetadata = {
        name: projectName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [rootFolderId],
      };
      const folderRes = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
      });
      folderId = folderRes.data.id;

      // Conceder permissão de leitura
      await drive.permissions.create({
        fileId: folderId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    }

    // 2. Nomenclatura Rigorosa
    const originalExt = path.extname(file.originalFilename || file.newFilename);
    const newFileName = `${projectName} - ${itemName}${originalExt}`;

    // 3. Upload do arquivo
    const fileMetadata = {
      name: newFileName,
      parents: [folderId],
    };

    const media = {
      mimeType: file.mimetype || 'application/octet-stream',
      body: fs.createReadStream(file.filepath),
    };

    const uploadRes = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    // Limpeza
    fs.unlinkSync(file.filepath);

    return res.status(200).json({
      status: 200,
      success: true,
      url: uploadRes.data.webViewLink,
      downloadUrl: uploadRes.data.webContentLink,
      fileId: uploadRes.data.id
    });

  } catch (error) {
    console.error('Erro no upload:', error);
    return res.status(500).json({ error: 'Erro interno ao processar upload.', details: error.message });
  }
});

// Servir arquivos estáticos do frontend gerados pelo Vite
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all route para o React Router (SPA)
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando limpo na porta ${PORT}`);
});
