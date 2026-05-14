import { db } from '../db';
import * as schema from '../db/schema';
import { eq, inArray, notInArray, and, ne } from 'drizzle-orm';
import { Project, ProjectVersion, CostGroup, CostItem, Professional, Equipment, Client, Template } from '../types';

export const fetchAllData = async () => {
  const [clientsData, professionalsData, equipmentsData, templatesData, projectsData] = await Promise.all([
    db.query.clients.findMany(),
    db.query.professionals.findMany(),
    db.query.equipments.findMany(),
    db.query.templates.findMany(),
    db.query.projects.findMany({
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
    })
  ]);

  return {
    clients: clientsData,
    professionals: professionalsData.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        pix: p.pix || '',
        dailyRate: p.dailyRate
    })),
    equipments: equipmentsData,
    templates: templatesData,
    projects: projectsData.map(p => ({
        id: p.id,
        title: p.title,
        client: p.client?.nome || 'Cliente não encontrado',
        status: p.status as any,
        projectNumber: p.projectNumber,
        startDate: p.startDate ? p.startDate.toISOString().split('T')[0] : undefined,
        endDate: p.endDate ? p.endDate.toISOString().split('T')[0] : undefined,
        recordingDates: Array.isArray(p.recordingDates) ? p.recordingDates : (typeof p.recordingDates === 'string' ? JSON.parse(p.recordingDates) : []),
        createdAt: p.createdAt,
        versions: p.versions.map(v => ({
            id: v.id,
            name: v.name,
            date: v.date,
            defaultTax: v.defaultTax,
            defaultMargin: v.defaultMargin,
            groups: v.groups ? v.groups.map(g => ({
              id: g.id,
              name: g.name,
              margin: g.margin ?? undefined,
              isActive: g.isActive,
              items: g.items ? g.items.map(i => ({
                id: i.id,
                role: i.role ?? undefined,
                name: i.name,
                quantity: i.quantity,
                days: i.days,
                unitCost: i.unitCost,
                tax: i.tax ?? undefined,
                isInHouse: i.isInHouse,
                customMargin: i.customMargin ?? undefined,
                executedCost: i.executedCost ?? undefined,
                receiptLink: i.receiptLink ?? undefined,
                category: i.category ?? undefined
              })) : []
            })) : []
        }))
    }))
  };
};

export const loadVersionData = async (versionId: string) => {
  const groups = await db.query.costGroups.findMany({
    where: eq(schema.costGroups.versionId, versionId),
    with: {
      items: true
    }
  });

  return groups.map(g => ({
    id: g.id,
    name: g.name,
    margin: g.margin ?? undefined,
    isActive: g.isActive,
    items: g.items.map(i => ({
      id: i.id,
      role: i.role ?? undefined,
      name: i.name,
      quantity: i.quantity,
      days: i.days,
      unitCost: i.unitCost,
      tax: i.tax ?? undefined,
      isInHouse: i.isInHouse,
      customMargin: i.customMargin ?? undefined,
      executedCost: i.executedCost ?? undefined,
      receiptLink: i.receiptLink ?? undefined,
      category: i.category ?? undefined
    }))
  }));
};

export async function isProjectNumberTaken(projectNumber: number, excludeProjectId?: string): Promise<boolean> {
  const existing = await db.select()
    .from(schema.projects)
    .where(and(
      eq(schema.projects.projectNumber, projectNumber),
      excludeProjectId ? ne(schema.projects.id, excludeProjectId) : undefined
    ))
    .limit(1);
  return existing.length > 0;
}

export const createProject = async (projectData: any) => {
  return await db.transaction(async (tx) => {
    const [newProject] = await tx.insert(schema.projects).values({
      id: projectData.id,
      title: projectData.title,
      clientId: projectData.clientId,
      status: projectData.status,
      projectNumber: projectData.projectNumber || 0
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
};

export const updateProject = async (id: string, updates: any) => {
    return await db.transaction(async (tx) => {
        const safeUpdates = { ...updates };

        if ('recordingDates' in safeUpdates) {
          safeUpdates.recordingDates = Array.isArray(safeUpdates.recordingDates) 
            ? safeUpdates.recordingDates 
            : [];
        }

        const dbUpdates: any = {};
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

        // Upsert the entire tree if versions are provided
        if (safeUpdates.versions && Array.isArray(safeUpdates.versions)) {
            const keptVersionIds = safeUpdates.versions.filter((v: any) => v.id).map((v: any) => v.id);

            for (const version of safeUpdates.versions) {
                await tx.insert(schema.projectVersions).values({
                    id: version.id,
                    projectId: id,
                    name: version.name,
                    date: version.date,
                    defaultTax: version.defaultTax,
                    defaultMargin: version.defaultMargin
                }).onConflictDoUpdate({
                    target: schema.projectVersions.id,
                    set: {
                        name: version.name,
                        date: version.date,
                        defaultTax: version.defaultTax,
                        defaultMargin: version.defaultMargin
                    }
                });

                if (version.groups && Array.isArray(version.groups)) {
                    const keptGroupIds = version.groups.filter((g: any) => g.id).map((g: any) => g.id);

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
                            const keptItemIds = group.items.filter((i: any) => i.id).map((i: any) => i.id);

                            for (const item of group.items) {
                                await tx.insert(schema.costItems).values({
                                    id: item.id,
                                    groupId: group.id,
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
                                    category: item.category
                                }).onConflictDoUpdate({
                                    target: schema.costItems.id,
                                    set: {
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
                                        category: item.category
                                    }
                                });
                            }

                            // Limpeza com Mira a Laser para Items
                            if (keptItemIds.length > 0) {
                                await tx.delete(schema.costItems)
                                    .where(
                                        and(
                                            eq(schema.costItems.groupId, group.id),
                                            notInArray(schema.costItems.id, keptItemIds)
                                        )
                                    );
                            } else {
                                await tx.delete(schema.costItems)
                                    .where(eq(schema.costItems.groupId, group.id));
                            }
                        }
                    }

                    // Limpeza com Mira a Laser para Groups
                    if (keptGroupIds.length > 0) {
                        await tx.delete(schema.costGroups)
                            .where(
                                and(
                                    eq(schema.costGroups.versionId, version.id),
                                    notInArray(schema.costGroups.id, keptGroupIds)
                                )
                            );
                    } else {
                        await tx.delete(schema.costGroups)
                            .where(eq(schema.costGroups.versionId, version.id));
                    }
                }
            }

            // Limpeza com Mira a Laser para Versions
            if (keptVersionIds.length > 0) {
                await tx.delete(schema.projectVersions)
                    .where(
                        and(
                            eq(schema.projectVersions.projectId, id),
                            notInArray(schema.projectVersions.id, keptVersionIds)
                        )
                    );
            } else {
                await tx.delete(schema.projectVersions)
                    .where(eq(schema.projectVersions.projectId, id));
            }
        }

        const updatedProject = await tx.query.projects.findFirst({
            where: eq(schema.projects.id, id),
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

        if (!updatedProject) return null;

        return {
            id: updatedProject.id,
            title: updatedProject.title,
            client: updatedProject.client?.nome || 'Cliente não encontrado',
            status: updatedProject.status as any,
            projectNumber: updatedProject.projectNumber,
            startDate: updatedProject.startDate ? updatedProject.startDate.toISOString().split('T')[0] : undefined,
            endDate: updatedProject.endDate ? updatedProject.endDate.toISOString().split('T')[0] : undefined,
            recordingDates: Array.isArray(updatedProject.recordingDates) ? updatedProject.recordingDates : (typeof updatedProject.recordingDates === 'string' ? JSON.parse(updatedProject.recordingDates) : []),
            createdAt: updatedProject.createdAt,
            versions: updatedProject.versions.map(v => ({
                id: v.id,
                name: v.name,
                date: v.date,
                defaultTax: v.defaultTax,
                defaultMargin: v.defaultMargin,
                groups: v.groups ? v.groups.map(g => ({
                    id: g.id,
                    name: g.name,
                    margin: g.margin ?? undefined,
                    isActive: g.isActive,
                    items: g.items ? g.items.map(i => ({
                        id: i.id,
                        role: i.role ?? undefined,
                        name: i.name,
                        quantity: i.quantity,
                        days: i.days,
                        unitCost: i.unitCost,
                        tax: i.tax ?? undefined,
                        isInHouse: i.isInHouse,
                        customMargin: i.customMargin ?? undefined,
                        executedCost: i.executedCost ?? undefined,
                        receiptLink: i.receiptLink ?? undefined,
                        category: i.category ?? undefined
                    })) : []
                })) : []
            }))
        };
    });
};

export const deleteProject = async (id: string) => {
    await db.delete(schema.projects).where(eq(schema.projects.id, id));
};

export const syncVersionWithDb = async (version: ProjectVersion) => {
  return await db.transaction(async (tx) => {
    await tx.update(schema.projectVersions).set({
      name: version.name,
      date: version.date,
      defaultTax: version.defaultTax,
      defaultMargin: version.defaultMargin
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

      const keptItemIds = group.items.filter(i => i.id).map(i => i.id);

      for (const item of group.items) {
        await tx.insert(schema.costItems).values({
          id: item.id,
          groupId: group.id,
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
          category: item.category
        }).onConflictDoUpdate({
          target: schema.costItems.id,
          set: {
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
            category: item.category
          }
        });
      }

      // Limpeza com Mira a Laser para Items
      if (keptItemIds.length > 0) {
          await tx.delete(schema.costItems)
              .where(
                  and(
                      eq(schema.costItems.groupId, group.id),
                      notInArray(schema.costItems.id, keptItemIds)
                  )
              );
      } else {
          await tx.delete(schema.costItems)
              .where(eq(schema.costItems.groupId, group.id));
      }
    }

    // Limpeza com Mira a Laser para Groups
    if (keptGroupIds.length > 0) {
        await tx.delete(schema.costGroups)
            .where(
                and(
                    eq(schema.costGroups.versionId, version.id),
                    notInArray(schema.costGroups.id, keptGroupIds)
                )
            );
    } else {
        await tx.delete(schema.costGroups)
            .where(eq(schema.costGroups.versionId, version.id));
    }

    const updatedProject = await tx.query.projects.findFirst({
        where: eq(schema.projects.id, version.projectId),
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

    if (!updatedProject) return null;

    return {
        id: updatedProject.id,
        title: updatedProject.title,
        client: updatedProject.client?.nome || 'Cliente não encontrado',
        status: updatedProject.status as any,
        projectNumber: updatedProject.projectNumber,
        startDate: updatedProject.startDate ? updatedProject.startDate.toISOString().split('T')[0] : undefined,
        endDate: updatedProject.endDate ? updatedProject.endDate.toISOString().split('T')[0] : undefined,
        recordingDates: Array.isArray(updatedProject.recordingDates) ? updatedProject.recordingDates : (typeof updatedProject.recordingDates === 'string' ? JSON.parse(updatedProject.recordingDates) : []),
        createdAt: updatedProject.createdAt,
        versions: updatedProject.versions.map(v => ({
            id: v.id,
            name: v.name,
            date: v.date,
            defaultTax: v.defaultTax,
            defaultMargin: v.defaultMargin,
            groups: v.groups ? v.groups.map(g => ({
                id: g.id,
                name: g.name,
                margin: g.margin ?? undefined,
                isActive: g.isActive,
                items: g.items ? g.items.map(i => ({
                    id: i.id,
                    role: i.role ?? undefined,
                    name: i.name,
                    quantity: i.quantity,
                    days: i.days,
                    unitCost: i.unitCost,
                    tax: i.tax ?? undefined,
                    isInHouse: i.isInHouse,
                    customMargin: i.customMargin ?? undefined,
                    executedCost: i.executedCost ?? undefined,
                    receiptLink: i.receiptLink ?? undefined,
                    category: i.category ?? undefined
                })) : []
            })) : []
        }))
    };
  });
};

export const addProfessional = async (prof: any) => {
    await db.insert(schema.professionals).values(prof);
};

export const updateProfessional = async (id: string, updates: any) => {
    await db.update(schema.professionals).set(updates).where(eq(schema.professionals.id, id));
};

export const deleteProfessional = async (id: string) => {
    await db.delete(schema.professionals).where(eq(schema.professionals.id, id));
};

export const addEquipment = async (equip: any) => {
    await db.insert(schema.equipments).values(equip);
};

export const updateEquipment = async (id: string, updates: any) => {
    await db.update(schema.equipments).set(updates).where(eq(schema.equipments.id, id));
};

export const deleteEquipment = async (id: string) => {
    await db.delete(schema.equipments).where(eq(schema.equipments.id, id));
};

export const addClient = async (client: any) => {
    await db.insert(schema.clients).values({
        id: client.id,
        nome: client.nome,
        cnpj: client.cnpj
    });
};

export const deleteClient = async (id: string) => {
    await db.delete(schema.clients).where(eq(schema.clients.id, id));
};

export const addTemplate = async (template: any) => {
    await db.insert(schema.templates).values(template);
};

export const updateTemplate = async (id: string, updates: any) => {
    await db.update(schema.templates).set(updates).where(eq(schema.templates.id, id));
};

export const deleteTemplate = async (id: string) => {
    await db.delete(schema.templates).where(eq(schema.templates.id, id));
};

export const addProjectVersion = async (version: any) => {
    await db.insert(schema.projectVersions).values(version);
};

export const deleteProjectVersion = async (id: string) => {
    await db.delete(schema.projectVersions).where(eq(schema.projectVersions.id, id));
};
