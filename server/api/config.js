// minicode - API de configuración

import { Router } from 'express';
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { getRootDir, setRootDir, getConfigPath } from '../config.js';

export function crearRouterConfig() {
  const router = Router();

  // ===== GET /api/config/root =====
  router.get('/root', (req, res) => {
    res.json({
      ok: true,
      rootDir: getRootDir(),
      configPath: getConfigPath(),
    });
  });

  // ===== PUT /api/config/root =====
  // Body: { path: "/ruta/absoluta" }
  router.put('/root', async (req, res) => {
    try {
      const { path: newPath } = req.body ?? {};

      if (typeof newPath !== 'string' || newPath.trim() === '') {
        return res.status(400).json({ ok: false, error: 'Se requiere "path"' });
      }

      const resolved = resolve(newPath.trim());

      // Verificar que existe y es un directorio
      let stat;
      try {
        stat = await fs.stat(resolved);
      } catch {
        return res
          .status(404)
          .json({ ok: false, error: `La ruta no existe: ${resolved}` });
      }

      if (!stat.isDirectory()) {
        return res
          .status(400)
          .json({ ok: false, error: 'La ruta no es un directorio' });
      }

      const final = setRootDir(resolved);

      res.json({ ok: true, rootDir: final });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  return router;
}
