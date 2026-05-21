function mapProjectToClientShape(updatedProject) {
  if (!updatedProject) return null;

  return {
    id: updatedProject.id,
    title: updatedProject.title,
    client: updatedProject.client?.name || 'Cliente não encontrado',
    status: updatedProject.status,
    projectNumber: updatedProject.projectNumber,
    startDate: updatedProject.startDate ? updatedProject.startDate.toISOString().split('T')[0] : undefined,
    endDate: updatedProject.endDate ? updatedProject.endDate.toISOString().split('T')[0] : undefined,
    recordingDates: Array.isArray(updatedProject.recordingDates)
      ? updatedProject.recordingDates
      : (typeof updatedProject.recordingDates === 'string' ? JSON.parse(updatedProject.recordingDates) : []),
    createdAt: updatedProject.createdAt,
    versions: updatedProject.versions.map(v => ({
      id: v.id,
      name: v.name,
      date: v.date,
      defaultTax: v.defaultTax,
      defaultMargin: v.defaultMargin,
      propostaData: typeof v.propostaData === 'string' ? JSON.parse(v.propostaData) : (v.propostaData ?? undefined),
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
}

module.exports = { mapProjectToClientShape };
