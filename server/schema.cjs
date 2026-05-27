const { pgTable, text, timestamp, boolean, doublePrecision, jsonb, uuid, integer } = require('drizzle-orm/pg-core');
const { relations } = require('drizzle-orm');

const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  document: text('document'),
  address: text('address'),
  industry: text('industry'),
  employeeCount: integer('employee_count'),
  contactName: text('contact_name'),
  contactRole: text('contact_role'),
  leadSource: text('lead_source'),
  contacts: jsonb('contacts').default([]),
  decisores: jsonb('decisores').default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  clientId: uuid('client_id').references(() => clients.id),
  status: text('status').notNull().default('Pendente'),
  projectNumber: integer('project_number').notNull().default(0),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  recordingDates: jsonb('recording_dates').default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

const projectVersions = pgTable('project_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  date: text('date').notNull(),
  defaultTax: doublePrecision('default_tax').notNull().default(0),
  defaultMargin: doublePrecision('default_margin').notNull().default(0),
  propostaData: jsonb('proposta_data').default({}),
});

const costGroups = pgTable('cost_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  versionId: uuid('version_id').references(() => projectVersions.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  margin: doublePrecision('margin'),
  isActive: boolean('is_active').notNull().default(true),
});

const costItems = pgTable('cost_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  groupId: uuid('group_id').references(() => costGroups.id, { onDelete: 'cascade' }).notNull(),
  role: text('role'),
  name: text('name').notNull(),
  quantity: doublePrecision('quantity').notNull().default(1),
  days: doublePrecision('days').notNull().default(1),
  unitCost: doublePrecision('unit_cost').notNull().default(0),
  tax: doublePrecision('tax'),
  isInHouse: boolean('is_in_house').notNull().default(false),
  customMargin: doublePrecision('custom_margin'),
  executedCost: doublePrecision('executed_cost'),
  receiptLink: text('receipt_link'),
  category: text('category'),
});

const professionals = pgTable('professionals', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  pix: text('pix'),
  dailyRate: doublePrecision('daily_rate').notNull().default(0),
});

const equipments = pgTable('equipment', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  rentalValue: doublePrecision('rental_value').notNull().default(0),
});

const templates = pgTable('templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  data: jsonb('data').notNull(),
});

const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  versions: many(projectVersions),
}));

const projectVersionsRelations = relations(projectVersions, ({ one, many }) => ({
  project: one(projects, { fields: [projectVersions.projectId], references: [projects.id] }),
  groups: many(costGroups),
}));

const costGroupsRelations = relations(costGroups, ({ one, many }) => ({
  version: one(projectVersions, { fields: [costGroups.versionId], references: [projectVersions.id] }),
  items: many(costItems),
}));

const costItemsRelations = relations(costItems, ({ one }) => ({
  group: one(costGroups, { fields: [costItems.groupId], references: [costGroups.id] }),
}));

const pipelines = pgTable('pipelines', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

const stages = pgTable('stages', {
  id: uuid('id').defaultRandom().primaryKey(),
  pipelineId: uuid('pipeline_id').references(() => pipelines.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  order: integer('order').notNull(),
  color: text('color').notNull(),
});

const deals = pgTable('deals', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  pipelineId: uuid('pipeline_id').references(() => pipelines.id, { onDelete: 'cascade' }).notNull(),
  stageId: uuid('stage_id').references(() => stages.id, { onDelete: 'cascade' }).notNull(),
  projectId: uuid('project_id').references(() => projects.id),
  title: text('title').notNull(),
  value: doublePrecision('value').notNull().default(0),
  status: text('status').notNull().default('open'),
  lossReason: text('loss_reason'),
  notes: text('notes'),
  linkedDecisores: jsonb('linked_decisores').default([]),
  nextActionDate: timestamp('next_action_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

const pipelinesRelations = relations(pipelines, ({ many }) => ({
  stages: many(stages),
  deals: many(deals),
}));

const stagesRelations = relations(stages, ({ one, many }) => ({
  pipeline: one(pipelines, { fields: [stages.pipelineId], references: [pipelines.id] }),
  deals: many(deals),
}));

const dealsRelations = relations(deals, ({ one }) => ({
  client: one(clients, { fields: [deals.clientId], references: [clients.id] }),
  pipeline: one(pipelines, { fields: [deals.pipelineId], references: [pipelines.id] }),
  stage: one(stages, { fields: [deals.stageId], references: [stages.id] }),
}));

module.exports = {
  clients,
  projects,
  projectVersions,
  costGroups,
  costItems,
  professionals,
  equipments,
  templates,
  projectsRelations,
  projectVersionsRelations,
  costGroupsRelations,
  costItemsRelations,
  pipelines,
  stages,
  deals,
  pipelinesRelations,
  stagesRelations,
  dealsRelations,
};
