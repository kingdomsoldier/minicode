// minicode - API de archivos

import { Router } from 'express';
import { promises as fs } from 'node:fs';
import { join, basename } from 'node:path';
import { resolverRutaSegura, rutaRelativa } from '../utils/safePath.js';

export function crearRouterArchivos(getRootDir) {
  const router = Router();

  router.get('/list', async (req, res) => {
    try {
      const rootDir = getRootDir();
      const relPath = String(req.query.path ?? '.');
      const absPath = resolverRutaSegura(rootDir, relPath);

      const entries = await fs.readdir(absPath, { withFileTypes: true });

      // Mostramos TODOS los archivos, incluyendo ocultos.
      const items = entries
        .map((e) => ({
          name: e.name,
          type: e.isDirectory() ? 'directory' : 'file',
          path: rutaRelativa(rootDir, join(absPath, e.name)),
        }))
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

      res.json({
        ok: true,
        path: rutaRelativa(rootDir, absPath),
        parent:
          absPath === rootDir
            ? null
            : rutaRelativa(rootDir, join(absPath, '..')),
        items,
      });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/read', async (req, res) => {
    try {
      const rootDir = getRootDir();
      const relPath = String(req.query.path ?? '');
      const absPath = resolverRutaSegura(rootDir, relPath);

      const stat = await fs.stat(absPath);
      if (!stat.isFile()) {
        return res.status(400).json({ ok: false, error: 'No es un archivo' });
      }

      if (stat.size > 1024 * 1024) {
        return res.status(413).json({
          ok: false,
          error: 'Archivo demasiado grande (>1MB)',
        });
      }

      const content = await fs.readFile(absPath, 'utf8');

      res.json({
        ok: true,
        path: rutaRelativa(rootDir, absPath),
        name: basename(absPath),
        size: stat.size,
        content,
      });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.put('/write', async (req, res) => {
    try {
      const rootDir = getRootDir();
      const { path: relPath, content } = req.body ?? {};

      if (typeof relPath !== 'string' || typeof content !== 'string') {
        return res.status(400).json({
          ok: false,
          error: 'Se requieren "path" y "content"',
        });
      }

      const absPath = resolverRutaSegura(rootDir, relPath);
      await fs.writeFile(absPath, content, 'utf8');

      res.json({
        ok: true,
        path: rutaRelativa(rootDir, absPath),
        size: Buffer.byteLength(content, 'utf8'),
      });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/create', async (req, res) => {
    try {
      const rootDir = getRootDir();
      const { path: relPath, content = '' } = req.body ?? {};

      if (typeof relPath !== 'string') {
        return res.status(400).json({ ok: false, error: 'Se requiere "path"' });
      }

      const absPath = resolverRutaSegura(rootDir, relPath);

      try {
        await fs.access(absPath);
        return res.status(409).json({ ok: false, error: 'Ya existe' });
      } catch {
        // no existe, adelante
      }

      await fs.writeFile(absPath, content, 'utf8');

      res.json({
        ok: true,
        path: rutaRelativa(rootDir, absPath),
        name: basename(absPath),
      });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/mkdir', async (req, res) => {
    try {
      const rootDir = getRootDir();
      const { path: relPath } = req.body ?? {};

      if (typeof relPath !== 'string' || relPath.trim() === '') {
        return res.status(400).json({ ok: false, error: 'Se requiere "path"' });
      }

      const absPath = resolverRutaSegura(rootDir, relPath);

      try {
        await fs.access(absPath);
        return res.status(409).json({ ok: false, error: 'Ya existe' });
      } catch {
        // no existe, adelante
      }

      await fs.mkdir(absPath, { recursive: false });

      res.json({
        ok: true,
        path: rutaRelativa(rootDir, absPath),
        name: basename(absPath),
      });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.delete('/delete', async (req, res) => {
    try {
      const rootDir = getRootDir();
      const relPath = String(req.query.path ?? '');
      const absPath = resolverRutaSegura(rootDir, relPath);

      const stat = await fs.stat(absPath);

      if (stat.isDirectory()) {
        await fs.rm(absPath, { recursive: true, force: true });
      } else {
        await fs.unlink(absPath);
      }

      res.json({
        ok: true,
        path: rutaRelativa(rootDir, absPath),
        wasDirectory: stat.isDirectory(),
      });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/rename', async (req, res) => {
    try {
      const rootDir = getRootDir();
      const { from, to } = req.body ?? {};

      if (typeof from !== 'string' || typeof to !== 'string') {
        return res.status(400).json({
          ok: false,
          error: 'Se requieren "from" y "to"',
        });
      }

      const absFrom = resolverRutaSegura(rootDir, from);
      const absTo = resolverRutaSegura(rootDir, to);

      try {
        await fs.access(absFrom);
      } catch {
        return res
          .status(404)
          .json({ ok: false, error: 'El origen no existe' });
      }

      try {
        await fs.access(absTo);
        return res
          .status(409)
          .json({ ok: false, error: 'Ya existe un archivo con ese nombre' });
      } catch {
        // no existe, adelante
      }

      await fs.rename(absFrom, absTo);

      res.json({
        ok: true,
        path: rutaRelativa(rootDir, absTo),
        name: basename(absTo),
      });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/copy', async (req, res) => {
    try {
      const rootDir = getRootDir();
      const { from, to } = req.body ?? {};

      if (typeof from !== 'string' || typeof to !== 'string') {
        return res.status(400).json({
          ok: false,
          error: 'Se requieren "from" y "to"',
        });
      }

      const absFrom = resolverRutaSegura(rootDir, from);
      const absTo = resolverRutaSegura(rootDir, to);

      try {
        await fs.access(absFrom);
      } catch {
        return res
          .status(404)
          .json({ ok: false, error: 'El origen no existe' });
      }

      try {
        await fs.access(absTo);
        return res
          .status(409)
          .json({ ok: false, error: 'Ya existe un archivo con ese nombre' });
      } catch {
        // no existe, adelante
      }

      const stat = await fs.stat(absFrom);
      if (stat.isDirectory()) {
        await fs.cp(absFrom, absTo, { recursive: true });
      } else {
        await fs.copyFile(absFrom, absTo);
      }

      res.json({
        ok: true,
        path: rutaRelativa(rootDir, absTo),
        name: basename(absTo),
      });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  return router;
}
