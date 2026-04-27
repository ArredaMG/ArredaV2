import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
  console.log('🌱 Iniciando criação de dados de teste no Supabase...');

  // 1. Clients
  const client1 = { id: uuidv4(), name: 'Nike Brasil', cnpj_cpf: '11.111.111/0001-11' };
  const client2 = { id: uuidv4(), name: 'Coca Cola', cnpj_cpf: '22.222.222/0001-22' };
  
  await supabase.from('clients').insert([client1, client2]);
  console.log('✅ Clientes criados');

  // 2. Professionals
  await supabase.from('professionals').insert([
    { id: uuidv4(), name: 'João Diretor', role: 'Diretor de Cena', pix: 'joao@pix.com', daily_rate: 1500 },
    { id: uuidv4(), name: 'Maria Câmera', role: 'Op. de Câmera', pix: '11999999999', daily_rate: 800 },
    { id: uuidv4(), name: 'Carlos Edição', role: 'Editor Sênior', pix: 'carlos@pix.com', daily_rate: 600 }
  ]);
  console.log('✅ Profissionais criados');

  // 3. Equipment
  await supabase.from('equipment').insert([
    { id: uuidv4(), name: 'Sony FX3 Full Kit', category: 'Câmera', rental_value: 450 },
    { id: uuidv4(), name: 'Lente G-Master 24-70mm', category: 'Lente', rental_value: 150 },
    { id: uuidv4(), name: 'Kit Iluminação Aputure', category: 'Luz', rental_value: 300 }
  ]);
  console.log('✅ Equipamentos criados');

  // 4. Templates
  const template1Id = uuidv4();
  const templateData = {
    defaultTax: 18,
    defaultMargin: 20,
    groups: [
      {
        id: uuidv4(),
        name: 'Equipe de Produção',
        margin: 20,
        items: [
          { id: uuidv4(), role: 'Diretor de Fotografia', name: '', unitCost: 1200, quantity: 1, days: 1, tax: 18, inHouse: false },
          { id: uuidv4(), role: 'Op. de Áudio', name: '', unitCost: 600, quantity: 1, days: 1, tax: 18, inHouse: false }
        ]
      },
      {
        id: uuidv4(),
        name: 'Pós-Produção',
        margin: 30,
        items: [
          { id: uuidv4(), role: 'Edição e Color', name: 'Arreda Interno', unitCost: 0, quantity: 1, days: 3, tax: 18, inHouse: true }
        ]
      }
    ]
  };

  await supabase.from('templates').insert([
    { id: template1Id, name: '📹 Vídeo Institucional Padrão', data: templateData }
  ]);
  console.log('✅ Templates criados');

  // 5. Projects
  const projectId = uuidv4();
  const versionId = uuidv4();

  await supabase.from('projects').insert({
    id: projectId,
    title: 'Campanha de Verão 2026',
    client_id: client1.id,
    status: 'Aprovado'
  });

  await supabase.from('project_versions').insert({
    id: versionId,
    project_id: projectId,
    name: 'V1',
    default_tax: templateData.defaultTax,
    default_margin: templateData.defaultMargin
  });

  for (const g of templateData.groups) {
    await supabase.from('cost_groups').insert({
        id: g.id,
        version_id: versionId,
        name: g.name,
        margin: g.margin
    });
    
    const itemsToInsert = g.items.map(i => ({
        id: i.id,
        group_id: g.id,
        role: i.role,
        name: i.name,
        quantity: i.quantity,
        days: i.days,
        unit_cost: i.unitCost,
        tax: i.tax,
        in_house: i.inHouse
    }));
    await supabase.from('cost_items').insert(itemsToInsert);
  }
  console.log('✅ Orçamento gerado a partir do template');

  console.log('🎉 Dados de teste criados com sucesso!');
}

seed().catch(console.error);
