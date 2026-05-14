process.on('uncaughtException', (err) => {
  console.error('🚨 [FATAL ERROR - UNCAUGHT EXCEPTION]:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 [FATAL ERROR - UNHANDLED REJECTION]:', reason);
});

let express, cors, google, formidable, fs, path, dotenv, ClerkExpressRequireAuth;
try {
  express = require('express');
  cors = require('cors');
  ({ google } = require('googleapis'));
  formidable = require('formidable');
  fs = require('fs');
  path = require('path');
  dotenv = require('dotenv');
  ({ ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node'));
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

// Rota de Upload do Google Drive protegida pelo Clerk
app.post('/api/upload-drive', ClerkExpressRequireAuth(), async (req, res) => {
  const form = formidable.formidable({
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB limit
    multiples: true
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

    let rawKey = process.env.GOOGLE_PRIVATE_KEY || '';

    // Purificação Atômica: isola apenas o corpo Base64 da chave
    let cleanBody = rawKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\\n/g, '')  // Remove \n literal (texto)
      .replace(/\n/g, '')   // Remove quebra de linha real
      .replace(/\s/g, '')   // Remove espaços
      .replace(/\\/g, '')   // Remove barras invertidas remanescentes
      .trim();

    // Reconstrói do zero no formato PEM rigoroso (64 chars por linha)
    const formattedKey = `-----BEGIN PRIVATE KEY-----\n${cleanBody.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;

    console.log("🔑 Verificação da Chave: Começa com:", formattedKey.substring(0, 36));

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: formattedKey,
      },
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // ── Verificação de Acesso à Pasta Pai ─────────────────────────────────
    console.log('🚀 Tentando upload multipart para:', rootFolderId);
    try {
      await drive.files.get({
        fileId: rootFolderId,
        fields: 'id, name',
        supportsAllDrives: true,
      });
      console.log('✅ Acesso à pasta pai confirmado.');
    } catch (accessErr) {
      console.error('❌ Sem acesso à pasta pai:', accessErr.message);
      fs.unlinkSync(file.filepath);
      return res.status(500).json({ error: 'Sem permissão de acesso à pasta do Google Drive.', details: accessErr.message });
    }

    // ── Busca ou criação da subpasta do projeto ───────────────────────────
    const query = `'${rootFolderId}' in parents and name = '${projectName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchRes = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    let folderId;

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      folderId = searchRes.data.files[0].id;
      console.log('📂 Subpasta existente encontrada:', folderId);
    } else {
      const folderRes = await drive.files.create({
        requestBody: {
          name: projectName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [rootFolderId],
        },
        fields: 'id',
        supportsAllDrives: true,
      });
      folderId = folderRes.data.id;
      console.log('📁 Nova subpasta criada:', folderId);

      await drive.permissions.create({
        fileId: folderId,
        requestBody: { role: 'reader', type: 'anyone' },
        supportsAllDrives: true,
      });
    }

    // ── Nomenclatura e Upload ─────────────────────────────────────────────
    const originalExt = path.extname(file.originalFilename || file.newFilename);
    const newFileName = `${projectName} - ${itemName}${originalExt}`;

    const fileMetadata = {
      name: newFileName,
      parents: [folderId],
    };

    const media = {
      mimeType: file.mimetype || 'application/octet-stream',
      body: fs.createReadStream(file.filepath),
    };

    console.log('📤 Enviando arquivo para subpasta ID:', folderId);

    const uploadRes = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
      supportsAllDrives: true,
      keepRevisionForever: true,
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

// ── DELETE de arquivo no Google Drive ────────────────────────────────────────
app.delete('/api/delete-file/:fileId', ClerkExpressRequireAuth(), async (req, res) => {
  const { fileId } = req.params;

  if (!fileId) {
    return res.status(400).json({ error: 'fileId é obrigatório.' });
  }

  try {
    let rawKey = process.env.GOOGLE_PRIVATE_KEY || '';
    let cleanBody = rawKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\\n/g, '')
      .replace(/\n/g, '')
      .replace(/\s/g, '')
      .replace(/\\/g, '')
      .trim();
    const formattedKey = `-----BEGIN PRIVATE KEY-----\n${cleanBody.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: formattedKey,
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    console.log('🗑️ Deletando arquivo do Drive, fileId:', fileId);

    await drive.files.delete({
      fileId,
      supportsAllDrives: true,
    });

    console.log('✅ Arquivo deletado com sucesso:', fileId);
    return res.status(200).json({ success: true, message: 'Arquivo deletado com sucesso.' });

  } catch (error) {
    // Arquivo já não existe no Drive — trata como sucesso
    if (error.code === 404 || (error.response && error.response.status === 404)) {
      console.warn('⚠️ Arquivo não encontrado no Drive (já deletado?):', fileId);
      return res.status(200).json({ success: true, message: 'Arquivo não encontrado, nada a deletar.' });
    }
    console.error('Erro ao deletar arquivo do Drive:', error);
    return res.status(500).json({ error: 'Erro ao deletar arquivo.', details: error.message });
  }
});

// Servir arquivos estáticos do frontend (CSS, JS, Imagens) gerados pelo Vite
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all route para o React Router (SPA)
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando limpo na porta ${PORT}`);
});
