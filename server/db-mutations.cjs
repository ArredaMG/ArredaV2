const { sql } = require('drizzle-orm');
const { mapProjectToClientShape } = require('./db-helpers.cjs');

const costItemConflictUpdate = {
  role: sql`excluded.role`,
  name: sql`excluded.name`,
  quantity: sql`excluded.quantity`,
  days: sql`excluded.days`,
  unitCost: sql`excluded.unit_cost`,
  tax: sql`excluded.tax`,
  isInHouse: sql`excluded.is_in_house`,
  customMargin: sql`excluded.custom_margin`,
  executedCost: sql`excluded.executed_cost`,
  receiptLink: sql`excluded.receipt_link`,
  category: sql`excluded.category`,
};

function mapCostItemRow(item, groupId) {
  return {
    id: item.id,
    groupId,
    role: item.role,
    name: item.name,
    quantity: item.quantity,
    days: item.days,
    unitCost: item.unitCost,
    tax: item.tax,
    isInHouse: item.isInHouse,
    customMargin: item.customMargin,
    executedCost: item.executedCost,
    receiptLink: item.receiptLink,
    category: item.category,
  };
}

async function upsertCostItemsBatch(tx, schema, eq, and, notInArray, group, items) {
  if (!items?.length) return [];

  const keptItemIds = items.filter(i => i.id).map(i => i.id);

  await tx.insert(schema.costItems)
    .values(items.map(item => mapCostItemRow(item, group.id)))
    .onConflictDoUpdate({
      target: schema.costItems.id,
      set: costItemConflictUpdate,
    });

  if (keptItemIds.length > 0) {
    await tx.delete(schema.costItems)
      .where(and(
        eq(schema.costItems.groupId, group.id),
        notInArray(schema.costItems.id, keptItemIds)
      ));
  } else {
    await tx.delete(schema.costItems).where(eq(schema.costItems.groupId, group.id));
  }

  return keptItemIds;
}

async function resolveProjectNumber(tx, schema, projectData) {
  if (projectData.projectNumber != null && projectData.projectNumber !== 0) {
    return projectData.projectNumber;
  }

  const rows = await tx.select({ projectNumber: schema.projects.projectNumber }).from(schema.projects);
  const maxNumber = rows.reduce((max, row) => Math.max(max, row.projectNumber ?? 0), 0);
  return maxNumber + 1;
}

function pickDefinedFields(body, allowedFields) {
  const updates = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }
  return updates;
}

function registerDbMutationRoutes(app, deps) {
  const { db, schema, eq, and, ne, inArray, notInArray, ClerkExpressRequireAuth } = deps;
  const auth = ClerkExpressRequireAuth();

  const requireDb = (_req, res, next) => {
    if (!db) return res.status(503).json({ error: 'Banco de dados não configurado no servidor.' });
    next();
  };

  // ── Resource lists (read) ────────────────────────────────────────────────────
  app.get('/api/db/clients', auth, requireDb, async (_req, res) => {
    try {
      const data = await db.query.clients.findMany();
      return res.json(data);
    } catch (error) {
      console.error('Erro em GET /api/db/clients:', error);
      return res.status(500).json({ error: 'Erro ao buscar clientes.', details: error.message });
    }
  });

  app.get('/api/db/professionals', auth, requireDb, async (_req, res) => {
    try {
      const data = await db.query.professionals.findMany();
      return res.json(data.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        pix: p.pix || '',
        dailyRate: p.dailyRate
      })));
    } catch (error) {
      console.error('Erro em GET /api/db/professionals:', error);
      return res.status(500).json({ error: 'Erro ao buscar profissionais.', details: error.message });
    }
  });

  app.get('/api/db/equipments', auth, requireDb, async (_req, res) => {
    try {
      const data = await db.query.equipments.findMany();
      return res.json(data);
    } catch (error) {
      console.error('Erro em GET /api/db/equipments:', error);
      return res.status(500).json({ error: 'Erro ao buscar equipamentos.', details: error.message });
    }
  });

  app.get('/api/db/templates', auth, requireDb, async (_req, res) => {
    try {
      const data = await db.query.templates.findMany();
      return res.json(data);
    } catch (error) {
      console.error('Erro em GET /api/db/templates:', error);
      return res.status(500).json({ error: 'Erro ao buscar templates.', details: error.message });
    }
  });

  // ── CRM read ─────────────────────────────────────────────────────────────────
  app.get('/api/db/crm', auth, requireDb, async (_req, res) => {
    try {
      const data = await db.query.pipelines.findMany({
        with: {
          stages: true,
          deals: { with: { client: true } }
        }
      });
      return res.json(data);
    } catch (error) {
      console.error('Erro em GET /api/db/crm:', error);
      return res.status(500).json({ error: 'Erro ao buscar CRM.', details: error.message });
    }
  });

  // ── Projects ─────────────────────────────────────────────────────────────────
  app.get('/api/db/projects', auth, requireDb, async (_req, res) => {
    try {
      const projectsData = await db.query.projects.findMany({
        with: {
          client: true,
          versions: {
            with: {
              groups: {
                with: {
                  items: true
                }
              }
            }
          }
        }
      });

      return res.json(projectsData.map(mapProjectToClientShape));
    } catch (error) {
      console.error('Erro em GET /api/db/projects:', error);
      return res.status(500).json({ error: 'Erro ao buscar projetos.', details: error.message });
    }
  });

  app.get('/api/db/projects/check-number', auth, requireDb, async (req, res) => {
    try {
      const projectNumber = parseInt(req.query.projectNumber, 10);
      const excludeProjectId = req.query.excludeProjectId;

      const existing = await db.select()
        .from(schema.projects)
        .where(and(
          eq(schema.projects.projectNumber, projectNumber),
          excludeProjectId ? ne(schema.projects.id, excludeProjectId) : undefined
        ))
        .limit(1);

      return res.json({ taken: existing.length > 0 });
    } catch (error) {
      console.error('Erro em GET check-number:', error);
      return res.status(500).json({ error: 'Erro ao verificar número.', details: error.message });
    }
  });

  app.post('/api/db/projects', auth, requireDb, async (req, res) => {
    try {
      const projectData = req.body;
      const result = await db.transaction(async (tx) => {
        const projectNumber = await resolveProjectNumber(tx, schema, projectData);
        const [newProject] = await tx.insert(schema.projects).values({
          id: projectData.id,
          title: projectData.title,
          clientId: projectData.clientId,
          status: projectData.status,
          projectNumber,
        }).returning();

        if (!newProject) throw new Error('Failed to insert project');

        const version = projectData.versions[0];
        const [newVersion] = await tx.insert(schema.projectVersions).values({
          id: version.id,
          projectId: newProject.id,
          name: version.name,
          date: version.date,
          defaultTax: version.defaultTax,
          defaultMargin: version.defaultMargin
        }).returning();

        if (!newVersion) throw new Error('Failed to insert project version');

        return { ...newProject, versions: [{ ...newVersion, groups: [] }] };
      });
      return res.status(201).json(result);
    } catch (error) {
      console.error('Erro em POST /api/db/projects:', error);
      return res.status(500).json({ error: 'Erro ao criar projeto.', details: error.message });
    }
  });

  app.put('/api/db/projects/:id', auth, requireDb, async (req, res) => {
    const { id } = req.params;
    try {
      const result = await db.transaction(async (tx) => {
        const safeUpdates = { ...req.body };

        if ('recordingDates' in safeUpdates) {
          safeUpdates.recordingDates = Array.isArray(safeUpdates.recordingDates)
            ? safeUpdates.recordingDates
            : [];
        }

        const dbUpdates = {};
        if (safeUpdates.title) dbUpdates.title = safeUpdates.title;
        if (safeUpdates.status) dbUpdates.status = safeUpdates.status;
        if (safeUpdates.clientId) dbUpdates.clientId = safeUpdates.clientId;
        if (safeUpdates.projectNumber !== undefined) dbUpdates.projectNumber = safeUpdates.projectNumber;

        if ('startDate' in safeUpdates) {
          dbUpdates.startDate = safeUpdates.startDate ? new Date(safeUpdates.startDate) : null;
        }
        if ('endDate' in safeUpdates) {
          dbUpdates.endDate = safeUpdates.endDate ? new Date(safeUpdates.endDate) : null;
        }
        if ('recordingDates' in safeUpdates) {
          dbUpdates.recordingDates = safeUpdates.recordingDates;
        }

        if (Object.keys(dbUpdates).length > 0) {
          console.log('[DB] updateProject payload:', JSON.stringify(dbUpdates, null, 2));
          await tx.update(schema.projects).set(dbUpdates).where(eq(schema.projects.id, id));
        }

        if (safeUpdates.versions && Array.isArray(safeUpdates.versions)) {
          const keptVersionIds = safeUpdates.versions.filter(v => v.id).map(v => v.id);

          for (const version of safeUpdates.versions) {
            await tx.insert(schema.projectVersions).values({
              id: version.id,
              projectId: id,
              name: version.name,
              date: version.date,
              defaultTax: version.defaultTax,
              defaultMargin: version.defaultMargin,
              propostaData: version.propostaData
            }).onConflictDoUpdate({
              target: schema.projectVersions.id,
              set: {
                name: version.name,
                date: version.date,
                defaultTax: version.defaultTax,
                defaultMargin: version.defaultMargin,
                propostaData: version.propostaData
              }
            });

            if (version.groups && Array.isArray(version.groups)) {
              const keptGroupIds = version.groups.filter(g => g.id).map(g => g.id);

              for (const group of version.groups) {
                await tx.insert(schema.costGroups).values({
                  id: group.id,
                  versionId: version.id,
                  name: group.name,
                  margin: group.margin,
                  isActive: group.isActive
                }).onConflictDoUpdate({
                  target: schema.costGroups.id,
                  set: { name: group.name, margin: group.margin, isActive: group.isActive }
                });

                if (group.items && Array.isArray(group.items)) {
                  await upsertCostItemsBatch(tx, schema, eq, and, notInArray, group, group.items);
                }
              }

              if (keptGroupIds.length > 0) {
                await tx.delete(schema.costGroups)
                  .where(and(
                    eq(schema.costGroups.versionId, version.id),
                    notInArray(schema.costGroups.id, keptGroupIds)
                  ));
              } else {
                await tx.delete(schema.costGroups).where(eq(schema.costGroups.versionId, version.id));
              }
            }
          }

          if (keptVersionIds.length > 0) {
            await tx.delete(schema.projectVersions)
              .where(and(
                eq(schema.projectVersions.projectId, id),
                notInArray(schema.projectVersions.id, keptVersionIds)
              ));
          } else {
            await tx.delete(schema.projectVersions).where(eq(schema.projectVersions.projectId, id));
          }
        }

        const updatedProject = await tx.query.projects.findFirst({
          where: eq(schema.projects.id, id),
          with: {
            client: true,
            versions: { with: { groups: { with: { items: true } } } }
          }
        });

        return mapProjectToClientShape(updatedProject);
      });

      return res.json(result);
    } catch (error) {
      console.error('Erro em PUT /api/db/projects/:id:', error);
      return res.status(500).json({ error: 'Erro ao atualizar projeto.', details: error.message });
    }
  });

  app.delete('/api/db/projects/:id', auth, requireDb, async (req, res) => {
    try {
      await db.delete(schema.projects).where(eq(schema.projects.id, req.params.id));
      return res.status(204).send();
    } catch (error) {
      console.error('Erro em DELETE /api/db/projects/:id:', error);
      return res.status(500).json({ error: 'Erro ao excluir projeto.', details: error.message });
    }
  });

  app.post('/api/db/projects/sync-version', auth, requireDb, async (req, res) => {
    try {
      const version = req.body;
      const result = await db.transaction(async (tx) => {
        await tx.update(schema.projectVersions).set({
          name: version.name,
          date: version.date,
          defaultTax: version.defaultTax,
          defaultMargin: version.defaultMargin,
          propostaData: version.propostaData
        }).where(eq(schema.projectVersions.id, version.id));

        const keptGroupIds = version.groups.filter(g => g.id).map(g => g.id);

        for (const group of version.groups) {
          await tx.insert(schema.costGroups).values({
            id: group.id,
            versionId: version.id,
            name: group.name,
            margin: group.margin,
            isActive: group.isActive
          }).onConflictDoUpdate({
            target: schema.costGroups.id,
            set: { name: group.name, margin: group.margin, isActive: group.isActive }
          });

          if (group.items?.length) {
            await upsertCostItemsBatch(tx, schema, eq, and, notInArray, group, group.items);
          } else {
            await tx.delete(schema.costItems).where(eq(schema.costItems.groupId, group.id));
          }
        }

        if (keptGroupIds.length > 0) {
          await tx.delete(schema.costGroups)
            .where(and(
              eq(schema.costGroups.versionId, version.id),
              notInArray(schema.costGroups.id, keptGroupIds)
            ));
        } else {
          await tx.delete(schema.costGroups).where(eq(schema.costGroups.versionId, version.id));
        }

        const dbVersion = await tx.query.projectVersions.findFirst({
          where: eq(schema.projectVersions.id, version.id),
          columns: { projectId: true }
        });

        if (!dbVersion) return null;

        const updatedProject = await tx.query.projects.findFirst({
          where: eq(schema.projects.id, dbVersion.projectId),
          with: {
            client: true,
            versions: { with: { groups: { with: { items: true } } } }
          }
        });

        return mapProjectToClientShape(updatedProject);
      });

      return res.json(result);
    } catch (error) {
      console.error('Erro em POST sync-version:', error);
      return res.status(500).json({ error: 'Erro ao sincronizar versão.', details: error.message });
    }
  });

  // ── Project versions ─────────────────────────────────────────────────────────
  app.post('/api/db/project-versions', auth, requireDb, async (req, res) => {
    try {
      await db.insert(schema.projectVersions).values(req.body);
      return res.status(201).json({ success: true });
    } catch (error) {
      console.error('Erro em POST project-versions:', error);
      return res.status(500).json({ error: 'Erro ao criar versão.', details: error.message });
    }
  });

  app.delete('/api/db/project-versions/:id', auth, requireDb, async (req, res) => {
    try {
      await db.delete(schema.projectVersions).where(eq(schema.projectVersions.id, req.params.id));
      return res.status(204).send();
    } catch (error) {
      console.error('Erro em DELETE project-versions:', error);
      return res.status(500).json({ error: 'Erro ao excluir versão.', details: error.message });
    }
  });

  // ── Clients ──────────────────────────────────────────────────────────────────
  app.post('/api/db/clients', auth, requireDb, async (req, res) => {
    try {
      const client = req.body;
      await db.insert(schema.clients).values({
        id: client.id,
        name: client.name || client.nome,
        document: client.document || client.cnpj,
        address: client.address,
        industry: client.industry,
        employeeCount: client.employeeCount,
        contactName: client.contactName,
        contactRole: client.contactRole,
        leadSource: client.leadSource,
        contacts: client.contacts || [],
        decisores: client.decisores || []
      });
      return res.status(201).json({ success: true });
    } catch (error) {
      console.error('Erro em POST clients:', error);
      return res.status(500).json({ error: 'Erro ao criar cliente.', details: error.message });
    }
  });

  app.put('/api/db/clients/:id', auth, requireDb, async (req, res) => {
    try {
      const updates = pickDefinedFields(req.body, [
        'name',
        'document',
        'address',
        'industry',
        'employeeCount',
        'contactName',
        'contactRole',
        'leadSource',
        'contacts',
        'decisores',
      ]);
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Nenhum campo válido para atualizar.' });
      }
      updates.updatedAt = new Date();
      await db.update(schema.clients).set(updates).where(eq(schema.clients.id, req.params.id));
      return res.json({ success: true });
    } catch (error) {
      console.error('Erro em PUT clients:', error);
      return res.status(500).json({ error: 'Erro ao atualizar cliente.', details: error.message });
    }
  });

  app.delete('/api/db/clients/:id', auth, requireDb, async (req, res) => {
    try {
      await db.delete(schema.clients).where(eq(schema.clients.id, req.params.id));
      return res.status(204).send();
    } catch (error) {
      console.error('Erro em DELETE clients:', error);
      return res.status(500).json({ error: 'Erro ao excluir cliente.', details: error.message });
    }
  });

  // ── Professionals ────────────────────────────────────────────────────────────
  app.post('/api/db/professionals', auth, requireDb, async (req, res) => {
    try {
      await db.insert(schema.professionals).values(req.body);
      return res.status(201).json({ success: true });
    } catch (error) {
      console.error('Erro em POST professionals:', error);
      return res.status(500).json({ error: 'Erro ao criar profissional.', details: error.message });
    }
  });

  app.put('/api/db/professionals/:id', auth, requireDb, async (req, res) => {
    try {
      const updates = pickDefinedFields(req.body, ['name', 'role', 'pix', 'dailyRate']);
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Nenhum campo válido para atualizar.' });
      }
      await db.update(schema.professionals).set(updates).where(eq(schema.professionals.id, req.params.id));
      return res.json({ success: true });
    } catch (error) {
      console.error('Erro em PUT professionals:', error);
      return res.status(500).json({ error: 'Erro ao atualizar profissional.', details: error.message });
    }
  });

  app.delete('/api/db/professionals/:id', auth, requireDb, async (req, res) => {
    try {
      await db.delete(schema.professionals).where(eq(schema.professionals.id, req.params.id));
      return res.status(204).send();
    } catch (error) {
      console.error('Erro em DELETE professionals:', error);
      return res.status(500).json({ error: 'Erro ao excluir profissional.', details: error.message });
    }
  });

  // ── Equipments ───────────────────────────────────────────────────────────────
  app.post('/api/db/equipments', auth, requireDb, async (req, res) => {
    try {
      await db.insert(schema.equipments).values(req.body);
      return res.status(201).json({ success: true });
    } catch (error) {
      console.error('Erro em POST equipments:', error);
      return res.status(500).json({ error: 'Erro ao criar equipamento.', details: error.message });
    }
  });

  app.put('/api/db/equipments/:id', auth, requireDb, async (req, res) => {
    try {
      const updates = pickDefinedFields(req.body, ['name', 'category', 'rentalValue']);
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Nenhum campo válido para atualizar.' });
      }
      await db.update(schema.equipments).set(updates).where(eq(schema.equipments.id, req.params.id));
      return res.json({ success: true });
    } catch (error) {
      console.error('Erro em PUT equipments:', error);
      return res.status(500).json({ error: 'Erro ao atualizar equipamento.', details: error.message });
    }
  });

  app.delete('/api/db/equipments/:id', auth, requireDb, async (req, res) => {
    try {
      await db.delete(schema.equipments).where(eq(schema.equipments.id, req.params.id));
      return res.status(204).send();
    } catch (error) {
      console.error('Erro em DELETE equipments:', error);
      return res.status(500).json({ error: 'Erro ao excluir equipamento.', details: error.message });
    }
  });

  // ── Templates ────────────────────────────────────────────────────────────────
  app.post('/api/db/templates', auth, requireDb, async (req, res) => {
    try {
      await db.insert(schema.templates).values(req.body);
      return res.status(201).json({ success: true });
    } catch (error) {
      console.error('Erro em POST templates:', error);
      return res.status(500).json({ error: 'Erro ao criar template.', details: error.message });
    }
  });

  app.put('/api/db/templates/:id', auth, requireDb, async (req, res) => {
    try {
      const updates = pickDefinedFields(req.body, ['name', 'data']);
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Nenhum campo válido para atualizar.' });
      }
      await db.update(schema.templates).set(updates).where(eq(schema.templates.id, req.params.id));
      return res.json({ success: true });
    } catch (error) {
      console.error('Erro em PUT templates:', error);
      return res.status(500).json({ error: 'Erro ao atualizar template.', details: error.message });
    }
  });

  app.delete('/api/db/templates/:id', auth, requireDb, async (req, res) => {
    try {
      await db.delete(schema.templates).where(eq(schema.templates.id, req.params.id));
      return res.status(204).send();
    } catch (error) {
      console.error('Erro em DELETE templates:', error);
      return res.status(500).json({ error: 'Erro ao excluir template.', details: error.message });
    }
  });

  // ── Pipelines ──────────────────────────────────────────────────────────────────
  app.post('/api/db/pipelines', auth, requireDb, async (req, res) => {
    try {
      await db.insert(schema.pipelines).values(req.body);
      return res.status(201).json({ success: true });
    } catch (error) {
      console.error('Erro em POST pipelines:', error);
      return res.status(500).json({ error: 'Erro ao criar pipeline.', details: error.message });
    }
  });

  app.put('/api/db/pipelines/:id', auth, requireDb, async (req, res) => {
    try {
      const { name } = req.body;
      await db.update(schema.pipelines).set({ name, updatedAt: new Date() }).where(eq(schema.pipelines.id, req.params.id));
      return res.json({ success: true });
    } catch (error) {
      console.error('Erro em PUT pipelines:', error);
      return res.status(500).json({ error: 'Erro ao atualizar pipeline.', details: error.message });
    }
  });

  app.delete('/api/db/pipelines/:id', auth, requireDb, async (req, res) => {
    try {
      await db.delete(schema.pipelines).where(eq(schema.pipelines.id, req.params.id));
      return res.status(204).send();
    } catch (error) {
      console.error('Erro em DELETE pipelines:', error);
      return res.status(500).json({ error: 'Erro ao excluir pipeline.', details: error.message });
    }
  });

  // ── Stages ─────────────────────────────────────────────────────────────────────
  app.post('/api/db/stages', auth, requireDb, async (req, res) => {
    try {
      await db.insert(schema.stages).values(req.body);
      return res.status(201).json({ success: true });
    } catch (error) {
      console.error('Erro em POST stages:', error);
      return res.status(500).json({ error: 'Erro ao criar estágio.', details: error.message });
    }
  });

  app.put('/api/db/stages/:id', auth, requireDb, async (req, res) => {
    try {
      const { name } = req.body;
      await db.update(schema.stages).set({ name }).where(eq(schema.stages.id, req.params.id));
      return res.json({ success: true });
    } catch (error) {
      console.error('Erro em PUT stages:', error);
      return res.status(500).json({ error: 'Erro ao atualizar estágio.', details: error.message });
    }
  });

  app.delete('/api/db/stages/:id', auth, requireDb, async (req, res) => {
    try {
      await db.delete(schema.stages).where(eq(schema.stages.id, req.params.id));
      return res.status(204).send();
    } catch (error) {
      console.error('Erro em DELETE stages:', error);
      return res.status(500).json({ error: 'Erro ao excluir estágio.', details: error.message });
    }
  });

  // ── Deals ──────────────────────────────────────────────────────────────────────
  app.post('/api/db/deals', auth, requireDb, async (req, res) => {
    try {
      const deal = req.body;
      await db.insert(schema.deals).values({
        id: deal.id,
        clientId: deal.clientId,
        pipelineId: deal.pipelineId,
        stageId: deal.stageId,
        ...(deal.projectId ? { projectId: deal.projectId } : {}),
        title: deal.title,
        value: deal.value,
        status: deal.status,
        nextActionDate: deal.nextActionDate,
        lossReason: deal.lossReason ?? null,
        notes: deal.notes ?? null,
        linkedDecisores: deal.linkedDecisores ?? [],
      });
      return res.status(201).json({ success: true });
    } catch (error) {
      console.error('Erro em POST deals:', error);
      return res.status(500).json({ error: 'Erro ao criar deal.', details: error.message });
    }
  });

  app.put('/api/db/deals/:id/stage', auth, requireDb, async (req, res) => {
    try {
      const { stageId } = req.body;
      await db.update(schema.deals).set({ stageId, updatedAt: new Date() }).where(eq(schema.deals.id, req.params.id));
      return res.json({ success: true });
    } catch (error) {
      console.error('Erro em PUT deals stage:', error);
      return res.status(500).json({ error: 'Erro ao mover deal.', details: error.message });
    }
  });

  app.put('/api/db/deals/:id', auth, requireDb, async (req, res) => {
    try {
      const updates = req.body;
      const dbUpdates = { ...updates };
      if (updates.nextActionDate !== undefined) {
        dbUpdates.nextActionDate = updates.nextActionDate ? new Date(updates.nextActionDate) : null;
      }
      if (updates.projectId !== undefined) {
        dbUpdates.projectId = updates.projectId ? updates.projectId : null;
      }
      if ('lossReason' in updates) dbUpdates.lossReason = updates.lossReason ?? null;
      if ('notes' in updates) dbUpdates.notes = updates.notes ?? null;
      if ('linkedDecisores' in updates) dbUpdates.linkedDecisores = updates.linkedDecisores ?? [];
      dbUpdates.updatedAt = new Date();
      await db.update(schema.deals).set(dbUpdates).where(eq(schema.deals.id, req.params.id));
      return res.json({ success: true });
    } catch (error) {
      console.error('Erro em PUT deals:', error);
      return res.status(500).json({ error: 'Erro ao atualizar deal.', details: error.message });
    }
  });

  app.put('/api/db/deals/by-project/:projectId', auth, requireDb, async (req, res) => {
    try {
      const dbUpdates = { ...req.body, updatedAt: new Date() };
      await db.update(schema.deals).set(dbUpdates).where(eq(schema.deals.projectId, req.params.projectId));
      return res.json({ success: true });
    } catch (error) {
      console.error('Erro em PUT deals by-project:', error);
      return res.status(500).json({ error: 'Erro ao atualizar deal por projeto.', details: error.message });
    }
  });

  app.delete('/api/db/deals/:id', auth, requireDb, async (req, res) => {
    try {
      await db.delete(schema.deals).where(eq(schema.deals.id, req.params.id));
      return res.status(204).send();
    } catch (error) {
      console.error('Erro em DELETE deals:', error);
      return res.status(500).json({ error: 'Erro ao excluir deal.', details: error.message });
    }
  });
}

module.exports = { registerDbMutationRoutes };
