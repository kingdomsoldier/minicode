// minicode - API de sistema

import { Router } from 'express';
import { promises as fs } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import {
  esRutaDelSistema,
  getStartDir,
  getHomeDir,
  getProjectsDir,
  asegurarProjectsDir,
  detectarAlmacenamientos,
} from '../utils/systemPaths.js';

export function crearRouterSystem() {
  const router = Router();

  // ===== GET /api/system/suggestions =====
  // Chips de acceso rápido
  router.get('/suggestions', async (req, res) => {
    const sugerencias = [];

    // 1. Projects (siempre disponible)
    sugerencias.push({
      label: 'Projects',
      path: getProjectsDir(),
    });

    // 2. Almacenamientos (interno y externo si existe)
    const storages = detectarAlmacenamientos();
    for (const s of storages) {
      sugerencias.push({
        label: s.name,
        path: s.path,
      });
    }

    res.json({ ok: true, suggestions: sugerencias });
  });

  // ===== GET /api/system/browse?path=X =====
  router.get('/browse', async (req, res) => {
    try {
      const relPath = String(req.query.path ?? getStartDir());
      const absPath = relPath.startsWith('/')
        ? resolve(relPath)
        : resolve(getStartDir(), relPath);

      // Si estamos entrando al home, aseguramos que ~/projects existe
      if (absPath === getHomeDir()) {
        asegurarProjectsDir();
      }

      if (!esRutaDelSistema(absPath)) {
        return res.status(403).json({
          ok: false,
          error: 'Ruta fuera de las raíces permitidas',
        });
      }

      const stat = await fs.stat(absPath);
      if (!stat.isDirectory()) {
        return res.status(400).json({
          ok: false,
          error: 'No es un directorio',
        });
      }

      const entries = await fs.readdir(absPath, { withFileTypes: true });

      // Mostramos TODOS los archivos, incluyendo ocultos
      const items = entries
        .map((e) => ({
          name: e.name,
          type: e.isDirectory() ? 'directory' : 'file',
          path: join(absPath, e.name),
        }))
        .sort((a, b) => {
          // Carpetas primero, luego archivos
          if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
          // Alfabético
          return a.name.localeCompare(b.name);
        });

      const parentAbs = dirname(absPath);
      const parent = esRutaDelSistema(parentAbs) ? parentAbs : null;

      res.json({
        ok: true,
        absolutePath: absPath,
        parent,
        items,
      });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  return router;
}
