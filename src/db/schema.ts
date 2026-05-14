import { pgTable, text, timestamp, boolean, doublePrecision, jsonb, uuid, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  nome: text('name').notNull(),
  cnpj: text('cnpj'),
});

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  clientId: uuid('client_id').references(() => clients.id),
  status: text('status').notNull().default('Pendente'),
  projectNumber: integer('project_number').notNull().default(0),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  recordingDates: jsonb('recording_dates').$type<string[]>().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const projectVersions = pgTable('project_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  date: text('date').notNull(),
  defaultTax: doublePrecision('default_tax').notNull().default(0),
  defaultMargin: doublePrecision('default_margin').notNull().default(0),
});

export const costGroups = pgTable('cost_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  versionId: uuid('version_id').references(() => projectVersions.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  margin: doublePrecision('margin'),
  isActive: boolean('is_active').notNull().default(true),
});

export const costItems = pgTable('cost_items', {
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

export const professionals = pgTable('professionals', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  pix: text('pix'),
  dailyRate: doublePrecision('daily_rate').notNull().default(0),
});

export const equipments = pgTable('equipment', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  rentalValue: doublePrecision('rental_value').notNull().default(0),
});

export const templates = pgTable('templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  data: jsonb('data').notNull(),
});

// Relations
export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  versions: many(projectVersions),
}));

export const projectVersionsRelations = relations(projectVersions, ({ one, many }) => ({
  project: one(projects, { fields: [projectVersions.projectId], references: [projects.id] }),
  groups: many(costGroups),
}));

export const costGroupsRelations = relations(costGroups, ({ one, many }) => ({
  version: one(projectVersions, { fields: [costGroups.versionId], references: [projectVersions.id] }),
  items: many(costItems),
}));

export const costItemsRelations = relations(costItems, ({ one }) => ({
  group: one(costGroups, { fields: [costItems.groupId], references: [costGroups.id] }),
}));
